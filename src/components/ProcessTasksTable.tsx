import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Edit, GitBranch, X } from "lucide-react";

type TaskFlowType = "sequentiel" | "conditionnel" | "parallele" | "inclusif";
type ElementType = "finalite" | "donnee_entree" | "donnee_sortie" | "activite" | "interaction" | "partie_prenante" | "ressource";

interface ProcessTask {
  id: string;
  process_id: string;
  code: string;
  description: string;
  type_flux: TaskFlowType;
  condition: string | null;
  parent_code: string | null;
  responsable_id: string | null;
  ordre: number;
  entrees: string | null;
  sorties: string | null;
  documents: string[] | null;
}

interface ProcessElement {
  id: string;
  code: string;
  description: string;
  type: ElementType;
  ordre: number;
}

interface Acteur {
  id: string;
  nom: string;
  prenom: string;
}

const FLOW_ICONS: Record<TaskFlowType, string> = {
  sequentiel: "→",
  conditionnel: "◇",
  parallele: "═",
  inclusif: "≈",
};

const FLOW_LABELS: Record<TaskFlowType, string> = {
  sequentiel: "Séquentiel",
  conditionnel: "Conditionnel (XOR)",
  parallele: "Parallèle (AND)",
  inclusif: "Inclusif (OR)",
};

const BRANCH_PREFIX: Record<string, string> = {
  conditionnel: "a",
  parallele: "p",
  inclusif: "o",
};

interface Props {
  processId: string;
  canEdit: boolean;
  canDelete: boolean;
  processElements: ProcessElement[];
  onAddElement: (type: ElementType, description: string) => Promise<void>;
}

const emptyForm = {
  description: "",
  type_flux: "sequentiel" as TaskFlowType,
  condition: "",
  responsable_id: "",
  selectedEntrees: [] as string[],
  selectedSorties: [] as string[],
};

export function ProcessTasksTable({ processId, canEdit, canDelete, processElements, onAddElement }: Props) {
  const [tasks, setTasks] = useState<ProcessTask[]>([]);
  const [acteurs, setActeurs] = useState<Acteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ProcessTask | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [branchParent, setBranchParent] = useState<ProcessTask | null>(null);
  const [newEntreeDesc, setNewEntreeDesc] = useState("");
  const [newSortieDesc, setNewSortieDesc] = useState("");

  const entreesElements = processElements.filter(e => e.type === "donnee_entree");
  const sortiesElements = processElements.filter(e => e.type === "donnee_sortie");

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from("process_tasks")
      .select("*")
      .eq("process_id", processId)
      .order("ordre", { ascending: true });
    if (data) setTasks(data as unknown as ProcessTask[]);
    setLoading(false);
  }, [processId]);

  const fetchActeurs = useCallback(async () => {
    const { data } = await supabase.from("acteurs").select("id, nom, prenom").eq("actif", true);
    if (data) setActeurs(data);
  }, []);

  useEffect(() => {
    fetchTasks();
    fetchActeurs();
  }, [fetchTasks, fetchActeurs]);

  // Parse comma-separated codes to array
  const parseCodes = (value: string | null): string[] => {
    if (!value) return [];
    return value.split(",").map(s => s.trim()).filter(Boolean);
  };

  const codesToString = (codes: string[]): string => codes.join(", ");

  const getNextRootCode = (): string => {
    const rootTasks = tasks.filter((t) => !t.parent_code);
    const maxNum = rootTasks.reduce((max, t) => {
      const n = parseInt(t.code, 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    return String(maxNum + 1);
  };

  const getNextBranchCode = (parent: ProcessTask): string => {
    const prefix = BRANCH_PREFIX[parent.type_flux] || "a";
    const branches = tasks.filter((t) => t.parent_code === parent.code);
    const maxNum = branches.reduce((max, t) => {
      const match = t.code.match(new RegExp(`\\.${prefix}(\\d+)$`));
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `${parent.code}.${prefix}${maxNum + 1}`;
  };

  const getMaxOrdre = (): number => {
    if (branchParent) {
      const branches = tasks.filter((t) => t.parent_code === branchParent.code);
      if (branches.length === 0) return branchParent.ordre + 1;
      return Math.max(...branches.map((t) => t.ordre)) + 1;
    }
    return tasks.length > 0 ? Math.max(...tasks.map((t) => t.ordre)) + 1 : 1;
  };

  const openAddDialog = (parent?: ProcessTask) => {
    setEditingTask(null);
    setBranchParent(parent || null);
    setForm({ ...emptyForm });
    setNewEntreeDesc("");
    setNewSortieDesc("");
    setDialogOpen(true);
  };

  const openEditDialog = (task: ProcessTask) => {
    setEditingTask(task);
    setBranchParent(null);
    setForm({
      description: task.description,
      type_flux: task.type_flux,
      condition: task.condition || "",
      responsable_id: task.responsable_id || "",
      selectedEntrees: parseCodes(task.entrees),
      selectedSorties: parseCodes(task.sorties),
    });
    setNewEntreeDesc("");
    setNewSortieDesc("");
    setDialogOpen(true);
  };

  const toggleCode = (list: string[], code: string): string[] => {
    return list.includes(code) ? list.filter(c => c !== code) : [...list, code];
  };

  const handleQuickAddElement = async (type: "donnee_entree" | "donnee_sortie", description: string) => {
    if (!description.trim()) {
      toast.error("Veuillez saisir une description");
      return;
    }
    try {
      await onAddElement(type, description.trim());
      if (type === "donnee_entree") {
        setNewEntreeDesc("");
      } else {
        setNewSortieDesc("");
      }
    } catch (err) {
      toast.error("Erreur lors de l'ajout de l'élément");
    }
  };

  const handleSave = async () => {
    if (!form.description.trim()) {
      toast.error("La description est requise");
      return;
    }

    const entreesStr = codesToString(form.selectedEntrees) || null;
    const sortiesStr = codesToString(form.selectedSorties) || null;

    if (editingTask) {
      const { error } = await supabase
        .from("process_tasks")
        .update({
          description: form.description,
          type_flux: form.type_flux as TaskFlowType,
          condition: form.condition || null,
          responsable_id: form.responsable_id || null,
          entrees: entreesStr,
          sorties: sortiesStr,
        })
        .eq("id", editingTask.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Activité modifiée");
    } else {
      const code = branchParent ? getNextBranchCode(branchParent) : getNextRootCode();
      const ordre = getMaxOrdre();
      const { error } = await supabase.from("process_tasks").insert({
        process_id: processId,
        code,
        description: form.description,
        type_flux: (branchParent ? "sequentiel" : form.type_flux) as TaskFlowType,
        condition: form.condition || null,
        parent_code: branchParent?.code || null,
        responsable_id: form.responsable_id || null,
        ordre,
        entrees: entreesStr,
        sorties: sortiesStr,
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Activité ajoutée");
    }
    setDialogOpen(false);
    fetchTasks();
  };

  const handleDelete = async (taskId: string, code: string) => {
    const toDelete = tasks.filter((t) => t.id === taskId || t.parent_code === code);
    for (const t of toDelete) {
      await supabase.from("process_tasks").delete().eq("id", t.id);
    }
    toast.success("Activité supprimée");
    fetchTasks();
  };

  const acteurName = (id: string | null) => {
    if (!id) return "—";
    const a = acteurs.find((a) => a.id === id);
    return a ? `${a.prenom} ${a.nom}`.trim() : "—";
  };

  const resolveElementDescriptions = (codesStr: string | null): string => {
    if (!codesStr) return "—";
    const codes = parseCodes(codesStr);
    if (codes.length === 0) return "—";
    return codes.map(code => {
      const el = processElements.find(e => e.code === code);
      return el ? el.description : code;
    }).join(", ");
  };

  const isSubTask = (task: ProcessTask) => !!task.parent_code;

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Activités du processus</h3>
        {canEdit && (
          <Button size="sm" onClick={() => openAddDialog()}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter une tâche
          </Button>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucune tâche définie pour ce processus.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-12">Type</TableHead>
                <TableHead>Entrées</TableHead>
                <TableHead>Sorties</TableHead>
                <TableHead>Responsable</TableHead>
                {(canEdit || canDelete) && <TableHead className="w-24">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
                <TableRow key={task.id} className={isSubTask(task) ? "bg-muted/30" : ""}>
                  <TableCell className="font-mono text-xs font-medium text-primary">
                    {task.code}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {isSubTask(task) && <span className="text-muted-foreground text-xs">↳</span>}
                      <span className={isSubTask(task) ? "text-sm" : ""}>{task.description}</span>
                      {task.condition && (
                        <span className="text-xs text-muted-foreground ml-1">({task.condition})</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-lg" title={FLOW_LABELS[task.type_flux]}>
                    {FLOW_ICONS[task.type_flux]}
                  </TableCell>
                  <TableCell className="text-sm">{resolveElementDescriptions(task.entrees)}</TableCell>
                  <TableCell className="text-sm">{resolveElementDescriptions(task.sorties)}</TableCell>
                  <TableCell className="text-sm">{acteurName(task.responsable_id)}</TableCell>
                  {(canEdit || canDelete) && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {canEdit && !isSubTask(task) && ["conditionnel", "parallele", "inclusif"].includes(task.type_flux) && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAddDialog(task)} title="Ajouter une branche">
                            <GitBranch className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(task)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(task.id, task.code)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {Object.entries(FLOW_ICONS).map(([key, icon]) => (
          <span key={key}>{icon} {FLOW_LABELS[key as TaskFlowType]}</span>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTask ? "Modifier la tâche" : branchParent ? `Ajouter une branche à ${branchParent.code}` : "Nouvelle tâche"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>

            {!branchParent && !editingTask?.parent_code && (
              <div className="space-y-2">
                <Label>Type de flux</Label>
                <Select value={form.type_flux} onValueChange={(v) => setForm({ ...form, type_flux: v as TaskFlowType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(FLOW_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>{FLOW_ICONS[k as TaskFlowType]} {label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(branchParent || editingTask?.parent_code) && (
              <div className="space-y-2">
                <Label>Condition</Label>
                <Input value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} placeholder="Ex: SI conforme, SINON..." />
              </div>
            )}

            {/* Entrées - select from process elements */}
            <div className="space-y-2">
              <Label>Entrées (données d'entrée)</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {form.selectedEntrees.map(code => {
                  const el = entreesElements.find(e => e.code === code);
                  return (
                    <Badge key={code} variant="secondary" className="gap-1">
                      <span className="font-mono text-xs">{code}</span> {el?.description || code}
                      <button type="button" onClick={() => setForm({ ...form, selectedEntrees: form.selectedEntrees.filter(c => c !== code) })} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value="__placeholder__"
                  onValueChange={(v) => {
                    if (v && v !== "__placeholder__" && !form.selectedEntrees.includes(v)) {
                      setForm({ ...form, selectedEntrees: [...form.selectedEntrees, v] });
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sélectionner une entrée..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__placeholder__" disabled>Sélectionner une entrée...</SelectItem>
                    {entreesElements.filter(el => !form.selectedEntrees.includes(el.code)).map(el => (
                      <SelectItem key={el.id} value={el.code}>
                        <span className="font-mono text-xs mr-1">{el.code}</span> {el.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={newEntreeDesc}
                  onChange={(e) => setNewEntreeDesc(e.target.value)}
                  placeholder="Ou ajouter une nouvelle donnée d'entrée..."
                  className="h-8 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleQuickAddElement("donnee_entree", newEntreeDesc); } }}
                />
                <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => handleQuickAddElement("donnee_entree", newEntreeDesc)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Sorties - select from process elements */}
            <div className="space-y-2">
              <Label>Sorties (données de sortie)</Label>
              <div className="flex flex-wrap gap-1 mb-2">
                {form.selectedSorties.map(code => {
                  const el = sortiesElements.find(e => e.code === code);
                  return (
                    <Badge key={code} variant="secondary" className="gap-1">
                      <span className="font-mono text-xs">{code}</span> {el?.description || code}
                      <button type="button" onClick={() => setForm({ ...form, selectedSorties: form.selectedSorties.filter(c => c !== code) })} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value="__placeholder__"
                  onValueChange={(v) => {
                    if (v && v !== "__placeholder__" && !form.selectedSorties.includes(v)) {
                      setForm({ ...form, selectedSorties: [...form.selectedSorties, v] });
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Sélectionner une sortie..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__placeholder__" disabled>Sélectionner une sortie...</SelectItem>
                    {sortiesElements.filter(el => !form.selectedSorties.includes(el.code)).map(el => (
                      <SelectItem key={el.id} value={el.code}>
                        <span className="font-mono text-xs mr-1">{el.code}</span> {el.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={newSortieDesc}
                  onChange={(e) => setNewSortieDesc(e.target.value)}
                  placeholder="Ou ajouter une nouvelle donnée de sortie..."
                  className="h-8 text-sm"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleQuickAddElement("donnee_sortie", newSortieDesc); } }}
                />
                <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => handleQuickAddElement("donnee_sortie", newSortieDesc)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Responsable</Label>
              <Select value={form.responsable_id || "none"} onValueChange={(v) => setForm({ ...form, responsable_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non assigné</SelectItem>
                  {acteurs.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{`${a.prenom} ${a.nom}`.trim()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave}>{editingTask ? "Modifier" : "Ajouter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
