import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Trash2 } from "lucide-react";

type TaskFlowType = "sequentiel" | "conditionnel" | "parallele" | "inclusif";
type ElementType = "finalite" | "donnee_entree" | "donnee_sortie" | "activite" | "interaction" | "partie_prenante" | "ressource";

interface ProcessElement {
  id: string; code: string; description: string; type: ElementType; ordre: number;
}

interface Acteur {
  id: string; fonction: string | null;
}

interface TaskData {
  id?: string;
  code?: string;
  description: string;
  type_flux: TaskFlowType;
  condition: string | null;
  parent_code: string | null;
  responsable_id: string | null;
  entrees: string | null;
  sorties: string | null;
}

const FLOW_ICONS: Record<TaskFlowType, string> = {
  sequentiel: "→", conditionnel: "◇", parallele: "═", inclusif: "≈",
};
const FLOW_LABELS: Record<TaskFlowType, string> = {
  sequentiel: "Séquentiel", conditionnel: "Conditionnel (XOR)", parallele: "Parallèle (AND)", inclusif: "Inclusif (OR)",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: TaskData | null;
  isBranch: boolean;
  acteurs: Acteur[];
  processElements: ProcessElement[];
  onSave: (data: {
    description: string; type_flux: TaskFlowType; condition: string | null;
    responsable_id: string | null; entrees: string | null; sorties: string | null;
  }) => void;
  onDelete?: () => void;
  onAddElement: (type: ElementType, description: string) => Promise<void>;
  canDelete: boolean;
}

export function FlowchartNodeEditor({ open, onOpenChange, task, isBranch, acteurs, processElements, onSave, onDelete, onAddElement, canDelete }: Props) {
  const [description, setDescription] = useState("");
  const [typeFlux, setTypeFlux] = useState<TaskFlowType>("sequentiel");
  const [condition, setCondition] = useState("");
  const [responsableId, setResponsableId] = useState("");
  const [selectedEntrees, setSelectedEntrees] = useState<string[]>([]);
  const [selectedSorties, setSelectedSorties] = useState<string[]>([]);
  const [newEntreeDesc, setNewEntreeDesc] = useState("");
  const [newSortieDesc, setNewSortieDesc] = useState("");

  const entreesElements = processElements.filter(e => e.type === "donnee_entree");
  const sortiesElements = processElements.filter(e => e.type === "donnee_sortie");

  useEffect(() => {
    if (open && task) {
      setDescription(task.description || "");
      setTypeFlux(task.type_flux || "sequentiel");
      setCondition(task.condition || "");
      setResponsableId(task.responsable_id || "");
      const parseCodes = (v: string | null) => v ? v.split(",").map(s => s.trim()).filter(Boolean) : [];
      setSelectedEntrees(parseCodes(task.entrees));
      setSelectedSorties(parseCodes(task.sorties));
    } else if (open) {
      setDescription(""); setTypeFlux("sequentiel"); setCondition("");
      setResponsableId(""); setSelectedEntrees([]); setSelectedSorties([]);
    }
    setNewEntreeDesc(""); setNewSortieDesc("");
  }, [open, task]);

  const handleSave = () => {
    if (!description.trim()) return;
    onSave({
      description, type_flux: typeFlux,
      condition: condition || null,
      responsable_id: responsableId || null,
      entrees: selectedEntrees.length > 0 ? selectedEntrees.join(", ") : null,
      sorties: selectedSorties.length > 0 ? selectedSorties.join(", ") : null,
    });
  };

  const handleQuickAdd = async (type: "donnee_entree" | "donnee_sortie", desc: string) => {
    if (!desc.trim()) return;
    await onAddElement(type, desc.trim());
    if (type === "donnee_entree") setNewEntreeDesc(""); else setNewSortieDesc("");
  };

  const isEditing = !!task?.id;
  const showFluxType = !isBranch && !task?.parent_code;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">
            {isEditing ? "Modifier l'activité" : isBranch ? "Ajouter une branche" : "Nouvelle activité"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 py-6">
          {/* Description */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Description *</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Décrire l'activité..." className="resize-none" />
          </div>

          {/* Type flux */}
          {showFluxType && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type de flux</Label>
              <Select value={typeFlux} onValueChange={v => setTypeFlux(v as TaskFlowType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FLOW_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{FLOW_ICONS[k as TaskFlowType]} {label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Condition */}
          {(isBranch || task?.parent_code) && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Condition</Label>
              <Input value={condition} onChange={e => setCondition(e.target.value)} placeholder="Ex: SI conforme, SINON..." />
            </div>
          )}

          {/* Entrées */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Entrées</Label>
            <div className="flex flex-wrap gap-1 min-h-[28px]">
              {selectedEntrees.map(code => {
                const el = entreesElements.find(e => e.code === code);
                return (
                  <Badge key={code} variant="secondary" className="gap-1 text-xs">
                    <span className="font-mono">{code}</span> {el?.description || code}
                    <button onClick={() => setSelectedEntrees(prev => prev.filter(c => c !== code))} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                  </Badge>
                );
              })}
            </div>
            <Select value="__ph__" onValueChange={v => { if (v !== "__ph__" && !selectedEntrees.includes(v)) setSelectedEntrees(prev => [...prev, v]); }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ph__" disabled>Sélectionner une entrée...</SelectItem>
                {entreesElements.filter(el => !selectedEntrees.includes(el.code)).map(el => (
                  <SelectItem key={el.id} value={el.code}><span className="font-mono text-xs mr-1">{el.code}</span> {el.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input value={newEntreeDesc} onChange={e => setNewEntreeDesc(e.target.value)} placeholder="Ajouter une donnée d'entrée..." className="h-8 text-sm"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleQuickAdd("donnee_entree", newEntreeDesc); } }} />
              <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={() => handleQuickAdd("donnee_entree", newEntreeDesc)}><Plus className="h-3 w-3" /></Button>
            </div>
          </div>

          {/* Sorties */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sorties</Label>
            <div className="flex flex-wrap gap-1 min-h-[28px]">
              {selectedSorties.map(code => {
                const el = sortiesElements.find(e => e.code === code);
                return (
                  <Badge key={code} variant="secondary" className="gap-1 text-xs">
                    <span className="font-mono">{code}</span> {el?.description || code}
                    <button onClick={() => setSelectedSorties(prev => prev.filter(c => c !== code))} className="ml-0.5 hover:text-destructive"><X className="h-3 w-3" /></button>
                  </Badge>
                );
              })}
            </div>
            <Select value="__ph__" onValueChange={v => { if (v !== "__ph__" && !selectedSorties.includes(v)) setSelectedSorties(prev => [...prev, v]); }}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__ph__" disabled>Sélectionner une sortie...</SelectItem>
                {sortiesElements.filter(el => !selectedSorties.includes(el.code)).map(el => (
                  <SelectItem key={el.id} value={el.code}><span className="font-mono text-xs mr-1">{el.code}</span> {el.description}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input value={newSortieDesc} onChange={e => setNewSortieDesc(e.target.value)} placeholder="Ajouter une donnée de sortie..." className="h-8 text-sm"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleQuickAdd("donnee_sortie", newSortieDesc); } }} />
              <Button type="button" size="sm" variant="outline" className="h-8 px-2" onClick={() => handleQuickAdd("donnee_sortie", newSortieDesc)}><Plus className="h-3 w-3" /></Button>
            </div>
          </div>

          {/* Responsable */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Responsable</Label>
            <Select value={responsableId || "none"} onValueChange={v => setResponsableId(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non assigné</SelectItem>
                {acteurs.map(a => <SelectItem key={a.id} value={a.id}>{a.fonction || "—"}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 pt-2 border-t border-border/50">
          {isEditing && canDelete && onDelete && (
            <Button variant="destructive" size="sm" onClick={onDelete} className="mr-auto gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Supprimer
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={!description.trim()}>
            {isEditing ? "Modifier" : "Ajouter"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
