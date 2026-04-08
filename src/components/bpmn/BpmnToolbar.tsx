import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Play, Square, CheckSquare, Diamond, Clock, Mail, Layers, StickyNote,
  MousePointer, Link2, Trash2, ZoomIn, ZoomOut, Maximize, Save, Undo2, Wand2,
  Download, FileImage, FileText, ChevronLeft, ChevronRight, Navigation
} from "lucide-react";
import { BpmnNodeType, BpmnNode, NODE_CATEGORIES } from "./types";

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
  onExport?: (format: "png" | "pdf") => void;
  saving: boolean;
  generating?: boolean;
  canEdit: boolean;
  // Navigation props
  taskNodes?: BpmnNode[];
  focusedNodeId?: string | null;
  onNavPrev?: () => void;
  onNavNext?: () => void;
  onNavJump?: (nodeId: string) => void;
  navIndex?: number;
  navTotal?: number;
}

export default function BpmnToolbar({
  mode, onModeChange, onAddNode,
  onZoomIn, onZoomOut, onFitView,
  onSave, onUndo, onGenerate, onExport, saving, generating, canEdit,
  taskNodes, focusedNodeId, onNavPrev, onNavNext, onNavJump, navIndex, navTotal,
}: BpmnToolbarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1 p-2 border rounded-lg bg-card flex-wrap">
        {/* Mode tools */}
        {canEdit && (
          <>
            <ToolBtn icon={<MousePointer className="h-4 w-4" />} label="Sélection" active={mode === "select"} onClick={() => onModeChange("select")} />
            <ToolBtn icon={<Link2 className="h-4 w-4" />} label="Connecter" active={mode === "connect"} onClick={() => onModeChange("connect")} />
            <ToolBtn icon={<Trash2 className="h-4 w-4" />} label="Supprimer" active={mode === "delete"} onClick={() => onModeChange("delete")} />
            <Separator orientation="vertical" className="h-8 mx-1" />
          </>
        )}

        {/* Node palette */}
        {canEdit && NODE_CATEGORIES.map((cat) => (
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

        {/* Navigation controls */}
        {taskNodes && taskNodes.length > 0 && onNavPrev && onNavNext && onNavJump && (
          <>
            <div className="flex items-center gap-1">
              <ToolBtn icon={<ChevronLeft className="h-4 w-4" />} label="Précédente" onClick={onNavPrev} />
              
              <Select value={focusedNodeId || ""} onValueChange={(val) => onNavJump(val)}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue placeholder="Naviguer..." />
                </SelectTrigger>
                <SelectContent>
                  {taskNodes.map((node, idx) => (
                    <SelectItem key={node.id} value={node.id} className="text-xs">
                      {idx + 1}. {node.label.length > 25 ? node.label.slice(0, 25) + "…" : node.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <ToolBtn icon={<ChevronRight className="h-4 w-4" />} label="Suivante" onClick={onNavNext} />
              
              {navIndex !== undefined && navTotal !== undefined && (
                <Badge variant="outline" className="text-xs ml-1">
                  <Navigation className="h-3 w-3 mr-1" />
                  {navIndex + 1}/{navTotal}
                </Badge>
              )}
            </div>
            <Separator orientation="vertical" className="h-8 mx-1" />
          </>
        )}

        {/* Export dropdown */}
        {onExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="ml-1">
                <Download className="h-4 w-4 mr-1" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport("png")}>
                <FileImage className="h-4 w-4 mr-2" />
                Exporter en PNG
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport("pdf")}>
                <FileText className="h-4 w-4 mr-2" />
                Exporter en PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {canEdit && (
          <>
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
          </>
        )}
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
