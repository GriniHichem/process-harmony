import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronRight, Trash2, CheckCircle2, Circle, Clock, MessageSquare } from "lucide-react";
import { useActeurs } from "@/hooks/useActeurs";
import { ElementNotes } from "@/components/ElementNotes";

interface ProjectAction {
  id: string;
  title: string;
  description: string | null;
  responsable_id: string | null;
  responsable_user_id: string | null;
  date_debut: string | null;
  echeance: string | null;
  statut: string;
  avancement: number;
  ordre: number;
}

interface ProjectTask {
  id: string;
  action_id: string;
  title: string;
  responsable_id: string | null;
  responsable_user_id: string | null;
  date_debut: string | null;
  echeance: string | null;
  statut: string;
  avancement: number;
  ordre: number;
}

const ACTION_STATUS: Record<string, { label: string; class: string }> = {
  planifiee: { label: "Planifiée", class: "bg-muted text-muted-foreground" },
  en_cours: { label: "En cours", class: "bg-primary/15 text-primary" },
  terminee: { label: "Terminée", class: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  en_retard: { label: "En retard", class: "bg-destructive/15 text-destructive" },
};

const TASK_STATUS: Record<string, { label: string; icon: any; class: string }> = {
  a_faire: { label: "À faire", icon: Circle, class: "text-muted-foreground" },
  en_cours: { label: "En cours", icon: Clock, class: "text-primary" },
  termine: { label: "Terminé", icon: CheckCircle2, class: "text-emerald-600" },
};

interface Props {
  projectId: string;
  canEdit: boolean;
  canDelete: boolean;
  canReadDetail?: boolean;
  onProgressChange: (avancement: number) => void;
}

export function ProjectActionsList({ projectId, canEdit, canDelete, canReadDetail = true, onProgressChange }: Props) {
  const [actions, setActions] = useState<ProjectAction[]>([]);
  const [tasksMap, setTasksMap] = useState<Record<string, ProjectTask[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState<string | null>(null);
  const [newActionTitle, setNewActionTitle] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState<Record<string, string>>({});
  const { acteurs, getActeurLabel } = useActeurs();

  const fetchActions = async () => {
    const { data, error } = await supabase
      .from("project_actions")
      .select("*")
      .eq("project_id", projectId)
      .order("ordre");
    if (error) { console.error("Fetch actions error:", error); toast.error("Erreur chargement actions: " + error.message); return; }
    const acts = (data ?? []) as ProjectAction[];
    setActions(acts);
    if (acts.length > 0) {
      const { data: tasks } = await supabase
        .from("project_tasks")
        .select("*")
        .in("action_id", acts.map((a) => a.id))
        .order("ordre");
      const map: Record<string, ProjectTask[]> = {};
      (tasks ?? []).forEach((t: any) => {
        if (!map[t.action_id]) map[t.action_id] = [];
        map[t.action_id].push(t as ProjectTask);
      });
      setTasksMap(map);
      const avg = Math.round(acts.reduce((s, a) => s + a.avancement, 0) / acts.length);
      onProgressChange(avg);
    } else {
      setTasksMap({});
      onProgressChange(0);
    }
  };

  useEffect(() => { fetchActions(); }, [projectId]);

  const addAction = async () => {
    if (!newActionTitle.trim()) return;
    const ordre = actions.length;
    const payload: any = {
      project_id: projectId,
      title: newActionTitle.trim(),
      ordre,
      statut: "planifiee",
      avancement: 0,
    };
    const { error } = await supabase.from("project_actions").insert(payload);
    if (error) {
      console.error("Insert action error:", error);
      toast.error("Erreur création action: " + error.message);
      return;
    }
    setNewActionTitle("");
    toast.success("Action ajoutée");
    fetchActions();
  };

  const addTask = async (actionId: string) => {
    const title = newTaskTitle[actionId]?.trim();
    if (!title) return;
    const existing = tasksMap[actionId] ?? [];
    const payload: any = {
      action_id: actionId,
      title,
      ordre: existing.length,
      statut: "a_faire",
      avancement: 0,
    };
    const { error } = await supabase.from("project_tasks").insert(payload);
    if (error) {
      console.error("Insert task error:", error);
      toast.error("Erreur création tâche: " + error.message);
      return;
    }
    setNewTaskTitle((p) => ({ ...p, [actionId]: "" }));
    toast.success("Tâche ajoutée");
    fetchActions();
  };

  const updateAction = async (id: string, updates: Partial<ProjectAction>) => {
    const { error } = await supabase.from("project_actions").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    fetchActions();
  };

  const deleteAction = async (id: string) => {
    const { error } = await supabase.from("project_actions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Action supprimée");
    fetchActions();
  };

  const updateTask = async (id: string, updates: Partial<ProjectTask>) => {
    const { error } = await supabase.from("project_tasks").update(updates).eq("id", id);
    if (error) { toast.error(error.message); return; }
    fetchActions();
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from("project_tasks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tâche supprimée");
    fetchActions();
  };

  if (!canReadDetail) {
    return <p className="text-sm text-muted-foreground py-4">Vous n'avez pas la permission de consulter les actions.</p>;
  }

  return (
    <div className="space-y-4">
      {actions.map((action) => {
        const tasks = tasksMap[action.id] ?? [];
        const isOpen = expanded === action.id;
        const st = ACTION_STATUS[action.statut] ?? ACTION_STATUS.planifiee;

        return (
          <Collapsible key={action.id} open={isOpen} onOpenChange={() => setExpanded(isOpen ? null : action.id)}>
            <div className="border border-border/40 rounded-xl overflow-hidden bg-card" style={{ boxShadow: "var(--shadow-sm)" }}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-medium text-sm line-clamp-1">{action.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{tasks.length} tâche{tasks.length !== 1 ? "s" : ""}</span>
                      {action.echeance && <span>• Échéance: {action.echeance}</span>}
                      {action.responsable_id && <span>• {getActeurLabel(action.responsable_id)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 w-24">
                      <Progress value={action.avancement} className="h-1.5" />
                      <span className="text-[10px] font-medium text-muted-foreground">{action.avancement}%</span>
                    </div>
                    <Badge className={`${st.class} text-[10px]`}>{st.label}</Badge>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="border-t border-border/30 px-4 py-3 space-y-3 bg-muted/5">
                  {/* Action inline edit */}
                  {canEdit && (
                    <div className="flex flex-wrap gap-3 items-end">
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Statut</label>
                        <Select value={action.statut} onValueChange={(v) => updateAction(action.id, { statut: v })}>
                          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(ACTION_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Échéance</label>
                        <Input type="date" className="h-8 w-36 text-xs" value={action.echeance ?? ""} onChange={(e) => updateAction(action.id, { echeance: e.target.value || null })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-medium text-muted-foreground">Responsable</label>
                        <Select value={action.responsable_id ?? ""} onValueChange={(v) => updateAction(action.id, { responsable_id: v || null })}>
                          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Assigner" /></SelectTrigger>
                          <SelectContent>
                            {acteurs.map((a) => <SelectItem key={a.id} value={a.id}>{a.fonction || a.organisation || "Acteur"}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive ml-auto">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cette action ?</AlertDialogTitle>
                              <AlertDialogDescription>L'action et toutes ses tâches seront supprimées.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteAction(action.id)} className="bg-destructive text-destructive-foreground">Supprimer</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  )}

                  {/* Tasks */}
                  <div className="space-y-1.5">
                    {tasks.map((task) => {
                      const ts = TASK_STATUS[task.statut] ?? TASK_STATUS.a_faire;
                      const TaskIcon = ts.icon;
                      return (
                        <div key={task.id} className="flex items-center gap-2 rounded-lg border border-border/30 bg-background px-3 py-2 group">
                          {canEdit ? (
                            <button
                              className={`shrink-0 ${ts.class}`}
                              onClick={() => {
                                const next = task.statut === "a_faire" ? "en_cours" : task.statut === "en_cours" ? "termine" : "a_faire";
                                const av = next === "termine" ? 100 : next === "en_cours" ? 50 : 0;
                                updateTask(task.id, { statut: next, avancement: av });
                              }}
                            >
                              <TaskIcon className="h-4 w-4" />
                            </button>
                          ) : (
                            <TaskIcon className={`h-4 w-4 shrink-0 ${ts.class}`} />
                          )}
                          <span className={`text-sm flex-1 ${task.statut === "termine" ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </span>
                          {task.echeance && <span className="text-[10px] text-muted-foreground">{task.echeance}</span>}
                          <span className="text-[10px] text-muted-foreground w-8 text-right">{task.avancement}%</span>
                          {canDelete && (
                            <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add task */}
                  {canEdit && (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nouvelle tâche..."
                        value={newTaskTitle[action.id] ?? ""}
                        onChange={(e) => setNewTaskTitle((p) => ({ ...p, [action.id]: e.target.value }))}
                        className="h-8 text-xs"
                        onKeyDown={(e) => e.key === "Enter" && addTask(action.id)}
                      />
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => addTask(action.id)}>
                        <Plus className="h-3 w-3 mr-1" />Tâche
                      </Button>
                    </div>
                  )}

                  {/* Comments / Notes */}
                  <div className="pt-2 border-t border-border/20">
                    <button
                      onClick={() => setNotesOpen(notesOpen === action.id ? null : action.id)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Commentaires
                    </button>
                    {notesOpen === action.id && (
                      <div className="mt-2">
                        <ElementNotes
                          elementType="project_action"
                          elementId={action.id}
                          canEdit={canEdit}
                          canDelete={canDelete}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}

      {/* Add action */}
      {canEdit && (
        <div className="flex gap-2">
          <Input
            placeholder="Nouvelle action..."
            value={newActionTitle}
            onChange={(e) => setNewActionTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addAction()}
          />
          <Button onClick={addAction}>
            <Plus className="h-4 w-4 mr-1" />Action
          </Button>
        </div>
      )}
    </div>
  );
}
