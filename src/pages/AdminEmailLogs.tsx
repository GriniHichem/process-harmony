import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Filter,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface EmailLog {
  id: string;
  recipient_email: string;
  email_type: string;
  subject: string | null;
  status: "sent" | "failed" | "skipped";
  error_message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  entity_url: string | null;
  user_id: string | null;
  notif_type: string | null;
  metadata: any;
  created_at: string;
}

const PAGE_SIZE = 25;

const EMAIL_TYPE_LABELS: Record<string, string> = {
  notification: "Notification",
  test: "Test",
  survey_copy: "Copie de sondage",
};

const STATUS_LABELS: Record<string, string> = {
  sent: "Envoyé",
  failed: "Échec",
  skipped: "Ignoré",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "sent")
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="h-3 w-3" /> Envoyé
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> Échec
      </Badge>
    );
  return (
    <Badge variant="warning" className="gap-1">
      <AlertCircle className="h-3 w-3" /> Ignoré
    </Badge>
  );
}

export default function AdminEmailLogs() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin") || roles.includes("super_admin");

  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchEmail, setSearchEmail] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Stats (computed across current filters, not paginated)
  const [stats, setStats] = useState({ total: 0, sent: 0, failed: 0, skipped: 0 });

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildQuery = () => {
    let q = supabase.from("email_send_log").select("*", { count: "exact" });
    if (statusFilter !== "all") q = q.eq("status", statusFilter);
    if (typeFilter !== "all") q = q.eq("email_type", typeFilter);
    if (searchEmail.trim()) q = q.ilike("recipient_email", `%${searchEmail.trim()}%`);
    if (dateFrom) q = q.gte("created_at", new Date(dateFrom).toISOString());
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      q = q.lte("created_at", end.toISOString());
    }
    return q;
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count, error } = await buildQuery()
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      setLogs((data as EmailLog[]) ?? []);
      setTotal(count ?? 0);
    } catch (err: any) {
      toast.error("Erreur de chargement : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get counts by status with current filters (excluding status filter)
      const { data, error } = await supabase
        .from("email_send_log")
        .select("status")
        .gte("created_at", dateFrom ? new Date(dateFrom).toISOString() : "1970-01-01");
      if (error) throw error;
      const all = (data ?? []) as { status: string }[];
      setStats({
        total: all.length,
        sent: all.filter((r) => r.status === "sent").length,
        failed: all.filter((r) => r.status === "failed").length,
        skipped: all.filter((r) => r.status === "skipped").length,
      });
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, typeFilter, dateFrom, dateTo, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFrom, isAdmin]);

  const handleApplySearch = () => {
    setPage(0);
    fetchLogs();
  };

  const handleReset = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setSearchEmail("");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  };

  const handleClearOld = async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const { error } = await supabase
      .from("email_send_log")
      .delete()
      .lt("created_at", cutoff.toISOString());
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Logs de plus de 90 jours supprimés");
      fetchLogs();
      fetchStats();
    }
  };

  const pageNumbers = useMemo(() => {
    const arr: number[] = [];
    const start = Math.max(0, page - 2);
    const end = Math.min(totalPages - 1, page + 2);
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [page, totalPages]);

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Accès réservé aux administrateurs.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Journal des emails</h1>
            <p className="text-sm text-muted-foreground">
              Historique des emails envoyés par l'application
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { fetchLogs(); fetchStats(); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" /> Purger &gt; 90 jours
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Purger les anciens logs ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action supprime définitivement tous les logs de plus de 90 jours.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearOld}>Confirmer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total (période)</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Envoyés</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Échecs</p>
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Ignorés</p>
            <p className="text-2xl font-bold text-amber-600">{stats.skipped}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" /> Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Statut</Label>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="sent">Envoyé</SelectItem>
                  <SelectItem value="failed">Échec</SelectItem>
                  <SelectItem value="skipped">Ignoré</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="notification">Notification</SelectItem>
                  <SelectItem value="test">Test</SelectItem>
                  <SelectItem value="survey_copy">Copie de sondage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Du</Label>
              <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0); }} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Au</Label>
              <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0); }} />
            </div>
            <div className="space-y-1 lg:col-span-1">
              <Label className="text-xs">Destinataire</Label>
              <Input
                placeholder="email@..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleApplySearch()}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApplySearch} className="flex-1">Filtrer</Button>
              <Button variant="outline" onClick={handleReset}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Destinataire</TableHead>
                <TableHead>Sujet</TableHead>
                <TableHead>Entité</TableHead>
                <TableHead>Erreur</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Chargement...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucun email trouvé
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell><StatusBadge status={log.status} /></TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {EMAIL_TYPE_LABELS[log.email_type] || log.email_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{log.recipient_email}</TableCell>
                    <TableCell className="text-sm max-w-[280px] truncate" title={log.subject || ""}>
                      {log.subject || "—"}
                    </TableCell>
                    <TableCell>
                      {log.entity_url ? (
                        <Link
                          to={log.entity_url}
                          className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                        >
                          {log.entity_type || "Voir"} <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : log.entity_type ? (
                        <span className="text-xs text-muted-foreground">{log.entity_type}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-destructive max-w-[280px] truncate" title={log.error_message || ""}>
                      {log.error_message || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-xs text-muted-foreground">
          {total === 0
            ? "Aucun résultat"
            : `${page * PAGE_SIZE + 1} - ${Math.min((page + 1) * PAGE_SIZE, total)} sur ${total}`}
        </p>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={(e) => { e.preventDefault(); if (page > 0) setPage(page - 1); }}
                className={page === 0 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            {pageNumbers.map((n) => (
              <PaginationItem key={n}>
                <PaginationLink
                  isActive={n === page}
                  onClick={(e) => { e.preventDefault(); setPage(n); }}
                  className="cursor-pointer"
                >
                  {n + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                onClick={(e) => { e.preventDefault(); if (page < totalPages - 1) setPage(page + 1); }}
                className={page >= totalPages - 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
