import { useEffect, useState, useCallback, useMemo, Fragment } from "react";
import { HelpTooltip } from "@/components/HelpTooltip";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import {
  ScrollText, Search, Plus, Pencil, Trash2, CalendarIcon, X,
  ChevronLeft, ChevronRight, Download, RotateCcw, ChevronDown, ChevronUp,
  Activity, FileText, AlertTriangle, TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

type LogEntry = {
  id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  action: string;
  old_value: any;
  new_value: any;
  created_at: string;
};

type Profile = { id: string; nom: string; prenom: string; email: string };

type Filters = {
  search: string;
  entityType: string;
  action: string;
  userId: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
};

const PAGE_SIZE = 50;

const entityLabels: Record<string, string> = {
  processes: "Processus",
  process_elements: "Élément de processus",
  process_tasks: "Activité",
  audits: "Audit",
  audit_findings: "Constat d'audit",
  nonconformities: "Non-conformité",
  actions: "Action",
  indicators: "Indicateur",
  indicator_values: "Valeur indicateur",
  risks_opportunities: "Risque/Opportunité",
  documents: "Document",
  acteurs: "Acteur",
  context_issues: "Enjeu contexte",
  formations: "Formation",
  competences: "Compétence",
  client_surveys: "Sondage client",
  management_reviews: "Revue de direction",
  profiles: "Profil utilisateur",
  user_roles: "Rôle utilisateur",
  process_evaluations: "Évaluation processus",
  bpmn_diagrams: "Diagramme BPMN",
};

const actionConfig: Record<string, { label: string; icon: typeof Plus; color: string; rowClass: string }> = {
  create: { label: "Création", icon: Plus, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", rowClass: "border-l-2 border-l-emerald-500" },
  update: { label: "Modification", icon: Pencil, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", rowClass: "border-l-2 border-l-blue-500" },
  delete: { label: "Suppression", icon: Trash2, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", rowClass: "border-l-2 border-l-red-500" },
};

const defaultFilters: Filters = { search: "", entityType: "all", action: "all", userId: "all", dateFrom: undefined, dateTo: undefined };

function getEntityName(log: LogEntry): string {
  const data = log.new_value || log.old_value;
  if (!data) return "";
  return data.nom || data.description || data.titre || data.reference || data.code || data.name || data.title || data.competence || data.intitule || "";
}

function getChangedFields(log: LogEntry): string[] {
  if (log.action !== "update" || !log.old_value || !log.new_value) return [];
  const ignore = ["updated_at", "created_at"];
  const changes: string[] = [];
  for (const key of Object.keys(log.new_value)) {
    if (ignore.includes(key)) continue;
    if (JSON.stringify(log.old_value[key]) !== JSON.stringify(log.new_value[key])) {
      changes.push(key);
    }
  }
  return changes;
}

function formatFieldValue(val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Oui" : "Non";
  if (typeof val === "object") return JSON.stringify(val).slice(0, 120);
  return String(val).slice(0, 120);
}

export default function Journal() {
  const { hasPermission } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, Profile>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({ total: 0, creates: 0, updates: 0, deletes: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const canView = hasPermission("journal", "can_read");

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(t);
  }, [filters.search]);

  // Load profiles once
  useEffect(() => {
    if (!canView) return;
    supabase.from("profiles").select("id, nom, prenom, email").then(({ data }) => {
      const list = (data ?? []) as Profile[];
      setProfiles(list);
      const map: Record<string, Profile> = {};
      list.forEach(p => { map[p.id] = p; });
      setProfileMap(map);
    });
  }, [canView]);

  // Build query with filters
  const buildQuery = useCallback((countOnly = false) => {
    let q = supabase.from("audit_logs").select("*", countOnly ? { count: "exact", head: true } : { count: "exact" });
    q = q.order("created_at", { ascending: false });

    if (filters.entityType !== "all") q = q.eq("entity_type", filters.entityType);
    if (filters.action !== "all") q = q.eq("action", filters.action);
    if (filters.userId !== "all") q = q.eq("user_id", filters.userId);
    if (filters.dateFrom) q = q.gte("created_at", filters.dateFrom.toISOString());
    if (filters.dateTo) {
      const end = new Date(filters.dateTo);
      end.setHours(23, 59, 59, 999);
      q = q.lte("created_at", end.toISOString());
    }
    if (debouncedSearch) {
      q = q.or(`new_value->>nom.ilike.%${debouncedSearch}%,new_value->>description.ilike.%${debouncedSearch}%,new_value->>titre.ilike.%${debouncedSearch}%,new_value->>reference.ilike.%${debouncedSearch}%,old_value->>nom.ilike.%${debouncedSearch}%`);
    }
    return q;
  }, [filters.entityType, filters.action, filters.userId, filters.dateFrom, filters.dateTo, debouncedSearch]);

  // Fetch data
  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    setLoading(true);

    const fetchData = async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const dataQuery = buildQuery().range(from, to);
      const { data, count } = await dataQuery;

      setLogs((data ?? []) as LogEntry[]);
      setTotalCount(count ?? 0);

      // Stats for the current filter (without pagination)
      const statsBase = supabase.from("audit_logs").select("action");
      let sq = statsBase;
      if (filters.entityType !== "all") sq = sq.eq("entity_type", filters.entityType);
      if (filters.action !== "all") sq = sq.eq("action", filters.action);
      if (filters.userId !== "all") sq = sq.eq("user_id", filters.userId);
      if (filters.dateFrom) sq = sq.gte("created_at", filters.dateFrom.toISOString());
      if (filters.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        sq = sq.lte("created_at", end.toISOString());
      }
      const { data: statsData } = await sq;
      const s = { total: 0, creates: 0, updates: 0, deletes: 0 };
      (statsData ?? []).forEach((r: any) => {
        s.total++;
        if (r.action === "create") s.creates++;
        else if (r.action === "update") s.updates++;
        else if (r.action === "delete") s.deletes++;
      });
      setStats(s);

      setLoading(false);
    };
    fetchData();
  }, [canView, page, buildQuery, filters.entityType, filters.action, filters.userId, filters.dateFrom, filters.dateTo]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [filters.entityType, filters.action, filters.userId, filters.dateFrom, filters.dateTo, debouncedSearch]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setDebouncedSearch("");
  };

  const hasActiveFilters = filters.search || filters.entityType !== "all" || filters.action !== "all" || filters.userId !== "all" || filters.dateFrom || filters.dateTo;

  // Export CSV
  const exportCSV = useCallback(async () => {
    const q = buildQuery().limit(5000);
    const { data } = await q;
    if (!data || data.length === 0) return;

    const rows = (data as LogEntry[]).map(log => {
      const user = profileMap[log.user_id ?? ""];
      const userName = user ? `${user.prenom} ${user.nom}`.trim() || user.email : "Système";
      const changed = getChangedFields(log);
      return [
        new Date(log.created_at).toLocaleString("fr-FR"),
        userName,
        actionConfig[log.action]?.label ?? log.action,
        entityLabels[log.entity_type] ?? log.entity_type,
        getEntityName(log),
        changed.length > 0 ? changed.join(", ") : ""
      ];
    });

    const header = ["Date", "Utilisateur", "Action", "Entité", "Nom", "Champs modifiés"];
    const csv = "\uFEFF" + [header, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal_activite_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [buildQuery, profileMap]);

  // Entity types present in dropdown
  const entityTypes = useMemo(() => Object.keys(entityLabels).sort(), []);

  if (!canView) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Journal d'activité</h1>
        <Card><CardContent className="py-12 text-center text-muted-foreground">Accès non autorisé</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-primary" />
            Journal d'activité
            <HelpTooltip term="amelioration_continue" />
          </h1>
          <p className="text-sm text-muted-foreground">Traçabilité complète de toutes les opérations</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} disabled={totalCount === 0}>
          <Download className="h-4 w-4 mr-2" /> Exporter CSV
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <div className="rounded-full p-2 bg-primary/10"><Activity className="h-4 w-4 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <div className="rounded-full p-2 bg-emerald-100 dark:bg-emerald-900/30"><Plus className="h-4 w-4 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.creates}</p>
              <p className="text-xs text-muted-foreground">Créations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <div className="rounded-full p-2 bg-blue-100 dark:bg-blue-900/30"><Pencil className="h-4 w-4 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.updates}</p>
              <p className="text-xs text-muted-foreground">Modifications</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3 px-4">
            <div className="rounded-full p-2 bg-red-100 dark:bg-red-900/30"><Trash2 className="h-4 w-4 text-red-600" /></div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.deletes}</p>
              <p className="text-xs text-muted-foreground">Suppressions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 h-9" placeholder="Rechercher par nom, description, référence..." value={filters.search} onChange={e => updateFilter("search", e.target.value)} />
        </div>
        <Select value={filters.entityType} onValueChange={v => updateFilter("entityType", v)}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Entité" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les entités</SelectItem>
            {entityTypes.map(t => (
              <SelectItem key={t} value={t}>{entityLabels[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.action} onValueChange={v => updateFilter("action", v)}>
          <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="create">Création</SelectItem>
            <SelectItem value="update">Modification</SelectItem>
            <SelectItem value="delete">Suppression</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.userId} onValueChange={v => updateFilter("userId", v)}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Utilisateur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les utilisateurs</SelectItem>
            {profiles.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {`${p.prenom} ${p.nom}`.trim() || p.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-9 w-[140px] justify-start text-left font-normal", !filters.dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="mr-1 h-3.5 w-3.5" />
              {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yy") : "Début"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={filters.dateFrom} onSelect={d => updateFilter("dateFrom", d)} locale={fr} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn("h-9 w-[140px] justify-start text-left font-normal", !filters.dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-1 h-3.5 w-3.5" />
              {filters.dateTo ? format(filters.dateTo, "dd/MM/yy") : "Fin"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={filters.dateTo} onSelect={d => updateFilter("dateTo", d)} locale={fr} initialFocus className="p-3 pointer-events-auto" />
          </PopoverContent>
        </Popover>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" className="h-9" onClick={resetFilters}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Réinitialiser
          </Button>
        )}
      </div>

      {/* Result count + pagination info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{totalCount} entrée{totalCount !== 1 ? "s" : ""} {hasActiveFilters ? "(filtré)" : ""}</span>
        {totalPages > 1 && <span>Page {page + 1} / {totalPages}</span>}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : logs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune entrée dans le journal</CardContent></Card>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Date / Heure</TableHead>
              <TableHead className="w-[160px]">Utilisateur</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
              <TableHead className="w-[160px]">Entité</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead className="w-[200px]">Détails</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map(log => {
              const ac = actionConfig[log.action] ?? { label: log.action, icon: ScrollText, color: "bg-muted text-muted-foreground", rowClass: "" };
              const ActionIcon = ac.icon;
              const entityName = getEntityName(log);
              const user = profileMap[log.user_id ?? ""];
              const userLabel = user ? `${user.prenom} ${user.nom}`.trim() || user.email : "Système";
              const changedFields = getChangedFields(log);
              const isExpanded = expandedRow === log.id;

              return (
                <Fragment key={log.id}>
                  <TableRow
                    className={cn(ac.rowClass, "cursor-pointer hover:bg-muted/50")}
                    onClick={() => setExpandedRow(isExpanded ? null : log.id)}
                  >
                    <TableCell className="text-xs font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell className="text-sm">{userLabel}</TableCell>
                    <TableCell>
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", ac.color)}>
                        <ActionIcon className="h-3 w-3" />
                        {ac.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{entityLabels[log.entity_type] ?? log.entity_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[250px]">{entityName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {changedFields.length > 0
                        ? `${changedFields.slice(0, 3).map(f => f.replace(/_/g, " ")).join(", ")}${changedFields.length > 3 ? ` (+${changedFields.length - 3})` : ""}`
                        : log.action === "create" ? "Nouvel enregistrement" : log.action === "delete" ? "Supprimé" : ""}
                    </TableCell>
                    <TableCell>
                      {(log.action === "update" && changedFields.length > 0) && (
                        isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  </TableRow>
                  {isExpanded && log.action === "update" && changedFields.length > 0 && (
                    <TableRow className="bg-muted/20">
                      <TableCell colSpan={7} className="py-2 px-6">
                        <div className="text-xs space-y-1">
                          <p className="font-semibold text-muted-foreground mb-1">Détail des modifications :</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                            {changedFields.map(field => (
                              <div key={field} className="flex gap-2 items-start py-0.5">
                                <span className="font-medium min-w-[120px] text-foreground">{field.replace(/_/g, " ")} :</span>
                                <span className="text-red-500 line-through">{formatFieldValue(log.old_value?.[field])}</span>
                                <span className="text-muted-foreground">→</span>
                                <span className="text-emerald-600">{formatFieldValue(log.new_value?.[field])}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
          </Button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let p: number;
              if (totalPages <= 7) {
                p = i;
              } else if (page < 3) {
                p = i;
              } else if (page > totalPages - 4) {
                p = totalPages - 7 + i;
              } else {
                p = page - 3 + i;
              }
              return (
                <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="w-9 h-9 p-0" onClick={() => setPage(p)}>
                  {p + 1}
                </Button>
              );
            })}
          </div>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Suivant <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

