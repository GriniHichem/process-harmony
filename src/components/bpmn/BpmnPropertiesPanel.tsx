import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, ArrowRight } from "lucide-react";
import { BpmnNode, BpmnEdge, NODE_DEFAULTS } from "./types";

interface BpmnPropertiesPanelProps {
  nodes: BpmnNode[];
  edges: BpmnEdge[];
  selectedNodeId: string | null;
  onNodeLabelChange: (nodeId: string, label: string) => void;
  onNodeDelete: (nodeId: string) => void;
  onEdgeDelete: (edgeId: string) => void;
  canEdit: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  "start": "Événement de début",
  "end": "Événement de fin",
  "task": "Tâche",
  "gateway-exclusive": "Passerelle exclusive (XOR)",
  "gateway-parallel": "Passerelle parallèle (AND)",
  "gateway-inclusive": "Passerelle inclusive (OR)",
  "intermediate-timer": "Événement intermédiaire Timer",
  "intermediate-message": "Événement intermédiaire Message",
  "subprocess": "Sous-processus",
  "annotation": "Annotation",
};

export default function BpmnPropertiesPanel({
  nodes, edges, selectedNodeId,
  onNodeLabelChange, onNodeDelete, onEdgeDelete, canEdit,
}: BpmnPropertiesPanelProps) {
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const getLabel = (id: string) => nodes.find(n => n.id === id)?.label ?? id;

  return (
    <div className="space-y-4">
      {/* Properties */}
      {selectedNode && canEdit ? (
        <div className="space-y-3 p-3 border rounded-lg bg-card">
          <h3 className="font-semibold text-sm">Propriétés</h3>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <p className="text-sm">{TYPE_LABELS[selectedNode.type] ?? selectedNode.type}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Libellé</Label>
            <Input
              value={selectedNode.label}
              onChange={(e) => onNodeLabelChange(selectedNode.id, e.target.value)}
              className="h-8 text-sm"
            />
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>X: {Math.round(selectedNode.x)}</span>
            <span>Y: {Math.round(selectedNode.y)}</span>
          </div>
          <Button size="sm" variant="destructive" className="w-full" onClick={() => onNodeDelete(selectedNode.id)}>
            <Trash2 className="h-3 w-3 mr-1" /> Supprimer
          </Button>
        </div>
      ) : (
        <div className="p-3 border rounded-lg bg-card text-sm text-muted-foreground">
          {canEdit ? "Cliquez sur un élément pour modifier ses propriétés" : "Lecture seule"}
        </div>
      )}

      {/* Elements summary */}
      <div className="p-3 border rounded-lg bg-card space-y-2">
        <h3 className="font-semibold text-sm">Éléments ({nodes.length})</h3>
        <div className="max-h-40 overflow-y-auto space-y-1">
          {nodes.map(n => (
            <div key={n.id} className={`flex items-center justify-between text-xs p-1.5 rounded ${n.id === selectedNodeId ? 'bg-primary/10' : 'hover:bg-muted'}`}>
              <div className="flex items-center gap-1.5 truncate">
                <Badge variant="outline" className="text-[10px] px-1 py-0">{TYPE_LABELS[n.type]?.split(" ")[0] ?? n.type}</Badge>
                <span className="truncate">{n.label}</span>
              </div>
              {canEdit && (
                <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => onNodeDelete(n.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Edges summary */}
      <div className="p-3 border rounded-lg bg-card space-y-2">
        <h3 className="font-semibold text-sm">Flux ({edges.length})</h3>
        <div className="max-h-40 overflow-y-auto space-y-1">
          {edges.map(e => (
            <div key={e.id} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted">
              <div className="flex items-center gap-1 truncate">
                <span className="truncate">{getLabel(e.from)}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="truncate">{getLabel(e.to)}</span>
                {e.label && <Badge variant="secondary" className="text-[10px] px-1 py-0">{e.label}</Badge>}
              </div>
              {canEdit && (
                <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => onEdgeDelete(e.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          ))}
          {edges.length === 0 && <p className="text-xs text-muted-foreground">Aucun flux</p>}
        </div>
      </div>
    </div>
  );
}
