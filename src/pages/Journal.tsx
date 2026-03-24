import { useEffect, useState } from "react";
import { HelpTooltip } from "@/components/HelpTooltip";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollText, Search, Plus, Pencil, Trash2, Filter, CalendarIcon, X } from "lucide-react";
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

const entityLabels: Record<string, string> = {
  processes: "Processus",
  process_elements: "Élément de processus",
  process_tasks: "Activité",
  audits: "Audit",
  audit_findings: "Constat d'audit",
  nonconformities: "Non-conformité",
  actions: "Action",
  indicators: "Indicateur",
  risks_opportunities: "Risque/Opportunité",
  documents: "Document",
  acteurs: "Acteur",
};

const actionLabels: Record<string, { label: string; icon: typeof Plus; color: string }> = {
  create: { label: "Création", icon: Plus, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  update: { label: "Modification", icon: Pencil, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  delete: { label: "Suppression", icon: Trash2, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
};

function getEntityName(log: LogEntry): string {
  const data = log.new_value || log.old_value;
  if (!data) return "";
  return data.nom || data.description || data.titre || data.reference || data.code || data.name || "";
}

function getChangeSummary(log: LogEntry): string | null {
  if (log.action !== "update" || !log.old_value || !log.new_value) return null;
  const changes: string[] = [];
  const ignoreFields = ["updated_at", "created_at"];
  for (const key of Object.keys(log.new_value)) {
    if (ignoreFields.includes(key)) continue;
    if (JSON.stringify(log.old_value[key]) !== JSON.stringify(log.new_value[key])) {
      const fieldLabel = key.replace(/_/g, " ");
      changes.push(fieldLabel);
    }
  }
  if (changes.length === 0) return null;
  return `Champs modifiés : ${changes.slice(0, 4).join(", ")}${changes.length > 4 ? ` (+${changes.length - 4})` : ""}`;
}

export default function Journal() {
  const { hasRole, hasPermission } = useAuth();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { nom: string; prenom: string; email: string }>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const canView = hasPermission("journal", "can_read");

  useEffect(() => {
    if (!canView) { setLoading(false); return; }
    const fetchData = async () => {
      const [logsRes, profilesRes] = await Promise.all([
        supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("id, nom, prenom, email"),
      ]);
      setLogs((logsRes.data ?? []) as LogEntry[]);
      const pMap: Record<string, { nom: string; prenom: string; email: string }> = {};
      (profilesRes.data ?? []).forEach((p: any) => { pMap[p.id] = p; });
      setProfiles(pMap);
      setLoading(false);
    };
    fetchData();
  }, [canView]);

  if (!canView) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Journal d'activité</h1>
        <Card><CardContent className="py-12 text-center text-muted-foreground">Accès non autorisé</CardContent></Card>
      </div>
    );
  }

  const filtered = logs.filter((log) => {
    if (entityFilter !== "all" && log.entity_type !== entityFilter) return false;
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    if (dateFrom) {
      const logDate = new Date(log.created_at);
      if (logDate < dateFrom) return false;
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      const logDate = new Date(log.created_at);
      if (logDate > endOfDay) return false;
    }
    if (search) {
      const name = getEntityName(log).toLowerCase();
      const userName = profiles[log.user_id ?? ""]
        ? `${profiles[log.user_id!].prenom} ${profiles[log.user_id!].nom}`.toLowerCase()
        : "";
      if (!name.includes(search.toLowerCase()) && !userName.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  // Get unique entity types present in logs for the filter
  const presentEntityTypes = [...new Set(logs.map(l => l.entity_type))].sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">Journal d'activité <HelpTooltip term="amelioration_continue" /></h1>
        <p className="text-muted-foreground">Traçabilité de toutes les opérations</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher par nom ou utilisateur..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Type d'entité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les entités</SelectItem>
            {presentEntityTypes.map(t => (
              <SelectItem key={t} value={t}>{entityLabels[t] ?? t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les actions</SelectItem>
            <SelectItem value="create">Création</SelectItem>
            <SelectItem value="update">Modification</SelectItem>
            <SelectItem value="delete">Suppression</SelectItem>
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Date début"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={fr} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-[160px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateTo ? format(dateTo, "dd/MM/yyyy") : "Date fin"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={fr} initialFocus className={cn("p-3 pointer-events-auto")} />
          </PopoverContent>
        </Popover>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }} title="Effacer les dates">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} entrée{filtered.length !== 1 ? "s" : ""}</p>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune entrée dans le journal</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((log) => {
            const actionInfo = actionLabels[log.action] ?? { label: log.action, icon: ScrollText, color: "bg-muted text-muted-foreground" };
            const ActionIcon = actionInfo.icon;
            const entityName = getEntityName(log);
            const userName = profiles[log.user_id ?? ""];
            const userLabel = userName ? `${userName.prenom} ${userName.nom}`.trim() || userName.email : "Système";
            const changeSummary = getChangeSummary(log);

            return (
              <Card key={log.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="flex items-start gap-3 py-3">
                  <div className={`rounded-full p-1.5 mt-0.5 ${actionInfo.color}`}>
                    <ActionIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{entityLabels[log.entity_type] ?? log.entity_type}</Badge>
                      <span className="text-sm font-medium">{actionInfo.label}</span>
                      {entityName && <span className="text-sm text-foreground truncate max-w-[300px]">— {entityName}</span>}
                    </div>
                    {changeSummary && <p className="text-xs text-muted-foreground mt-0.5">{changeSummary}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{userLabel}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("fr-FR")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
