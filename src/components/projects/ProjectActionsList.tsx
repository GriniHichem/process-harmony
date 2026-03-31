import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronRight, Trash2, CheckCircle2, Circle, Clock, MessageSquare, AlertTriangle, ShieldAlert, CalendarClock, History, UserPlus, X, ListTodo, Lock, RotateCcw, Pin, PinOff, EyeOff, Eye, Filter, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { useActeurs } from "@/hooks/useActeurs";
import { ElementNotes } from "@/components/ElementNotes";
import { format, differenceInDays, parseISO, isAfter, isBefore, addDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface ProjectAction {
  id: string;
  title: string;
  description: string | null;
  responsable_id: string | null;
  responsable_id_2: string | null;
  responsable_id_3: string | null;
  responsable_user_id: string | null;
  date_debut: string | null;
  echeance: string | null;
  statut: string;
  avancement: number;
  ordre: number;
  multi_tasks: boolean;
  pinned: boolean;
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

interface DeadlineLog {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_title: string;
  old_echeance: string | null;
  new_echeance: string | null;
  changed_by: string | null;
  reason: string | null;
  created_at: string;
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

function getDateStatus(echeance: string | null, projectDeadline: string | null, statut: string) {
  if (!echeance || statut === "terminee" || statut === "termine") return { status: "ok" as const, label: "", color: "" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = parseISO(echeance);
  const daysLeft = differenceInDays(deadline, today);
  if (projectDeadline && isAfter(deadline, parseISO(projectDeadline))) {
    return { status: "exceeds" as const, label: "Dépasse la deadline du projet", color: "text-orange-600 dark:text-orange-400" };
  }
  if (daysLeft < 0) {
    return { status: "overdue" as const, label: `En retard de ${Math.abs(daysLeft)} jour${Math.abs(daysLeft) > 1 ? "s" : ""}`, color: "text-destructive" };
  }
  if (daysLeft <= 3) {
    return { status: "urgent" as const, label: `${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}`, color: "text-orange-600 dark:text-orange-400" };
  }
  if (daysLeft <= 7) {
    return { status: "warning" as const, label: `${daysLeft} jours restants`, color: "text-amber-600 dark:text-amber-400" };
  }
  return { status: "ok" as const, label: "", color: "" };
}

interface Props {
  projectId: string;
  projectDeadline: string | null;
  canEdit: boolean;
  canDelete: boolean;
  canReadDetail?: boolean;
  onProgressChange: (avancement: number) => void;
}

export function ProjectActionsList({ projectId, projectDeadline, canEdit, canDelete, canReadDetail = true, onProgressChange }: Props) {
  const { user } = useAuth();
  const [actions, setActions] = useState<ProjectAction[]>([]);
  const [tasksMap, setTasksMap] = useState<Record<string, ProjectTask[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState<string | null>(null);
  const [newActionTitle, setNewActionTitle] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState<Record<string, string>>({});
  const { acteurs, getActeurLabel } = useActeurs();

  const [showResp2, setShowResp2] = useState<Set<string>>(new Set());
  const [showResp3, setShowResp3] = useState<Set<string>>(new Set());

  const [deadlineDialog, setDeadlineDialog] = useState<{
    open: boolean;
    entityType: "action" | "task";
    entityId: string;
    entityTitle: string;
    oldDate: string | null;
    newDate: string;
  } | null>(null);
  const [deadlineReason, setDeadlineReason] = useState("");

  const [logsOpen, setLogsOpen] = useState(false);
  const [deadlineLogs, setDeadlineLogs] = useState<DeadlineLog[]>([]);

  const [disableMultiDialog, setDisableMultiDialog] = useState<string | null>(null);

  // Confirm close action dialog
  const [confirmCloseActionId, setConfirmCloseActionId] = useState<string | null>(null);

  // Filters
  const [filterStatut, setFilterStatut] = useState("all");
  const [hideTerminees, setHideTerminees] = useState(false);
  const [filterEcheance, setFilterEcheance] = useState("all");
  const [sortBy, setSortBy] = useState("ordre");

  const fetchActions = async () => {
    const { data, error } = await supabase
      .from("project_actions")
      .select("*")
      .eq("project_id", projectId)
      .order("ordre");
    if (error) { console.error("Fetch actions error:", error); toast.error("Erreur chargement actions: " + error.message); return; }
    const acts = (data ?? []).map((d: any) => ({ ...d, multi_tasks: d.multi_tasks ?? false, pinned: d.pinned ?? false, responsable_id_2: d.responsable_id_2 ?? null, responsable_id_3: d.responsable_id_3 ?? null })) as ProjectAction[];
    setActions(acts);

    const r2 = new Set<string>();
    const r3 = new Set<string>();
    acts.forEach(a => {
      if (a.responsable_id_2) r2.add(a.id);
      if (a.responsable_id_3) r3.add(a.id);
    });
    setShowResp2(prev => new Set([...prev, ...r2]));
    setShowResp3(prev => new Set([...prev, ...r3]));

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

  const fetchDeadlineLogs = async () => {
    const { data } = await supabase
      .from("project_deadline_logs")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(50);
    setDeadlineLogs((data ?? []) as DeadlineLog[]);
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
    const action = actions.find(a => a.id === actionId);
    const payload: any = {
      action_id: actionId,
      title,
      ordre: existing.length,
      statut: "a_faire",
      avancement: 0,
      echeance: action?.echeance ?? null,
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

  const handleDateChange = (entityType: "action" | "task", entityId: string, entityTitle: string, oldDate: string | null, newDate: string) => {
    if (projectDeadline && newDate && isAfter(parseISO(newDate), parseISO(projectDeadline))) {
      toast.warning(`⚠️ Cette date dépasse la deadline du projet (${projectDeadline}).`, { duration: 5000 });
    }
    if (oldDate && oldDate !== newDate) {
      setDeadlineDialog({ open: true, entityType, entityId, entityTitle, oldDate, newDate });
      setDeadlineReason("");
    } else {
      if (entityType === "action") updateAction(entityId, { echeance: newDate || null });
      else updateTask(entityId, { echeance: newDate || null });
    }
  };

  const confirmDeadlineChange = async () => {
    if (!deadlineDialog) return;
    const { entityType, entityId, entityTitle, oldDate, newDate } = deadlineDialog;
    await supabase.from("project_deadline_logs").insert({
      entity_type: entityType, entity_id: entityId, entity_title: entityTitle,
      project_id: projectId, old_echeance: oldDate, new_echeance: newDate || null,
      changed_by: user?.id ?? null, reason: deadlineReason.trim() || null,
    });
    if (entityType === "action") await updateAction(entityId, { echeance: newDate || null });
    else await updateTask(entityId, { echeance: newDate || null });
    setDeadlineDialog(null);
    setDeadlineReason("");
    toast.success("Échéance modifiée et tracée");
  };

  const updateAction = async (id: string, updates: Record<string, any>) => {
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

  const updateTask = async (id: string, updates: Record<string, any>) => {
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

  /** Handle status change with validation */
  const handleStatusChange = (action: ProjectAction, newStatut: string) => {
    // If trying to set "terminee", apply controls
    if (newStatut === "terminee") {
      // Multi-tasks: all tasks must be "termine"
      if (action.multi_tasks) {
        const tasks = tasksMap[action.id] ?? [];
        const allDone = tasks.length > 0 && tasks.every(t => t.statut === "termine");
        if (!allDone) {
          toast.error("Toutes les tâches doivent être terminées avant de clôturer l'action.", { duration: 5000 });
          return;
        }
      }
      // Show confirmation dialog
      setConfirmCloseActionId(action.id);
      return;
    }

    // If trying to set "en_cours", warn if no date_debut
    if (newStatut === "en_cours" && !action.date_debut) {
      toast.warning("Pensez à définir une date de début pour cette action.", { duration: 4000 });
    }

    updateAction(action.id, { statut: newStatut });
  };

  /** Confirm closing an action */
  const confirmCloseAction = async () => {
    if (!confirmCloseActionId) return;
    await updateAction(confirmCloseActionId, { statut: "terminee", avancement: 100 });
    setConfirmCloseActionId(null);
    toast.success("Action terminée et figée ✓", { duration: 4000 });
  };

  /** Reopen a closed action */
  const reopenAction = async (actionId: string) => {
    await updateAction(actionId, { statut: "en_cours" });
    toast.info("Action rouverte");
  };

  /** Toggle multi-tasks mode */
  const toggleMultiTasks = async (action: ProjectAction) => {
    if (action.multi_tasks) {
      const tasks = tasksMap[action.id] ?? [];
      if (tasks.length > 0) {
        setDisableMultiDialog(action.id);
        return;
      }
      await updateAction(action.id, { multi_tasks: false });
    } else {
      await supabase.from("project_actions").update({ multi_tasks: true }).eq("id", action.id);
      await supabase.from("project_tasks").insert({
        action_id: action.id,
        title: action.title,
        ordre: 0,
        statut: "a_faire",
        avancement: 0,
        echeance: action.echeance ?? null,
      });
      toast.success("Mode multi-tâches activé");
      fetchActions();
    }
  };

  const confirmDisableMulti = async (actionId: string) => {
    await supabase.from("project_tasks").delete().eq("action_id", actionId);
    await updateAction(actionId, { multi_tasks: false, avancement: 0 });
    setDisableMultiDialog(null);
    toast.success("Mode multi-tâches désactivé, tâches supprimées");
  };

  /** Update avancement for simple action (no multi-tasks) */
  const handleSimpleAvancement = async (actionId: string, value: number) => {
    if (value === 100) {
      // Instead of silently setting terminee, show confirmation
      const action = actions.find(a => a.id === actionId);
      if (action) {
        // Temporarily save progress, then ask to confirm close
        await supabase.from("project_actions").update({ avancement: value }).eq("id", actionId);
        setConfirmCloseActionId(actionId);
        fetchActions();
        return;
      }
    }
    const statut = value > 0 ? "en_cours" : "planifiee";
    await updateAction(actionId, { avancement: value, statut });
    toast.success("Avancement enregistré", { duration: 2000 });
  };

  /** Recalculate action avancement from tasks — fetches fresh data from DB */
  const recalcActionFromTasks = async (actionId: string) => {
    const { data: freshTasks } = await supabase
      .from("project_tasks")
      .select("*")
      .eq("action_id", actionId);
    if (!freshTasks || freshTasks.length === 0) return;
    const avg = Math.round(freshTasks.reduce((s: number, t: any) => s + t.avancement, 0) / freshTasks.length);
    const statut = avg === 100 ? "terminee" : avg > 0 ? "en_cours" : "planifiee";
    // If all tasks done, don't auto-set terminee — user must confirm
    if (statut === "terminee") {
      await supabase.from("project_actions").update({ avancement: avg }).eq("id", actionId);
      fetchActions();
      return;
    }
    await updateAction(actionId, { avancement: avg, statut });
  };

  if (!canReadDetail) {
    return <p className="text-sm text-muted-foreground py-4">Vous n'avez pas la permission de consulter les actions.</p>;
  }

  const DateIndicator = ({ echeance, statut }: { echeance: string | null; statut: string }) => {
    const ds = getDateStatus(echeance, projectDeadline, statut);
    if (ds.status === "ok" || !echeance) return null;
    const IconComp = ds.status === "overdue" ? ShieldAlert : ds.status === "exceeds" ? AlertTriangle : CalendarClock;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 ${ds.color}`}>
              <IconComp className="h-3.5 w-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs max-w-52">
            <p>{ds.label}</p>
            {ds.status === "exceeds" && projectDeadline && (
              <p className="mt-0.5 opacity-75">Deadline projet : {projectDeadline}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const ResponsableSelector = ({ actionId, field, value, label, disabled }: { actionId: string; field: string; value: string | null; label: string; disabled?: boolean }) => (
    <div className="space-y-1">
      <label className="text-[10px] font-medium text-muted-foreground">{label}</label>
      <Select value={value ?? "none"} onValueChange={(v) => updateAction(actionId, { [field]: v === "none" ? null : v })} disabled={disabled}>
        <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Assigner" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Non assigné</SelectItem>
          {acteurs.map((a) => <SelectItem key={a.id} value={a.id}>{a.fonction || a.organisation || "Acteur"}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Project deadline banner */}
      {projectDeadline && (
        <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <CalendarClock className="h-4 w-4 text-primary" />
            <span className="font-medium text-foreground">Deadline du projet :</span>
            <span className="text-muted-foreground">{projectDeadline}</span>
            {(() => {
              const today = new Date(); today.setHours(0, 0, 0, 0);
              const dl = parseISO(projectDeadline);
              const daysLeft = differenceInDays(dl, today);
              if (daysLeft < 0) return <Badge className="bg-destructive/15 text-destructive text-[10px] ml-1">En retard de {Math.abs(daysLeft)}j</Badge>;
              if (daysLeft <= 7) return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] ml-1">{daysLeft}j restants</Badge>;
              return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] ml-1">{daysLeft}j restants</Badge>;
            })()}
          </div>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground" onClick={() => { fetchDeadlineLogs(); setLogsOpen(true); }}>
            <History className="h-3.5 w-3.5" />
            Historique
          </Button>
        </div>
      )}

      {/* Filter bar */}
      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/30 bg-muted/10 px-3 py-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="h-7 w-[120px] text-[11px] border-border/40">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="planifiee">📋 Planifiée</SelectItem>
              <SelectItem value="en_cours">🔄 En cours</SelectItem>
              <SelectItem value="terminee">✅ Terminée</SelectItem>
              <SelectItem value="en_retard">⚠️ En retard</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterEcheance} onValueChange={setFilterEcheance}>
            <SelectTrigger className="h-7 w-[130px] text-[11px] border-border/40">
              <SelectValue placeholder="Échéance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes dates</SelectItem>
              <SelectItem value="overdue">🔴 En retard</SelectItem>
              <SelectItem value="this_week">📅 Cette semaine</SelectItem>
              <SelectItem value="this_month">📆 Ce mois</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-7 w-[120px] text-[11px] border-border/40">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Tri" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ordre">Ordre manuel</SelectItem>
              <SelectItem value="echeance">Échéance</SelectItem>
              <SelectItem value="created_at">Date création</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={hideTerminees ? "default" : "outline"}
            size="sm"
            className="h-7 text-[11px] gap-1 px-2.5"
            onClick={() => setHideTerminees(!hideTerminees)}
          >
            {hideTerminees ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {hideTerminees ? "Terminées masquées" : "Masquer terminées"}
          </Button>

          {/* Active filter count */}
          {(() => {
            const filteredActions = getFilteredActions();
            const hasFilters = filterStatut !== "all" || filterEcheance !== "all" || hideTerminees;
            if (!hasFilters) return null;
            return (
              <Badge variant="outline" className="text-[10px] h-5 ml-auto">
                {filteredActions.length}/{actions.length} actions
              </Badge>
            );
          })()}
        </div>
      )}

      {getFilteredActions().map((action) => {
        const tasks = tasksMap[action.id] ?? [];
        const isOpen = expanded === action.id;
        const st = ACTION_STATUS[action.statut] ?? ACTION_STATUS.planifiee;
        const actionDateStatus = getDateStatus(action.echeance, projectDeadline, action.statut);
        const hasResp2 = showResp2.has(action.id) || !!action.responsable_id_2;
        const hasResp3 = showResp3.has(action.id) || !!action.responsable_id_3;
        const isFrozen = action.statut === "terminee";

        return (
          <Collapsible key={action.id} open={isOpen} onOpenChange={() => setExpanded(isOpen ? null : action.id)}>
            <div className={`border rounded-xl overflow-hidden bg-card transition-colors ${
              isFrozen ? "border-emerald-500/40 bg-emerald-50/5" :
              actionDateStatus.status === "overdue" ? "border-destructive/40" :
              actionDateStatus.status === "exceeds" ? "border-orange-400/40" :
              actionDateStatus.status === "urgent" ? "border-amber-400/40" :
              "border-border/40"
            }`} style={{ boxShadow: "var(--shadow-sm)" }}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer">
                  {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium text-sm line-clamp-1 ${isFrozen ? "text-emerald-700 dark:text-emerald-400" : ""}`}>{action.title}</p>
                      {action.multi_tasks && (
                        <Badge variant="outline" className="text-[9px] gap-1 h-4">
                          <ListTodo className="h-2.5 w-2.5" /> Multi-tâches
                        </Badge>
                      )}
                      {isFrozen && (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[9px] gap-1 h-4">
                          <Lock className="h-2.5 w-2.5" /> Figée
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                      {action.multi_tasks ? (
                        <span>{tasks.length} tâche{tasks.length !== 1 ? "s" : ""}</span>
                      ) : (
                        <span>Action simple</span>
                      )}
                      {action.echeance && (
                        <span className="flex items-center gap-1">
                          • Échéance: {action.echeance}
                          <DateIndicator echeance={action.echeance} statut={action.statut} />
                        </span>
                      )}
                      {action.responsable_id && <span>• {getActeurLabel(action.responsable_id)}</span>}
                      {action.responsable_id_2 && <span>• {getActeurLabel(action.responsable_id_2)}</span>}
                      {action.responsable_id_3 && <span>• {getActeurLabel(action.responsable_id_3)}</span>}
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

                  {/* Frozen banner */}
                  {isFrozen && (
                    <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
                      <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">Action terminée — figée</span>
                      </div>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() => reopenAction(action.id)}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Rouvrir
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Action inline edit — disabled if frozen */}
                  {canEdit && !isFrozen && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-3 items-end">
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground">Statut</label>
                          <Select value={action.statut} onValueChange={(v) => handleStatusChange(action, v)}>
                            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {Object.entries(ACTION_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                            Échéance
                            <DateIndicator echeance={action.echeance} statut={action.statut} />
                          </label>
                          <Input
                            type="date"
                            className={`h-8 w-36 text-xs ${actionDateStatus.status !== "ok" ? "border-orange-400/60" : ""}`}
                            value={action.echeance ?? ""}
                            max={projectDeadline ?? undefined}
                            onChange={(e) => handleDateChange("action", action.id, action.title, action.echeance, e.target.value)}
                          />
                        </div>

                        {/* Multi-tâches toggle */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                            <ListTodo className="h-3 w-3" /> Multi-tâches
                          </label>
                          <div className="flex items-center gap-2 h-8">
                            <Switch
                              checked={action.multi_tasks}
                              onCheckedChange={() => toggleMultiTasks(action)}
                            />
                            <span className="text-[10px] text-muted-foreground">{action.multi_tasks ? "Activé" : "Désactivé"}</span>
                          </div>
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

                      {/* Responsables row */}
                      <div className="flex flex-wrap items-end gap-2">
                        <ResponsableSelector actionId={action.id} field="responsable_id" value={action.responsable_id} label="Responsable 1" />

                        {hasResp2 ? (
                          <div className="flex items-end gap-1">
                            <ResponsableSelector actionId={action.id} field="responsable_id_2" value={action.responsable_id_2} label="Responsable 2" />
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                updateAction(action.id, { responsable_id_2: null });
                                setShowResp2(prev => { const n = new Set(prev); n.delete(action.id); return n; });
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground"
                            onClick={() => setShowResp2(prev => new Set([...prev, action.id]))}
                          >
                            <UserPlus className="h-3 w-3" /> +Resp. 2
                          </Button>
                        )}

                        {hasResp2 && (hasResp3 ? (
                          <div className="flex items-end gap-1">
                            <ResponsableSelector actionId={action.id} field="responsable_id_3" value={action.responsable_id_3} label="Responsable 3" />
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => {
                                updateAction(action.id, { responsable_id_3: null });
                                setShowResp3(prev => { const n = new Set(prev); n.delete(action.id); return n; });
                              }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground"
                            onClick={() => setShowResp3(prev => new Set([...prev, action.id]))}
                          >
                            <UserPlus className="h-3 w-3" /> +Resp. 3
                          </Button>
                        ))}
                      </div>

                      {/* Simple mode: avancement slider */}
                      {!action.multi_tasks && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-medium text-muted-foreground">Avancement : {action.avancement}%</label>
                          <div className="flex items-center gap-3 max-w-sm">
                            <Slider
                              value={[action.avancement]}
                              max={100}
                              step={5}
                              onValueCommit={(v) => handleSimpleAvancement(action.id, v[0])}
                              className="flex-1"
                            />
                            <span className="text-xs font-semibold text-primary w-10 text-right">{action.avancement}%</span>
                          </div>
                        </div>
                      )}

                      {/* Multi-tasks mode: calculated avancement (read-only) */}
                      {action.multi_tasks && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ListTodo className="h-3.5 w-3.5 text-primary" />
                          <span>Avancement calculé automatiquement depuis les tâches : <span className="font-semibold text-foreground">{action.avancement}%</span></span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tasks — only shown in multi-tasks mode */}
                  {action.multi_tasks && (
                    <>
                      <div className="space-y-1.5">
                        {tasks.map((task) => {
                          const ts = TASK_STATUS[task.statut] ?? TASK_STATUS.a_faire;
                          const TaskIcon = ts.icon;
                          const taskDateStatus = getDateStatus(task.echeance, projectDeadline, task.statut);
                          const taskFrozen = isFrozen || task.statut === "termine";
                          return (
                            <div key={task.id} className={`flex items-center gap-2 rounded-lg border bg-background px-3 py-2 group ${
                              taskFrozen && task.statut === "termine" ? "border-emerald-500/20 bg-emerald-50/5" :
                              taskDateStatus.status === "overdue" ? "border-destructive/30" :
                              taskDateStatus.status === "exceeds" ? "border-orange-400/30" :
                              "border-border/30"
                            }`}>
                              {canEdit && !isFrozen ? (
                                task.statut === "termine" ? (
                                  // Terminated task — icon click reopens it
                                  <button
                                    className={`shrink-0 ${ts.class}`}
                                    onClick={async () => {
                                      await updateTask(task.id, { statut: "en_cours", avancement: 50 });
                                      await recalcActionFromTasks(action.id);
                                    }}
                                  >
                                    <TaskIcon className="h-4 w-4" />
                                  </button>
                                ) : (
                                  <button
                                    className={`shrink-0 ${ts.class}`}
                                    onClick={async () => {
                                      const next = task.statut === "a_faire" ? "en_cours" : "termine";
                                      const av = next === "termine" ? 100 : 50;
                                      await updateTask(task.id, { statut: next, avancement: av });
                                      await recalcActionFromTasks(action.id);
                                    }}
                                  >
                                    <TaskIcon className="h-4 w-4" />
                                  </button>
                                )
                              ) : (
                                <TaskIcon className={`h-4 w-4 shrink-0 ${ts.class}`} />
                              )}
                              <span className={`text-sm flex-1 ${task.statut === "termine" ? "line-through text-muted-foreground" : ""}`}>
                                {task.title}
                              </span>
                              {canEdit && !isFrozen && task.statut !== "termine" && (
                                <Select value={task.responsable_id ?? "none"} onValueChange={(v) => updateTask(task.id, { responsable_id: v === "none" ? null : v })}>
                                  <SelectTrigger className="h-6 w-32 text-[10px] border-dashed"><SelectValue placeholder="Resp." /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Non assigné</SelectItem>
                                    {acteurs.map((a) => <SelectItem key={a.id} value={a.id}>{a.fonction || a.organisation || "Acteur"}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              )}
                              {!canEdit || isFrozen || task.statut === "termine" ? (
                                task.responsable_id && <span className="text-[10px] text-muted-foreground">{getActeurLabel(task.responsable_id)}</span>
                              ) : null}
                              {canEdit && !isFrozen && task.statut !== "termine" ? (
                                <Input
                                  type="date"
                                  className={`h-6 w-28 text-[10px] border-dashed ${taskDateStatus.status !== "ok" ? "border-orange-400/60" : ""}`}
                                  value={task.echeance ?? ""}
                                  max={projectDeadline ?? undefined}
                                  onChange={(e) => handleDateChange("task", task.id, task.title, task.echeance, e.target.value)}
                                />
                              ) : (
                                task.echeance && <span className="text-[10px] text-muted-foreground">{task.echeance}</span>
                              )}
                              <DateIndicator echeance={task.echeance} statut={task.statut} />
                              <span className="text-[10px] text-muted-foreground w-8 text-right">{task.avancement}%</span>
                              {canDelete && !isFrozen && task.statut !== "termine" && (
                                <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add task — hidden if frozen */}
                      {canEdit && !isFrozen && (
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
                    </>
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
                        <ElementNotes elementType="project_action" elementId={action.id} />
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

      {/* Confirm close action dialog */}
      <AlertDialog open={!!confirmCloseActionId} onOpenChange={(o) => !o && setConfirmCloseActionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Confirmer la clôture de l'action
            </AlertDialogTitle>
            <AlertDialogDescription>
              Une fois terminée, l'action sera <span className="font-semibold">figée</span> : statut, responsables, échéances et tâches ne seront plus modifiables. Seul un utilisateur autorisé pourra la rouvrir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCloseAction} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Terminer et figer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deadline change confirmation dialog */}
      <Dialog open={!!deadlineDialog?.open} onOpenChange={(o) => !o && setDeadlineDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" />
              Modification d'échéance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/30 p-3 space-y-2">
              <p className="text-sm font-medium">{deadlineDialog?.entityTitle}</p>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Ancienne :</span>
                  <Badge variant="outline" className="text-xs">{deadlineDialog?.oldDate ?? "Non définie"}</Badge>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Nouvelle :</span>
                  <Badge className="bg-primary/15 text-primary text-xs">{deadlineDialog?.newDate || "Retirée"}</Badge>
                </div>
              </div>
              {deadlineDialog?.newDate && projectDeadline && isAfter(parseISO(deadlineDialog.newDate), parseISO(projectDeadline)) && (
                <div className="flex items-center gap-1.5 text-xs text-orange-600 dark:text-orange-400 mt-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Cette date dépasse la deadline du projet ({projectDeadline})
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Motif du changement</label>
              <Textarea
                value={deadlineReason}
                onChange={(e) => setDeadlineReason(e.target.value)}
                placeholder="Pourquoi cette modification ? (optionnel)"
                rows={2}
                className="text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeadlineDialog(null)}>Annuler</Button>
              <Button onClick={confirmDeadlineChange}>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Confirmer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
              deadlineLogs.map((log) => (
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

      {/* Confirm disable multi-tasks dialog */}
      <AlertDialog open={!!disableMultiDialog} onOpenChange={(o) => !o && setDisableMultiDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver le mode multi-tâches ?</AlertDialogTitle>
            <AlertDialogDescription>
              Toutes les tâches existantes de cette action seront supprimées. L'avancement sera remis à 0.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => disableMultiDialog && confirmDisableMulti(disableMultiDialog)} className="bg-destructive text-destructive-foreground">
              Désactiver et supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
