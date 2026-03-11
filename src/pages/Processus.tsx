import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Eye, UserCheck, Trash2, History } from "lucide-react";
import { AdminPasswordDialog } from "@/components/AdminPasswordDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

type Process = {
  id: string; code: string; nom: string;
  type_processus: "pilotage" | "realisation" | "support";
  finalite: string | null;
  statut: "brouillon" | "en_validation" | "valide" | "archive";
  responsable_id: string | null;
  version_courante: number;
  created_at: string;
};

const statusColors: Record<string, string> = {
  brouillon: "bg-muted text-muted-foreground",
  en_validation: "bg-warning/20 text-warning",
  valide: "bg-success/20 text-success",
  archive: "bg-destructive/10 text-destructive",
};

const typeLabels: Record<string, string> = {
  pilotage: "Management", realisation: "Réalisation", support: "Support",
};

export default function Processus() {
  const { hasRole, hasPermission, user } = useAuth();
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [users, setUsers] = useState<{ id: string; nom: string; prenom: string; email: string }[]>([]);
  const [newProcess, setNewProcess] = useState({ code: "", nom: "", type_processus: "realisation" as const, finalite: "", responsable_id: "" });
  const [archiveDialogCode, setArchiveDialogCode] = useState<string | null>(null);
  const [archivedVersions, setArchivedVersions] = useState<Process[]>([]);
  const [loadingArchives, setLoadingArchives] = useState(false);

  const isOnlyResponsable = hasRole("responsable_processus") && !hasRole("admin") && !hasRole("rmq");
  const isOnlyActeur = hasRole("acteur") && !hasRole("admin") && !hasRole("rmq") && !hasRole("responsable_processus") && !hasRole("consultant") && !hasRole("auditeur");

  const fetchProcesses = async () => {
    if (isOnlyActeur && user) {
      const { data: profileData } = await supabase.from("profiles").select("acteur_id").eq("id", user.id).single();
      const acteurId = profileData?.acteur_id;
      if (acteurId) {
        const { data: taskData } = await supabase.from("process_tasks").select("process_id").eq("responsable_id", acteurId);
        const processIds = [...new Set((taskData ?? []).map(t => t.process_id))];
        if (processIds.length > 0) {
          const { data } = await supabase.from("processes").select("*").in("id", processIds).neq("statut", "archive").order("code");
          setProcesses((data ?? []) as Process[]);
        } else {
          setProcesses([]);
        }
      } else {
        setProcesses([]);
      }
    } else {
      let query = supabase.from("processes").select("*").neq("statut", "archive").order("code");
      if (isOnlyResponsable && user) {
        query = query.eq("responsable_id", user.id);
      }
      const { data } = await query;
      setProcesses((data ?? []) as Process[]);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from("profiles").select("id, nom, prenom, email").eq("actif", true);
    if (data) setUsers(data);
  };

  const getUserLabel = (u: { nom: string; prenom: string; email: string }) => {
    const fullName = `${u.prenom} ${u.nom}`.trim();
    return fullName || u.email;
  };

  useEffect(() => { fetchProcesses(); fetchUsers(); }, []);

  const fetchArchivedVersions = async (code: string) => {
    setLoadingArchives(true);
    // Get all archived processes whose code starts with the base code
    const { data } = await supabase.from("processes").select("*").eq("statut", "archive").order("version_courante", { ascending: false });
    // Filter: match base code (e.g. PRO-002 matches PRO-002 and PRO-002-v2)
    const baseCode = code.replace(/-v\d+(\.\d+)?$/, "");
    const filtered = (data ?? []).filter((p: any) => {
      const pBase = p.code.replace(/-v\d+(\.\d+)?$/, "");
      return pBase === baseCode;
    });
    setArchivedVersions(filtered as Process[]);
    setLoadingArchives(false);
  };

  const handleShowArchives = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    setArchiveDialogCode(code);
    fetchArchivedVersions(code);
  };

  const filtered = processes.filter((p) => {
    if (typeFilter !== "all" && p.type_processus !== typeFilter) return false;
    if (statusFilter !== "all" && p.statut !== statusFilter) return false;
    if (search && !p.nom.toLowerCase().includes(search.toLowerCase()) && !p.code.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!newProcess.code || !newProcess.nom) { toast.error("Code et nom requis"); return; }
    const { error } = await supabase.from("processes").insert({
      code: newProcess.code, nom: newProcess.nom,
      type_processus: newProcess.type_processus,
      finalite: newProcess.finalite || null,
      responsable_id: newProcess.responsable_id || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Processus créé");
    setDialogOpen(false);
    setNewProcess({ code: "", nom: "", type_processus: "realisation", finalite: "", responsable_id: "" });
    fetchProcesses();
  };

  const canCreate = hasPermission("processus", "can_edit");
  const canDeleteProcess = (p: Process) => {
    if (!hasPermission("processus", "can_delete")) return false;
    if (hasRole("admin")) return true;
    if (hasRole("rmq") && p.statut !== "valide") return true;
    return false;
  };

  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => { setPendingDeleteId(id); setAdminDialogOpen(true); };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId) return;
    const { error } = await supabase.from("processes").delete().eq("id", pendingDeleteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Processus supprimé");
    setPendingDeleteId(null);
    fetchProcesses();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Processus</h1>
          <p className="text-muted-foreground">Gestion du référentiel des processus</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nouveau processus</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer un processus</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Code</Label><Input value={newProcess.code} onChange={(e) => setNewProcess({ ...newProcess, code: e.target.value })} placeholder="PRO-001" /></div>
                <div className="space-y-2"><Label>Intitulé</Label><Input value={newProcess.nom} onChange={(e) => setNewProcess({ ...newProcess, nom: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newProcess.type_processus} onValueChange={(v: any) => setNewProcess({ ...newProcess, type_processus: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pilotage">Management</SelectItem>
                      <SelectItem value="realisation">Réalisation</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Finalité</Label><Textarea value={newProcess.finalite} onChange={(e) => setNewProcess({ ...newProcess, finalite: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Responsable</Label>
                  <Select value={newProcess.responsable_id || "none"} onValueChange={(v) => setNewProcess({ ...newProcess, responsable_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non assigné</SelectItem>
                      {users.map((u) => <SelectItem key={u.id} value={u.id}>{getUserLabel(u)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} className="w-full">Créer</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="pilotage">Management</SelectItem>
            <SelectItem value="realisation">Réalisation</SelectItem>
            <SelectItem value="support">Support</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="en_validation">En validation</SelectItem>
            <SelectItem value="valide">Validé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun processus trouvé</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => {
            const responsable = users.find(u => u.id === p.responsable_id);
            return (
              <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/processus/${p.id}`)}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className="font-mono text-sm font-medium text-primary">{p.code}</div>
                    <div>
                      <p className="font-medium">{p.nom}</p>
                      <p className="text-xs text-muted-foreground">{typeLabels[p.type_processus]} • v{p.version_courante}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" title="Responsable">
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>{responsable ? getUserLabel(responsable) : "Non assigné"}</span>
                    </div>
                    <Badge className={statusColors[p.statut]}>{p.statut.replace("_", " ")}</Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Versions archivées" onClick={(e) => handleShowArchives(e, p.code)}>
                      <History className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    {canDeleteProcess(p) && (
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteClick(p.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Archived versions dialog */}
      <Dialog open={!!archiveDialogCode} onOpenChange={(open) => { if (!open) setArchiveDialogCode(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Versions archivées — {archiveDialogCode}
            </DialogTitle>
          </DialogHeader>
          {loadingArchives ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : archivedVersions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune version archivée</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {archivedVersions.map((av) => {
                const responsable = users.find(u => u.id === av.responsable_id);
                return (
                  <Card key={av.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => { setArchiveDialogCode(null); navigate(`/processus/${av.id}`); }}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-primary">{av.code}</span>
                        <span className="font-medium">{av.nom}</span>
                        <span className="text-xs text-muted-foreground">v{av.version_courante}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {responsable && <span className="text-xs text-muted-foreground">{getUserLabel(responsable)}</span>}
                        <Badge className={statusColors.archive}>Archivé</Badge>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AdminPasswordDialog
        open={adminDialogOpen}
        onOpenChange={setAdminDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Suppression de processus"
        description="Cette action supprimera le processus et tous ses objets associés. Veuillez entrer les identifiants administrateur pour confirmer."
      />
    </div>
  );
}