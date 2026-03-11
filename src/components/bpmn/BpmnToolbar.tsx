import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { 
  Play, Square, CheckSquare, Diamond, Clock, Mail, Layers, StickyNote,
  MousePointer, Link2, Trash2, ZoomIn, ZoomOut, Maximize, Save, Undo2, Wand2
} from "lucide-react";
import { BpmnNodeType, NODE_CATEGORIES } from "./types";

const ICON_MAP: Record<string, React.ReactNode> = {
  "play": <Play className="h-4 w-4" />,
  "square": <Square className="h-4 w-4" />,
  "clock": <Clock className="h-4 w-4" />,
  "mail": <Mail className="h-4 w-4" />,
  "check-square": <CheckSquare className="h-4 w-4" />,
  "layers": <Layers className="h-4 w-4" />,
  "diamond": <Diamond className="h-4 w-4" />,
  "sticky-note": <StickyNote className="h-4 w-4" />,
};

type ToolMode = "select" | "connect" | "delete";

interface BpmnToolbarProps {
  mode: ToolMode;
  onModeChange: (mode: ToolMode) => void;
  onAddNode: (type: BpmnNodeType) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onSave: () => void;
  onUndo: () => void;
  onGenerate?: () => void;
  saving: boolean;
  generating?: boolean;
  canEdit: boolean;
}

export default function BpmnToolbar({
  mode, onModeChange, onAddNode,
  onZoomIn, onZoomOut, onFitView,
  onSave, onUndo, onGenerate, saving, generating, canEdit,
}: BpmnToolbarProps) {
  if (!canEdit) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1 p-2 border rounded-lg bg-card flex-wrap">
        {/* Mode tools */}
        <ToolBtn icon={<MousePointer className="h-4 w-4" />} label="Sélection" active={mode === "select"} onClick={() => onModeChange("select")} />
        <ToolBtn icon={<Link2 className="h-4 w-4" />} label="Connecter" active={mode === "connect"} onClick={() => onModeChange("connect")} />
        <ToolBtn icon={<Trash2 className="h-4 w-4" />} label="Supprimer" active={mode === "delete"} onClick={() => onModeChange("delete")} />

        <Separator orientation="vertical" className="h-8 mx-1" />

        {/* Node palette */}
        {NODE_CATEGORIES.map((cat) => (
          <div key={cat.label} className="flex items-center gap-0.5">
            {cat.items.map((item) => (
              <ToolBtn
                key={item.type}
                icon={ICON_MAP[item.icon]}
                label={item.label}
                onClick={() => onAddNode(item.type)}
              />
            ))}
            <Separator orientation="vertical" className="h-8 mx-1" />
          </div>
        ))}

        {/* Zoom & actions */}
        <ToolBtn icon={<ZoomIn className="h-4 w-4" />} label="Zoom +" onClick={onZoomIn} />
        <ToolBtn icon={<ZoomOut className="h-4 w-4" />} label="Zoom −" onClick={onZoomOut} />
        <ToolBtn icon={<Maximize className="h-4 w-4" />} label="Ajuster la vue" onClick={onFitView} />

        <Separator orientation="vertical" className="h-8 mx-1" />

        <ToolBtn icon={<Undo2 className="h-4 w-4" />} label="Annuler" onClick={onUndo} />
        {onGenerate && (
          <Button size="sm" variant="outline" onClick={onGenerate} disabled={generating} className="ml-1">
            <Wand2 className="h-4 w-4 mr-1" />
            {generating ? "Génération..." : "Générer"}
          </Button>
        )}
        <Button size="sm" onClick={onSave} disabled={saving} className="ml-1">
          <Save className="h-4 w-4 mr-1" />
          {saving ? "..." : "Sauvegarder"}
        </Button>
      </div>
    </TooltipProvider>
  );
}

function ToolBtn({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant={active ? "default" : "ghost"}
          className="h-8 w-8"
          onClick={onClick}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom"><p>{label}</p></TooltipContent>
    </Tooltip>
  );
}
