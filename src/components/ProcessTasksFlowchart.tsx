import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, User } from "lucide-react";
import { FlowchartNodeEditor } from "./FlowchartNodeEditor";
import { cn } from "@/lib/utils";

type TaskFlowType = "sequentiel" | "conditionnel" | "parallele" | "inclusif";
type ElementType = "finalite" | "donnee_entree" | "donnee_sortie" | "activite" | "interaction" | "partie_prenante" | "ressource";

interface ProcessTask {
  id: string; process_id: string; code: string; description: string;
  type_flux: TaskFlowType; condition: string | null; parent_code: string | null;
  responsable_id: string | null; ordre: number; entrees: string | null;
  sorties: string | null; documents: string[] | null;
}
interface ProcessElement { id: string; code: string; description: string; type: ElementType; ordre: number; }
interface Acteur { id: string; fonction: string | null; }

interface Props {
  processId: string; canEdit: boolean; canDelete: boolean;
  processElements: ProcessElement[];
  onAddElement: (type: ElementType, description: string) => Promise<void>;
}

// ─── Layout types ───
interface LayoutNode {
  task: ProcessTask; x: number; y: number; w: number; h: number;
}
interface LayoutGateway {
  code: string; type: TaskFlowType; label: string; x: number; y: number; s: number; isMerge?: boolean;
}
interface LayoutEdge {
  fromX: number; fromY: number; toX: number; toY: number; label?: string; dashed?: boolean;
  isDefault?: boolean; flowType?: TaskFlowType;
}

// ─── Constants ───
const CARD_W = 420, CARD_H = 140, GW_S = 44;
const V_GAP = 100, H_GAP = 60;
const CIRCLE_R = 22;
const IO_PILL_H = 22, IO_COL_W = 100;
const PROCESS_IO_BOX_W = 280, PROCESS_IO_BOX_H = 40;

const FLOW_COLORS: Record<TaskFlowType, string> = {
  sequentiel: "hsl(var(--primary))",
  conditionnel: "hsl(38 92% 50%)",
  parallele: "hsl(142 71% 45%)",
  inclusif: "hsl(280 60% 55%)",
};

const ACTOR_PALETTE = [
  "hsl(215 70% 50%)", "hsl(160 60% 42%)", "hsl(340 65% 50%)", "hsl(30 80% 50%)",
  "hsl(260 55% 55%)", "hsl(190 70% 42%)", "hsl(10 70% 50%)", "hsl(100 50% 40%)",
];

const BRANCH_PREFIX: Record<string, string> = {
  conditionnel: "a", parallele: "p", inclusif: "o",
};

// ─── Vertical Auto-layout engine ───
function computeLayout(tasks: ProcessTask[], processElements: ProcessElement[]) {
  const sorted = [...tasks].sort((a, b) => a.ordre - b.ordre);
  const roots = sorted.filter(t => !t.parent_code);
  const branchMap = new Map<string, ProcessTask[]>();
  for (const t of sorted) {
    if (t.parent_code) {
      let arr = branchMap.get(t.parent_code);
      if (!arr) { arr = []; branchMap.set(t.parent_code, arr); }
      arr.push(t);
    }
  }

  const nodes: LayoutNode[] = [];
  const gateways: LayoutGateway[] = [];
  const edges: LayoutEdge[] = [];

  const centerX = 500;

  // Process-level I/O
  const processEntrees = processElements.filter(e => e.type === "donnee_entree");
  const processSorties = processElements.filter(e => e.type === "donnee_sortie");

  let curY = 80;

  // Process inputs box at top
  const processInputsY = curY;
  if (processEntrees.length > 0) {
    curY += PROCESS_IO_BOX_H + 40;
  }

  // Start circle
  const startCx = centerX, startCy = curY;
  curY += CIRCLE_R * 2 + V_GAP;

  function countLeaves(code: string): number {
    const ch = branchMap.get(code);
    if (!ch || ch.length === 0) return 1;
    return ch.reduce((s, c) => s + countLeaves(c.code), 0);
  }

  function layoutSequence(taskList: ProcessTask[], startY: number, cx: number): { lastY: number; lastCx: number; connectFromX: number; connectFromY: number } {
    let y = startY;
    let prevBottom = startY;
    let prevCx = cx;

    for (let i = 0; i < taskList.length; i++) {
      const task = taskList[i];
      const branches = branchMap.get(task.code);

      if (branches && branches.length > 0) {
        // Gateway group — vertical split → horizontal branches
        const gwY = y;
        const gwCx = cx;
        const leafCounts = branches.map(b => countLeaves(b.code));
        const totalLeaves = leafCounts.reduce((a, b) => a + b, 0);
        const totalW = Math.max((totalLeaves - 1) * (CARD_W + H_GAP), (branches.length - 1) * (CARD_W + H_GAP));

        gateways.push({ code: task.code, type: task.type_flux, label: task.description, x: gwCx - GW_S / 2, y: gwY, s: GW_S });

        if (i > 0) {
          edges.push({ fromX: prevCx, fromY: prevBottom, toX: gwCx, toY: gwY });
        }

        const branchStartY = gwY + GW_S + V_GAP;
        let accX = gwCx - totalW / 2;
        let maxEndY = branchStartY;
        const branchEnds: { x: number; y: number }[] = [];

        for (let bi = 0; bi < branches.length; bi++) {
          const span = totalLeaves > 0 ? (leafCounts[bi] / totalLeaves) * totalW : 0;
          const bCx = accX + span / 2;
          accX += span;

          const branch = branches[bi];
          // Detect default path for XOR: branch without condition
          const hasCondition = !!branch.condition;
          const isDefaultPath = task.type_flux === "conditionnel" && !hasCondition;
          const edgeLabel = isDefaultPath ? "Sinon" : (branch.condition || undefined);

          const nestedBranches = branchMap.get(branch.code);
          if (nestedBranches && nestedBranches.length > 0) {
            const res = layoutSequence([branch], branchStartY, bCx);
            edges.push({ fromX: gwCx, fromY: gwY + GW_S, toX: bCx, toY: branchStartY, label: edgeLabel, isDefault: isDefaultPath, flowType: task.type_flux });
            branchEnds.push({ x: res.connectFromX, y: res.connectFromY });
            maxEndY = Math.max(maxEndY, res.lastY);
          } else {
            const nx = bCx - CARD_W / 2;
            nodes.push({ task: branch, x: nx, y: branchStartY, w: CARD_W, h: CARD_H });
            edges.push({ fromX: gwCx, fromY: gwY + GW_S, toX: bCx, toY: branchStartY, label: edgeLabel, isDefault: isDefaultPath, flowType: task.type_flux });
            branchEnds.push({ x: bCx, y: branchStartY + CARD_H });
            maxEndY = Math.max(maxEndY, branchStartY + CARD_H);
          }
        }

        // Merge gateway
        const mergeY = maxEndY + V_GAP;
        gateways.push({ code: task.code + "_merge", type: task.type_flux, label: "", x: gwCx - GW_S / 2, y: mergeY, s: GW_S, isMerge: true });
        for (const be of branchEnds) {
          edges.push({ fromX: be.x, fromY: be.y, toX: gwCx, toY: mergeY });
        }

        prevBottom = mergeY + GW_S;
        prevCx = gwCx;
        y = prevBottom + V_GAP;
      } else {
        // Simple task node — centered
        const nx = cx - CARD_W / 2;
        nodes.push({ task, x: nx, y, w: CARD_W, h: CARD_H });
        if (i > 0) {
          edges.push({ fromX: prevCx, fromY: prevBottom, toX: cx, toY: y });
        }
        prevBottom = y + CARD_H;
        prevCx = cx;
        y = prevBottom + V_GAP;
      }
    }

    return { lastY: y, lastCx: prevCx, connectFromX: prevCx, connectFromY: prevBottom };
  }

  const res = layoutSequence(roots, curY, centerX);

  // Connect start circle to first element
  if (roots.length > 0) {
    const firstBranches = branchMap.get(roots[0].code);
    if (firstBranches && firstBranches.length > 0) {
      edges.push({ fromX: startCx, fromY: startCy + CIRCLE_R, toX: centerX, toY: curY });
    } else if (nodes.length > 0) {
      edges.push({ fromX: startCx, fromY: startCy + CIRCLE_R, toX: centerX, toY: nodes[0].y });
    }
  }

  // End circle
  const endCx = centerX;
  const endCy = res.connectFromY + V_GAP + CIRCLE_R;
  edges.push({ fromX: res.connectFromX, fromY: res.connectFromY, toX: endCx, toY: endCy - CIRCLE_R });

  // Process outputs box at bottom
  const processOutputsY = endCy + CIRCLE_R + 40;

  return { nodes, gateways, edges, startCx, startCy, endCx, endCy, processInputsY, processOutputsY, processEntrees, processSorties };
}

// ─── Data flow links between consecutive tasks ───
interface DataFlowLink {
  fromNodeId: string; toNodeId: string; code: string;
  fromX: number; fromY: number; toX: number; toY: number;
}

function computeDataFlowLinks(nodes: LayoutNode[], processElements: ProcessElement[]): DataFlowLink[] {
  const links: DataFlowLink[] = [];
  // For each pair of consecutive nodes (by ordre), check if output codes of prev appear in input codes of next
  const sorted = [...nodes].sort((a, b) => a.task.ordre - b.task.ordre);

  for (let i = 0; i < sorted.length - 1; i++) {
    const prev = sorted[i];
    const next = sorted[i + 1];
    // Only link sequential (non-branched or same level)
    if (prev.task.parent_code !== next.task.parent_code) continue;

    const prevSorties = prev.task.sorties ? prev.task.sorties.split(",").map(s => s.trim()).filter(Boolean) : [];
    const nextEntrees = next.task.entrees ? next.task.entrees.split(",").map(s => s.trim()).filter(Boolean) : [];

    for (const code of prevSorties) {
      if (nextEntrees.includes(code)) {
        // Right side of prev → left side of next
        links.push({
          fromNodeId: prev.task.id,
          toNodeId: next.task.id,
          code,
          fromX: prev.x + prev.w - IO_COL_W / 2,
          fromY: prev.y + prev.h,
          toX: next.x + IO_COL_W / 2,
          toY: next.y,
        });
      }
    }
  }
  return links;
}

// ─── SVG Components ───

function FlowchartEdge({ edge }: { edge: LayoutEdge }) {
  const dx = edge.toX - edge.fromX;
  const dy = edge.toY - edge.fromY;
  const midY = edge.fromY + dy * 0.5;

  // Orthogonal path — vertical first, then horizontal
  const path = Math.abs(dx) < 2
    ? `M${edge.fromX},${edge.fromY} L${edge.toX},${edge.toY}`
    : `M${edge.fromX},${edge.fromY} L${edge.fromX},${midY} L${edge.toX},${midY} L${edge.toX},${edge.toY}`;

  return (
    <g>
      <path d={path} fill="none" stroke="hsl(var(--border))" strokeWidth={2} markerEnd="url(#arrowhead)"
        strokeDasharray={edge.dashed ? "6 4" : undefined} />
      {edge.label && (
        <text x={Math.min(edge.fromX, edge.toX) - 8} y={midY} textAnchor="end"
          className="fill-muted-foreground text-[10px]" fontFamily="inherit">
          {edge.label}
        </text>
      )}
    </g>
  );
}

function GatewayShape({ gw }: { gw: LayoutGateway }) {
  const cx = gw.x + gw.s / 2;
  const cy = gw.y + gw.s / 2;
  const half = gw.s / 2;
  const color = FLOW_COLORS[gw.type] || FLOW_COLORS.sequentiel;
  const symbol = gw.type === "parallele" ? "+" : gw.type === "inclusif" ? "○" : "×";

  return (
    <g>
      <polygon points={`${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`}
        fill="hsl(var(--card))" stroke={color} strokeWidth={2.5} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={gw.s * 0.45} fontWeight="bold" fontFamily="inherit">
        {symbol}
      </text>
      {!gw.isMerge && gw.label && (
        <text x={cx + half + 10} y={cy + 1} textAnchor="start" dominantBaseline="middle"
          className="fill-foreground text-[11px] font-medium" fontFamily="inherit">
          {gw.label.length > 40 ? gw.label.slice(0, 40) + "…" : gw.label}
        </text>
      )}
    </g>
  );
}

// ─── Main Component ───

export function ProcessTasksFlowchart({ processId, canEdit, canDelete, processElements, onAddElement }: Props) {
  const [tasks, setTasks] = useState<ProcessTask[]>([]);
  const [acteurs, setActeurs] = useState<Acteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [fullscreen, setFullscreen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTask, setEditorTask] = useState<any>(null);
  const [editorIsBranch, setEditorIsBranch] = useState(false);
  const [branchParentCode, setBranchParentCode] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase.from("process_tasks").select("*").eq("process_id", processId).order("ordre", { ascending: true });
    if (data) setTasks(data as unknown as ProcessTask[]);
    setLoading(false);
  }, [processId]);

  const fetchActeurs = useCallback(async () => {
    const { data } = await supabase.from("acteurs").select("id, fonction").eq("actif", true);
    if (data) setActeurs(data);
  }, []);

  useEffect(() => { fetchTasks(); fetchActeurs(); }, [fetchTasks, fetchActeurs]);

  const layout = useMemo(() => tasks.length > 0 ? computeLayout(tasks, processElements) : null, [tasks, processElements]);
  const dataFlowLinks = useMemo(() => layout ? computeDataFlowLinks(layout.nodes, processElements) : [], [layout, processElements]);

  // Actor color map
  const actorColorMap = useMemo(() => {
    const map = new Map<string, string>();
    const uniqueIds = [...new Set(tasks.map(t => t.responsable_id).filter(Boolean))] as string[];
    uniqueIds.forEach((id, i) => map.set(id, ACTOR_PALETTE[i % ACTOR_PALETTE.length]));
    return map;
  }, [tasks]);

  // ─── CRUD ───
  const getNextRootCode = () => {
    const rootTasks = tasks.filter(t => !t.parent_code);
    const maxNum = rootTasks.reduce((max, t) => { const n = parseInt(t.code, 10); return isNaN(n) ? max : Math.max(max, n); }, 0);
    return String(maxNum + 1);
  };

  const getNextBranchCode = (parentCode: string, parentFlux: TaskFlowType) => {
    const prefix = BRANCH_PREFIX[parentFlux] || "a";
    const branches = tasks.filter(t => t.parent_code === parentCode);
    const maxNum = branches.reduce((max, t) => { const match = t.code.match(new RegExp(`\\.${prefix}(\\d+)$`)); return match ? Math.max(max, parseInt(match[1], 10)) : max; }, 0);
    return `${parentCode}.${prefix}${maxNum + 1}`;
  };

  const getMaxOrdre = (parentCode?: string) => {
    if (parentCode) {
      const branches = tasks.filter(t => t.parent_code === parentCode);
      const parent = tasks.find(t => t.code === parentCode);
      if (branches.length === 0) return (parent?.ordre || 0) + 1;
      return Math.max(...branches.map(t => t.ordre)) + 1;
    }
    return tasks.length > 0 ? Math.max(...tasks.map(t => t.ordre)) + 1 : 1;
  };

  const openAddDialog = (parentCode?: string) => {
    setEditorTask(null);
    setEditorIsBranch(!!parentCode);
    setBranchParentCode(parentCode || null);
    setEditorOpen(true);
  };

  const openEditDialog = (task: ProcessTask) => {
    setEditorTask(task);
    setEditorIsBranch(false);
    setBranchParentCode(null);
    setSelectedTaskId(task.id);
    setEditorOpen(true);
  };

  const handleSave = async (data: any) => {
    if (editorTask?.id) {
      const { error } = await supabase.from("process_tasks").update({
        description: data.description, type_flux: data.type_flux,
        condition: data.condition, responsable_id: data.responsable_id,
        entrees: data.entrees, sorties: data.sorties,
      }).eq("id", editorTask.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Activité modifiée");
    } else {
      const parentCode = branchParentCode;
      const parent = parentCode ? tasks.find(t => t.code === parentCode) : null;
      const code = parentCode && parent ? getNextBranchCode(parentCode, parent.type_flux) : getNextRootCode();
      const ordre = getMaxOrdre(parentCode || undefined);
      const { error } = await supabase.from("process_tasks").insert({
        process_id: processId, code, description: data.description,
        type_flux: parentCode ? "sequentiel" : data.type_flux,
        condition: data.condition, parent_code: parentCode || null,
        responsable_id: data.responsable_id, ordre, entrees: data.entrees, sorties: data.sorties,
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Activité ajoutée");
    }
    setEditorOpen(false);
    setSelectedTaskId(null);
    fetchTasks();
  };

  const handleDelete = async () => {
    if (!editorTask?.id) return;
    if (!confirm("Supprimer cette activité et ses branches ?")) return;
    const toDelete = tasks.filter(t => t.id === editorTask.id || t.parent_code === editorTask.code);
    for (const t of toDelete) await supabase.from("process_tasks").delete().eq("id", t.id);
    toast.success("Activité supprimée");
    setEditorOpen(false);
    setSelectedTaskId(null);
    fetchTasks();
  };

  // ─── Pan / Zoom ───
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom(z => Math.max(0.15, Math.min(2.5, z + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && ((e.target as SVGElement).tagName === "svg" || (e.target as SVGElement).closest("[data-bg]"))) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const resetView = () => { setZoom(0.8); setPan({ x: 0, y: 0 }); };

  const acteurName = (id: string | null) => {
    if (!id) return null;
    const a = acteurs.find(a => a.id === id);
    return a?.fonction || null;
  };

  const parseCodes = (v: string | null) => v ? v.split(",").map(s => s.trim()).filter(Boolean) : [];
  const resolveDesc = (code: string) => {
    const el = processElements.find(e => e.code === code);
    return el?.description || code;
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;

  // ─── Compute SVG viewBox ───
  let minX = 0, minY = 0, maxX = 1000, maxY = 800;
  if (layout) {
    const allX = [
      ...layout.nodes.map(n => n.x), ...layout.nodes.map(n => n.x + n.w),
      ...layout.gateways.map(g => g.x), ...layout.gateways.map(g => g.x + g.s),
      layout.startCx + CIRCLE_R, layout.endCx + CIRCLE_R,
    ];
    const allY = [
      ...layout.nodes.map(n => n.y), ...layout.nodes.map(n => n.y + n.h),
      ...layout.gateways.map(g => g.y), ...layout.gateways.map(g => g.y + g.s),
      layout.startCy + CIRCLE_R, layout.endCy + CIRCLE_R,
      layout.processOutputsY + PROCESS_IO_BOX_H,
    ];
    minX = Math.min(...allX) - 80;
    minY = Math.min(...allY) - 80;
    maxX = Math.max(...allX) + 80;
    maxY = Math.max(...allY) + 80;
  }
  const vbW = maxX - minX;
  const vbH = maxY - minY;

  const canvas = (
    <div className={cn("relative bg-muted/20 rounded-xl border border-border/50 overflow-hidden", fullscreen ? "w-full h-full" : "w-full")}
      style={{ height: fullscreen ? "100%" : "min(75vh, 800px)" }}>
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
        {canEdit && (
          <Button size="sm" variant="default" onClick={() => openAddDialog()} className="gap-1.5 shadow-md">
            <Plus className="h-3.5 w-3.5" /> Activité
          </Button>
        )}
      </div>
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1">
        <Button size="icon" variant="outline" className="h-8 w-8 bg-card/80 backdrop-blur-sm shadow-sm" onClick={() => setZoom(z => Math.min(2.5, z + 0.2))}><ZoomIn className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="outline" className="h-8 w-8 bg-card/80 backdrop-blur-sm shadow-sm" onClick={() => setZoom(z => Math.max(0.15, z - 0.2))}><ZoomOut className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="outline" className="h-8 w-8 bg-card/80 backdrop-blur-sm shadow-sm" onClick={resetView}><RotateCcw className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="outline" className="h-8 w-8 bg-card/80 backdrop-blur-sm shadow-sm" onClick={() => setFullscreen(f => !f)}>
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 z-20 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm rounded px-2 py-1 shadow-sm">
        {Math.round(zoom * 100)}%
      </div>

      {/* Actor legend */}
      {actorColorMap.size > 0 && (
        <div className="absolute bottom-3 left-3 z-20 flex flex-wrap gap-2 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-border/30 max-w-[400px]">
          {[...actorColorMap.entries()].map(([id, color]) => (
            <div key={id} className="flex items-center gap-1.5 text-[10px]">
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-foreground truncate max-w-[100px]">{acteurName(id) || "—"}</span>
            </div>
          ))}
        </div>
      )}

      <svg ref={svgRef} width="100%" height="100%" className="cursor-grab active:cursor-grabbing select-none"
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--border))" />
          </marker>
          <marker id="arrowhead-data" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="hsl(30 80% 50%)" />
          </marker>
          <pattern id="flowgrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.5" fill="hsl(var(--border) / 0.3)" />
          </pattern>
        </defs>

        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          <rect data-bg="true" x={minX - 500} y={minY - 500} width={vbW + 1000} height={vbH + 1000}
            fill="url(#flowgrid)" />

          {layout && (
            <>
              {/* Process-level inputs */}
              {layout.processEntrees.length > 0 && (
                <foreignObject x={layout.startCx - PROCESS_IO_BOX_W / 2} y={layout.processInputsY} width={PROCESS_IO_BOX_W} height={PROCESS_IO_BOX_H + layout.processEntrees.length * 18}>
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-center">
                    <div className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-1">Entrées du processus</div>
                    <div className="flex flex-wrap justify-center gap-1">
                      {layout.processEntrees.map(e => (
                        <span key={e.id} className="text-[9px] bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded-full">{e.description}</span>
                      ))}
                    </div>
                  </div>
                </foreignObject>
              )}

              {/* Edges */}
              {layout.edges.map((e, i) => <FlowchartEdge key={i} edge={e} />)}

              {/* Data flow links (dotted orange lines) */}
              {dataFlowLinks.map((link, i) => (
                <g key={`df-${i}`}>
                  <path
                    d={`M${link.fromX},${link.fromY} C${link.fromX},${link.fromY + 30} ${link.toX},${link.toY - 30} ${link.toX},${link.toY}`}
                    fill="none" stroke="hsl(30 80% 50%)" strokeWidth={1.5} strokeDasharray="5 3"
                    markerEnd="url(#arrowhead-data)" opacity={0.7}
                  />
                  <text x={(link.fromX + link.toX) / 2 + 12} y={(link.fromY + link.toY) / 2}
                    className="text-[8px]" fill="hsl(30 80% 50%)" fontFamily="inherit" fontStyle="italic">
                    {resolveDesc(link.code)}
                  </text>
                </g>
              ))}

              {/* Start circle */}
              <circle cx={layout.startCx} cy={layout.startCy} r={CIRCLE_R} fill="hsl(var(--primary))" stroke="none" />
              <text x={layout.startCx} y={layout.startCy + 1} textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--primary-foreground))" fontSize="10" fontWeight="600" fontFamily="inherit">Début</text>

              {/* Gateways */}
              {layout.gateways.map((gw, i) => <GatewayShape key={i} gw={gw} />)}

              {/* Task nodes — 3-column enriched cards */}
              {layout.nodes.map(node => {
                const t = node.task;
                const isSelected = selectedTaskId === t.id;
                const isHovered = hoveredNodeId === t.id;
                const resp = acteurName(t.responsable_id);
                const actorColor = t.responsable_id ? actorColorMap.get(t.responsable_id) : undefined;
                const entrees = parseCodes(t.entrees);
                const sorties = parseCodes(t.sorties);
                const flowColor = FLOW_COLORS[t.type_flux] || FLOW_COLORS.sequentiel;

                return (
                  <g key={t.id}>
                    <foreignObject x={node.x} y={node.y} width={node.w} height={node.h}
                      className="overflow-visible">
                      <div
                        className={cn(
                          "w-full h-full rounded-xl border-2 bg-card/95 backdrop-blur-sm flex cursor-pointer transition-all duration-200 overflow-hidden",
                          isSelected ? "shadow-lg ring-2 ring-primary/30 scale-[1.02]" : isHovered ? "shadow-md scale-[1.01]" : "shadow-sm",
                        )}
                        style={{ borderColor: isSelected ? "hsl(var(--primary))" : flowColor }}
                        onClick={() => canEdit ? openEditDialog(t) : undefined}
                        onMouseEnter={() => setHoveredNodeId(t.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                      >
                        {/* Left column — Inputs */}
                        <div className="w-[100px] shrink-0 bg-blue-50/50 dark:bg-blue-950/20 border-r border-blue-200/30 dark:border-blue-800/30 p-1.5 flex flex-col gap-1 overflow-y-auto">
                          <span className="text-[8px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Entrées</span>
                          {entrees.length > 0 ? entrees.map(code => (
                            <div key={code} className="text-[9px] bg-blue-100/80 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded leading-tight truncate" title={resolveDesc(code)}>
                              {resolveDesc(code)}
                            </div>
                          )) : (
                            <span className="text-[8px] text-muted-foreground italic">—</span>
                          )}
                        </div>

                        {/* Center column — Code + Description + Actor */}
                        <div className="flex-1 flex flex-col min-w-0">
                          <div className="flex-1 p-2.5 flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary shrink-0">{t.code}</span>
                              {t.condition && (
                                <span className="text-[9px] text-muted-foreground italic truncate">({t.condition})</span>
                              )}
                            </div>
                            <p className="text-[11px] leading-snug text-foreground font-medium line-clamp-3">{t.description}</p>
                          </div>
                          {/* Actor banner */}
                          <div
                            className="h-7 flex items-center gap-1.5 px-2.5 shrink-0"
                            style={{
                              backgroundColor: actorColor ? actorColor : "hsl(var(--muted))",
                              opacity: actorColor ? 0.9 : 0.5,
                            }}
                          >
                            <User className="h-3 w-3 text-white" />
                            <span className="text-[10px] font-medium text-white truncate">
                              {resp || "Non assigné"}
                            </span>
                          </div>
                        </div>

                        {/* Right column — Outputs */}
                        <div className="w-[100px] shrink-0 bg-green-50/50 dark:bg-green-950/20 border-l border-green-200/30 dark:border-green-800/30 p-1.5 flex flex-col gap-1 overflow-y-auto">
                          <span className="text-[8px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">Sorties</span>
                          {sorties.length > 0 ? sorties.map(code => (
                            <div key={code} className="text-[9px] bg-green-100/80 dark:bg-green-900/40 text-green-800 dark:text-green-200 px-1.5 py-0.5 rounded leading-tight truncate" title={resolveDesc(code)}>
                              {resolveDesc(code)}
                            </div>
                          )) : (
                            <span className="text-[8px] text-muted-foreground italic">—</span>
                          )}
                        </div>

                        {/* Add branch button */}
                        {canEdit && !t.parent_code && ["conditionnel", "parallele", "inclusif"].includes(t.type_flux) && isHovered && (
                          <button
                            className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md text-xs hover:scale-110 transition-transform z-10"
                            onClick={(e) => { e.stopPropagation(); openAddDialog(t.code); }}
                            title="Ajouter une branche"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </foreignObject>
                  </g>
                );
              })}

              {/* End circle */}
              <circle cx={layout.endCx} cy={layout.endCy} r={CIRCLE_R} fill="none" stroke="hsl(var(--primary))" strokeWidth={3} />
              <circle cx={layout.endCx} cy={layout.endCy} r={CIRCLE_R - 5} fill="hsl(var(--primary))" />
              <text x={layout.endCx} y={layout.endCy + 1} textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--primary-foreground))" fontSize="10" fontWeight="600" fontFamily="inherit">Fin</text>

              {/* Process-level outputs */}
              {layout.processSorties.length > 0 && (
                <foreignObject x={layout.endCx - PROCESS_IO_BOX_W / 2} y={layout.processOutputsY} width={PROCESS_IO_BOX_W} height={PROCESS_IO_BOX_H + layout.processSorties.length * 18}>
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-2 text-center">
                    <div className="text-[10px] font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider mb-1">Sorties du processus</div>
                    <div className="flex flex-wrap justify-center gap-1">
                      {layout.processSorties.map(e => (
                        <span key={e.id} className="text-[9px] bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 px-1.5 py-0.5 rounded-full">{e.description}</span>
                      ))}
                    </div>
                  </div>
                </foreignObject>
              )}
            </>
          )}

          {/* Empty state */}
          {!layout && (
            <text x="500" y="400" textAnchor="middle" className="fill-muted-foreground text-sm" fontFamily="inherit">
              Aucune activité. Cliquez sur "+ Activité" pour commencer.
            </text>
          )}
        </g>
      </svg>

      {/* Editor Sheet */}
      <FlowchartNodeEditor
        open={editorOpen}
        onOpenChange={(open) => { setEditorOpen(open); if (!open) setSelectedTaskId(null); }}
        task={editorTask}
        isBranch={editorIsBranch}
        acteurs={acteurs}
        processElements={processElements}
        onSave={handleSave}
        onDelete={editorTask?.id ? handleDelete : undefined}
        onAddElement={onAddElement}
        canDelete={canDelete}
      />
    </div>
  );

  if (fullscreen) {
    return (
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100vh] rounded-none m-0 p-0" aria-describedby={undefined}>
          {canvas}
        </DialogContent>
      </Dialog>
    );
  }

  return canvas;
}
