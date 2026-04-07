import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Edit, Copy, Trash2, User, ArrowRight, ArrowLeft, X } from "lucide-react";

type TaskFlowType = "sequentiel" | "conditionnel" | "parallele" | "inclusif";

interface ProcessElement {
  id: string; code: string; description: string; type: string; ordre: number;
}

interface TaskData {
  id: string; code: string; description: string;
  type_flux: TaskFlowType; condition: string | null;
  parent_code: string | null; responsable_id: string | null;
  entrees: string | null; sorties: string | null;
}

const FLOW_LABELS: Record<TaskFlowType, string> = {
  sequentiel: "Séquentiel", conditionnel: "Conditionnel (XOR)", parallele: "Parallèle (AND)", inclusif: "Inclusif (OR)",
};
const FLOW_BADGE_VARIANT: Record<TaskFlowType, string> = {
  sequentiel: "bg-primary/10 text-primary border-primary/20",
  conditionnel: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700",
  parallele: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
  inclusif: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700",
};

interface Props {
  task: TaskData;
  acteurName: (id: string | null) => string | null;
  processElements: ProcessElement[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function FlowchartDetailPanel({ task, acteurName, processElements, canEdit, canDelete, onEdit, onDuplicate, onDelete, onClose }: Props) {
  const parseCodes = (v: string | null) => v ? v.split(",").map(s => s.trim()).filter(Boolean) : [];
  const resolveDesc = (code: string) => processElements.find(e => e.code === code)?.description || code;

  const entrees = parseCodes(task.entrees);
  const sorties = parseCodes(task.sorties);
  const resp = acteurName(task.responsable_id);

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-sm font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary shrink-0">{task.code}</span>
          <span className="text-xs text-muted-foreground truncate">Détails</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Description */}
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
          <p className="text-sm text-foreground mt-1 leading-relaxed">{task.description}</p>
        </div>

        {/* Flow type */}
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Type de flux</label>
          <div className="mt-1">
            <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full border font-medium ${FLOW_BADGE_VARIANT[task.type_flux]}`}>
              {FLOW_LABELS[task.type_flux]}
            </span>
          </div>
        </div>

        {/* Condition */}
        {task.condition && (
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Condition</label>
            <p className="text-sm text-foreground mt-1 italic">"{task.condition}"</p>
          </div>
        )}

        {/* Responsable */}
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Responsable</label>
          <div className="flex items-center gap-2 mt-1">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-foreground">{resp || "Non assigné"}</span>
          </div>
        </div>

        <Separator />

        {/* Entrées */}
        <div>
          <label className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <ArrowRight className="h-3 w-3" /> Entrées
          </label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {entrees.length > 0 ? entrees.map(code => (
              <Badge key={code} variant="secondary" className="text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                {resolveDesc(code)}
              </Badge>
            )) : (
              <span className="text-xs text-muted-foreground italic">Aucune</span>
            )}
          </div>
        </div>

        {/* Sorties */}
        <div>
          <label className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Sorties
          </label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {sorties.length > 0 ? sorties.map(code => (
              <Badge key={code} variant="secondary" className="text-[10px] bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                {resolveDesc(code)}
              </Badge>
            )) : (
              <span className="text-xs text-muted-foreground italic">Aucune</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {canEdit && (
        <div className="border-t border-border/50 px-4 py-3 flex items-center gap-2">
          <Button size="sm" variant="default" onClick={onEdit} className="gap-1.5 flex-1">
            <Edit className="h-3.5 w-3.5" /> Modifier
          </Button>
          <Button size="sm" variant="outline" onClick={onDuplicate} className="gap-1.5">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          {canDelete && (
            <Button size="sm" variant="destructive" onClick={onDelete} className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
