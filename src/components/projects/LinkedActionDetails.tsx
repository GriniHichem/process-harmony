import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FolderKanban, ChevronDown, ChevronRight, Calendar, User, ListTodo, CheckCircle2, Circle, Clock, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ActionDetail {
  id: string;
  title: string;
  description: string | null;
  statut: string;
  avancement: number;
  date_debut: string | null;
  echeance: string | null;
  multi_tasks: boolean;
  responsable_id: string | null;
  responsable_id_2: string | null;
  responsable_id_3: string | null;
  pinned: boolean;
  project_id: string;
  projectTitle: string;
}

interface TaskDetail {
  id: string;
  title: string;
  statut: string;
  avancement: number;
  echeance: string | null;
  responsable_id: string | null;
}

interface Props {
  entityType: "indicator" | "risk" | "context_issue" | "nonconformity";
  entityId: string;
}

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
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

export function LinkedActionDetails({ entityType, entityId }: Props) {
  const [actions, setActions] = useState<ActionDetail[]>([]);
  const [tasksByAction, setTasksByAction] = useState<Record<string, TaskDetail[]>>({});
  const [acteurNames, setActeurNames] = useState<Record<string, string>>({});
  const [openActions, setOpenActions] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      // Get links for this entity
      const { data: links } = await supabase
        .from("project_action_links")
        .select("action_id")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);
      if (!links || links.length === 0) return;

      const actionIds = links.map((l: any) => l.action_id);

      // Fetch actions
      const { data: actionsData } = await supabase
        .from("project_actions")
        .select("id, title, description, statut, avancement, date_debut, echeance, multi_tasks, responsable_id, responsable_id_2, responsable_id_3, pinned, project_id")
        .in("id", actionIds);
      if (!actionsData || actionsData.length === 0) return;

      // Fetch project titles
      const projectIds = [...new Set(actionsData.map((a: any) => a.project_id))];
      const { data: projects } = await supabase
        .from("projects")
        .select("id, title")
        .in("id", projectIds);
      const projectMap: Record<string, string> = {};
      (projects ?? []).forEach((p: any) => { projectMap[p.id] = p.title; });

      const enriched: ActionDetail[] = actionsData.map((a: any) => ({
        ...a,
        projectTitle: projectMap[a.project_id] ?? "Projet",
      }));
      setActions(enriched);

      // Fetch tasks for multi-task actions
      const multiTaskIds = actionsData.filter((a: any) => a.multi_tasks).map((a: any) => a.id);
      if (multiTaskIds.length > 0) {
        const { data: tasks } = await supabase
          .from("project_tasks")
          .select("id, title, statut, avancement, echeance, responsable_id, action_id")
          .in("action_id", multiTaskIds)
          .order("ordre");
        const grouped: Record<string, TaskDetail[]> = {};
        (tasks ?? []).forEach((t: any) => {
          if (!grouped[t.action_id]) grouped[t.action_id] = [];
          grouped[t.action_id].push(t);
        });
        setTasksByAction(grouped);
      }

      // Fetch acteur names for responsables
      const allResponsableIds = new Set<string>();
      actionsData.forEach((a: any) => {
        [a.responsable_id, a.responsable_id_2, a.responsable_id_3].forEach(id => {
          if (id) allResponsableIds.add(id);
        });
      });
      if (allResponsableIds.size > 0) {
        const { data: acteurs } = await supabase
          .from("acteurs")
          .select("id, fonction, organisation")
          .in("id", Array.from(allResponsableIds));
        const names: Record<string, string> = {};
        (acteurs ?? []).forEach((a: any) => {
          names[a.id] = [a.fonction, a.organisation].filter(Boolean).join(" — ") || "Acteur";
        });
        setActeurNames(names);
      }
    };
    fetchData();
  }, [entityType, entityId]);

  if (actions.length === 0) return null;

  const toggleAction = (id: string) => {
    setOpenActions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    try { return format(new Date(d), "dd MMM yyyy", { locale: fr }); }
    catch { return d; }
  };

  return (
    <div className="space-y-2 mt-3">
      <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
        <FolderKanban className="h-3.5 w-3.5" />
        Actions de projet liées ({actions.length})
      </h4>
      {actions.map(action => {
        const statusConf = STATUS_CONFIG[action.statut] ?? STATUS_CONFIG.planifiee;
        const isFrozen = action.statut === "terminee";
        const tasks = tasksByAction[action.id] ?? [];
        const isOpen = openActions[action.id] ?? false;

        return (
          <Card key={action.id} className={`border ${isFrozen ? "opacity-75" : ""}`}>
            <Collapsible open={isOpen} onOpenChange={() => toggleAction(action.id)}>
              <CollapsibleTrigger className="w-full">
                <CardContent className="p-3 flex items-center gap-3">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{action.title}</span>
                      <Badge className={`text-[10px] ${statusConf.class}`}>{statusConf.label}</Badge>
                      {isFrozen && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Projet : <span
                        className="text-primary cursor-pointer hover:underline"
                        onClick={(e) => { e.stopPropagation(); navigate(`/actions/${action.project_id}`); }}
                      >{action.projectTitle}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-medium text-muted-foreground">{action.avancement}%</span>
                    <Progress value={action.avancement} className="w-20 h-1.5" />
                  </div>
                </CardContent>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-4 pb-3 space-y-3 border-t pt-3">
                  {/* Description */}
                  {action.description && (
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  )}

                  {/* Dates & Responsables */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Début : {formatDate(action.date_debut)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>Échéance : {formatDate(action.echeance)}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {[action.responsable_id, action.responsable_id_2, action.responsable_id_3]
                        .filter(Boolean)
                        .map((rid, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="truncate">{acteurNames[rid!] ?? "..."}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Tasks if multi-task */}
                  {action.multi_tasks && tasks.length > 0 && (
                    <div className="space-y-1.5">
                      <h5 className="text-xs font-semibold flex items-center gap-1 text-muted-foreground">
                        <ListTodo className="h-3 w-3" /> Tâches ({tasks.length})
                      </h5>
                      <div className="space-y-1 pl-1">
                        {tasks.map(task => {
                          const tConf = TASK_STATUS[task.statut] ?? TASK_STATUS.a_faire;
                          const TIcon = tConf.icon;
                          return (
                            <div key={task.id} className="flex items-center gap-2 text-xs py-1 border-b border-border/50 last:border-0">
                              <TIcon className={`h-3.5 w-3.5 shrink-0 ${tConf.class}`} />
                              <span className="flex-1 truncate">{task.title}</span>
                              <span className="text-muted-foreground shrink-0">{task.avancement}%</span>
                              {task.echeance && (
                                <span className="text-muted-foreground shrink-0">{formatDate(task.echeance)}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}
