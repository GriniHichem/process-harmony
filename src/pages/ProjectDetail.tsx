import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useActeurs } from "@/hooks/useActeurs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Trash2, Calendar, Users, Network, FileText, Target, History, CalendarClock, Crown, Globe, Lock } from "lucide-react";
import { ProjectCollaborators } from "@/components/projects/ProjectCollaborators";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectActionsList } from "@/components/projects/ProjectActionsList";
import { ProjectGanttChart } from "@/components/projects/ProjectGanttChart";
import { format, parseISO, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";

interface Project {
  id: string;
  title: string;
  slogan: string | null;
  image_url: string | null;
  description: string | null;
  resources: string | null;
  statut: string;
  date_debut: string | null;
  date_fin: string | null;
  created_by: string | null;
  objectives: string[];
  resources_list: string[];
}

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  brouillon: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  en_cours: { label: "En cours", class: "bg-primary/15 text-primary" },
  termine: { label: "Terminé", class: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  archive: { label: "Archivé", class: "bg-secondary text-secondary-foreground" },
};

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { acteurs, getActeurLabel } = useActeurs();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [avancement, setAvancement] = useState(0);
  const [linkedProcesses, setLinkedProcesses] = useState<{ id: string; nom: string }[]>([]);
  const [linkedActors, setLinkedActors] = useState<{ id: string; fonction: string | null }[]>([]);
  const [ganttItems, setGanttItems] = useState<any[]>([]);
  const [logsOpen, setLogsOpen] = useState(false);
  const [deadlineLogs, setDeadlineLogs] = useState<any[]>([]);

  const canRead = hasPermission("actions", "can_read");
  const canReadDetail = hasPermission("actions", "can_read_detail");
  const canEdit = hasPermission("actions", "can_edit");
  const canDelete = hasPermission("actions", "can_delete");

  const fetchProject = async () => {
    if (!projectId) return;
    const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single();
    if (error || !data) { toast.error("Projet introuvable"); navigate("/actions"); return; }
    setProject({
      ...data,
      objectives: Array.isArray(data.objectives) ? data.objectives : [],
      resources_list: Array.isArray(data.resources_list) ? data.resources_list : [],
    } as Project);
    setLoading(false);

    const { data: pp } = await supabase.from("project_processes").select("process_id").eq("project_id", projectId);
    if (pp && pp.length > 0) {
      const { data: procs } = await supabase.from("processes").select("id, nom").in("id", pp.map(p => p.process_id));
      setLinkedProcesses(procs ?? []);
    }

    const { data: pa } = await supabase.from("project_actors").select("acteur_id").eq("project_id", projectId);
    if (pa && pa.length > 0) {
      const { data: acts } = await supabase.from("acteurs").select("id, fonction").in("id", pa.map(a => a.acteur_id));
      setLinkedActors(acts ?? []);
    }
  };

  const fetchGanttData = async () => {
    if (!projectId || !project) return;
    const { data: actions } = await supabase.from("project_actions").select("*").eq("project_id", projectId).order("ordre");
    if (!actions) return;
    const actionIds = actions.map(a => a.id);
    let tasksMap: Record<string, any[]> = {};
    if (actionIds.length > 0) {
      const { data: tasks } = await supabase.from("project_tasks").select("*").in("action_id", actionIds).order("ordre");
      (tasks ?? []).forEach((t: any) => {
        if (!tasksMap[t.action_id]) tasksMap[t.action_id] = [];
        tasksMap[t.action_id].push(t);
      });
    }

    const gantt = [{
      id: project.id,
      title: project.title,
      date_debut: project.date_debut,
      echeance: project.date_fin,
      statut: project.statut,
      avancement,
      level: "project" as const,
      children: actions.map((a: any) => ({
        id: a.id,
        title: a.title,
        date_debut: a.date_debut,
        echeance: a.echeance,
        statut: a.statut,
        avancement: a.avancement,
        responsable: [getActeurLabel(a.responsable_id), getActeurLabel(a.responsable_id_2), getActeurLabel(a.responsable_id_3)].filter(Boolean).join(", "),
        level: "action" as const,
        children: a.multi_tasks ? (tasksMap[a.id] ?? []).map((t: any) => ({
          id: t.id,
          title: t.title,
          date_debut: t.date_debut,
          echeance: t.echeance,
          statut: t.statut,
          avancement: t.avancement,
          responsable: getActeurLabel(t.responsable_id),
          level: "task" as const,
        })) : [],
      })),
    }];
    setGanttItems(gantt);
  };

  useEffect(() => { fetchProject(); }, [projectId]);
  useEffect(() => { if (project) fetchGanttData(); }, [project, avancement]);

  const fetchDeadlineLogs = async () => {
    if (!projectId) return;
    const { data } = await supabase
      .from("project_deadline_logs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50);
    setDeadlineLogs(data ?? []);
    setLogsOpen(true);
  };

  const handleDelete = async () => {
    if (!projectId) return;
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) { toast.error(error.message); return; }
    toast.success("Projet supprimé");
    navigate("/actions");
  };

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }
  if (!project) return null;

  const st = STATUS_MAP[project.statut] ?? STATUS_MAP.en_cours;

  return (
    <div className="max-w-6xl mx-auto space-y-6 page-enter">
      <Button variant="ghost" size="sm" onClick={() => navigate("/actions")} className="text-muted-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> Retour aux projets
      </Button>

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-card" style={{ boxShadow: "var(--shadow-md)" }}>
        {project.image_url && (
          <div className="h-40 w-full overflow-hidden">
            <img src={project.image_url} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="p-6 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
              {project.slogan && <p className="text-muted-foreground italic mt-0.5">{project.slogan}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={`${st.class}`}>{st.label}</Badge>
              {canEdit && (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Modifier
                </Button>
              )}
              {canDelete && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive/30">
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer ce projet ?</AlertDialogTitle>
                      <AlertDialogDescription>Le projet et toutes ses actions et tâches seront supprimés définitivement.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {project.date_debut && <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {project.date_debut}</span>}
            {project.date_fin && (
              <span className="flex items-center gap-1">
                → {project.date_fin}
                {(() => {
                  const today = new Date(); today.setHours(0, 0, 0, 0);
                  const dl = parseISO(project.date_fin);
                  const daysLeft = differenceInDays(dl, today);
                  if (daysLeft < 0) return <Badge className="bg-destructive/15 text-destructive text-[10px] ml-1">En retard de {Math.abs(daysLeft)}j</Badge>;
                  if (daysLeft <= 7) return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] ml-1">{daysLeft}j restants</Badge>;
                  return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] ml-1">{daysLeft}j restants</Badge>;
                })()}
              </span>
            )}
            <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 text-muted-foreground ml-auto" onClick={fetchDeadlineLogs}>
              <History className="h-3.5 w-3.5" />
              Historique échéances
            </Button>
          </div>

          <div className="flex items-center gap-3 max-w-md">
            <Progress value={avancement} className="h-2.5 flex-1" />
            <span className="text-sm font-semibold text-foreground">{avancement}%</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="actions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          {canReadDetail && <TabsTrigger value="actions">Actions & Tâches</TabsTrigger>}
          {canReadDetail && <TabsTrigger value="planning">Planning</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <Card>
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Description</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{project.description || "Aucune description"}</p>
                </CardContent>
              </Card>

              {/* Objectifs */}
              {project.objectives.length > 0 && (
                <Card>
                  <CardContent className="p-5 space-y-2">
                    <h3 className="font-semibold flex items-center gap-2"><Target className="h-4 w-4" /> Objectifs</h3>
                    <ul className="space-y-1">
                      {project.objectives.map((obj, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-1">•</span>
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              {/* Ressources */}
              {project.resources_list.length > 0 && (
                <Card>
                  <CardContent className="p-5 space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">📦 Ressources</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {project.resources_list.map((r, i) => <Badge key={i} variant="outline">{r}</Badge>)}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent className="p-5 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2"><Network className="h-4 w-4" /> Processus liés</h3>
                  {linkedProcesses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun processus lié</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {linkedProcesses.map((p) => <Badge key={p.id} variant="outline">{p.nom}</Badge>)}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5 space-y-2">
                  <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Acteurs impliqués</h3>
                  {linkedActors.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun acteur lié</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {linkedActors.map((a) => <Badge key={a.id} variant="outline">{a.fonction || "Acteur"}</Badge>)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {canReadDetail && (
          <TabsContent value="actions">
            <ProjectActionsList
              projectId={projectId!}
              projectDeadline={project.date_fin}
              canEdit={canEdit}
              canDelete={canDelete}
              canReadDetail={canReadDetail}
              onProgressChange={setAvancement}
            />
          </TabsContent>
        )}

        {canReadDetail && (
          <TabsContent value="planning">
            <ProjectGanttChart items={ganttItems} />
          </TabsContent>
        )}
      </Tabs>

      <ProjectForm
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={fetchProject}
        editProject={project}
      />

      {/* Deadline logs history dialog */}
      <Dialog open={logsOpen} onOpenChange={setLogsOpen}>
        <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Historique des modifications d'échéances
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {deadlineLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune modification d'échéance enregistrée</p>
            ) : (
              deadlineLogs.map((log: any) => (
                <div key={log.id} className="rounded-lg border border-border/30 p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{log.entity_title}</span>
                    <Badge variant="outline" className="text-[10px]">{log.entity_type === "action" ? "Action" : "Tâche"}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-destructive/80 border-destructive/20">{log.old_echeance ?? "—"}</Badge>
                    <span className="text-muted-foreground">→</span>
                    <Badge className="bg-primary/15 text-primary">{log.new_echeance ?? "—"}</Badge>
                  </div>
                  {log.reason && (
                    <p className="text-xs text-muted-foreground italic">💬 {log.reason}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {format(parseISO(log.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
