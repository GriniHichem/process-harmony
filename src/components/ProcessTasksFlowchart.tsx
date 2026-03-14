import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, User, ArrowDownRight, ArrowUpRight } from "lucide-react";
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
}

const CARD_W = 240, CARD_H = 110, GW_S = 44;
const H_GAP = 100, V_GAP = 40;
const CIRCLE_R = 22;

const FLOW_COLORS: Record<TaskFlowType, string> = {
  sequentiel: "hsl(var(--primary))",
  conditionnel: "hsl(var(--warning, 38 92% 50%))",
  parallele: "hsl(var(--success, 142 71% 45%))",
  inclusif: "hsl(280 60% 55%)",
};

const BRANCH_PREFIX: Record<string, string> = {
  conditionnel: "a", parallele: "p", inclusif: "o",
};

// ─── Auto-layout engine ───
function computeLayout(tasks: ProcessTask[]) {
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

  let curX = CIRCLE_R * 2 + H_GAP;
  const centerY = 400;

  // Start
  const startCx = CIRCLE_R + 20, startCy = centerY;

  function countLeaves(code: string): number {
    const ch = branchMap.get(code);
    if (!ch || ch.length === 0) return 1;
    return ch.reduce((s, c) => s + countLeaves(c.code), 0);
  }

  function layoutSequence(taskList: ProcessTask[], startX: number, cy: number): { lastX: number; lastCy: number; connectFromX: number; connectFromY: number } {
    let x = startX;
    let prevRight = startX;
    let prevCy = cy;

    for (let i = 0; i < taskList.length; i++) {
      const task = taskList[i];
      const branches = branchMap.get(task.code);

      if (branches && branches.length > 0) {
        // Gateway group
        const gwX = x;
        const gwCy = cy;
        const leafCounts = branches.map(b => countLeaves(b.code));
        const totalLeaves = leafCounts.reduce((a, b) => a + b, 0);
        const totalH = Math.max((totalLeaves - 1) * (CARD_H + V_GAP), (branches.length - 1) * (CARD_H + V_GAP));

        gateways.push({ code: task.code, type: task.type_flux, label: task.description, x: gwX, y: gwCy - GW_S / 2, s: GW_S });

        // Edge from previous to split gateway
        if (i === 0) {
          // connected externally
        } else {
          edges.push({ fromX: prevRight, fromY: prevCy, toX: gwX, toY: gwCy });
        }

        const branchStartX = gwX + GW_S + H_GAP;
        let accY = gwCy - totalH / 2;
        let maxEndX = branchStartX;
        const branchEnds: { x: number; y: number }[] = [];

        for (let bi = 0; bi < branches.length; bi++) {
          const span = totalLeaves > 0 ? (leafCounts[bi] / totalLeaves) * totalH : 0;
          const bCy = accY + span / 2;
          accY += span;

          const branch = branches[bi];
          const nestedBranches = branchMap.get(branch.code);
          if (nestedBranches && nestedBranches.length > 0) {
            // Nested gateway
            const res = layoutSequence([branch], branchStartX, bCy);
            edges.push({ fromX: gwX + GW_S, fromY: gwCy, toX: branchStartX, toY: bCy, label: branch.condition || undefined });
            branchEnds.push({ x: res.connectFromX, y: res.connectFromY });
            maxEndX = Math.max(maxEndX, res.lastX);
          } else {
            const ny = bCy - CARD_H / 2;
            nodes.push({ task: branch, x: branchStartX, y: ny, w: CARD_W, h: CARD_H });
            edges.push({ fromX: gwX + GW_S, fromY: gwCy, toX: branchStartX, toY: bCy, label: branch.condition || undefined });
            branchEnds.push({ x: branchStartX + CARD_W, y: bCy });
            maxEndX = Math.max(maxEndX, branchStartX + CARD_W);
          }
        }

        // Merge gateway
        const mergeX = maxEndX + H_GAP;
        gateways.push({ code: task.code + "_merge", type: task.type_flux, label: "", x: mergeX, y: gwCy - GW_S / 2, s: GW_S, isMerge: true });
        for (const be of branchEnds) {
          edges.push({ fromX: be.x, fromY: be.y, toX: mergeX, toY: gwCy });
        }

        prevRight = mergeX + GW_S;
        prevCy = gwCy;
        x = prevRight + H_GAP;
      } else {
        // Simple task node
        const ny = cy - CARD_H / 2;
        nodes.push({ task, x, y: ny, w: CARD_W, h: CARD_H });
        if (i > 0) {
          edges.push({ fromX: prevRight, fromY: prevCy, toX: x, toY: cy });
        }
        prevRight = x + CARD_W;
        prevCy = cy;
        x = prevRight + H_GAP;
      }
    }

    return { lastX: x, lastCy: prevCy, connectFromX: prevRight, connectFromY: prevCy };
  }

  const res = layoutSequence(roots, curX, centerY);

  // Connect start circle to first element
  if (roots.length > 0) {
    const firstBranches = branchMap.get(roots[0].code);
    if (firstBranches && firstBranches.length > 0) {
      edges.push({ fromX: startCx + CIRCLE_R, fromY: startCy, toX: curX, toY: centerY });
    } else if (nodes.length > 0) {
      edges.push({ fromX: startCx + CIRCLE_R, fromY: startCy, toX: nodes[0].x, toY: centerY });
    }
  }

  // End circle
  const endCx = res.connectFromX + H_GAP + CIRCLE_R;
  const endCy = centerY;
  edges.push({ fromX: res.connectFromX, fromY: res.connectFromY, toX: endCx - CIRCLE_R, toY: endCy });

  return { nodes, gateways, edges, startCx, startCy, endCx, endCy };
}

// ─── SVG Components ───

function FlowchartEdge({ edge, index }: { edge: LayoutEdge; index: number }) {
  const dx = edge.toX - edge.fromX;
  const dy = edge.toY - edge.fromY;
  const midX = edge.fromX + dx * 0.5;

  // Orthogonal path
  const path = Math.abs(dy) < 2
    ? `M${edge.fromX},${edge.fromY} L${edge.toX},${edge.toY}`
    : `M${edge.fromX},${edge.fromY} L${midX},${edge.fromY} L${midX},${edge.toY} L${edge.toX},${edge.toY}`;

  return (
    <g>
      <path d={path} fill="none" stroke="hsl(var(--border))" strokeWidth={2} markerEnd="url(#arrowhead)"
        strokeDasharray={edge.dashed ? "6 4" : undefined} />
      {edge.label && (
        <text x={midX} y={Math.min(edge.fromY, edge.toY) - 6} textAnchor="middle"
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
        <text x={cx} y={gw.y - 8} textAnchor="middle"
          className="fill-foreground text-[11px] font-medium" fontFamily="inherit">
          {gw.label.length > 30 ? gw.label.slice(0, 30) + "…" : gw.label}
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
  const [zoom, setZoom] = useState(1);
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

  const layout = useMemo(() => tasks.length > 0 ? computeLayout(tasks) : null, [tasks]);

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

  const openAddDialog = (parentCode?: string, parentFlux?: TaskFlowType) => {
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
    setZoom(z => Math.max(0.2, Math.min(2.5, z + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && (e.target as SVGElement).tagName === "svg" || (e.target as SVGElement).closest("[data-bg]")) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const acteurName = (id: string | null) => {
    if (!id) return null;
    const a = acteurs.find(a => a.id === id);
    return a?.fonction || null;
  };

  const parseCodes = (v: string | null) => v ? v.split(",").map(s => s.trim()).filter(Boolean) : [];
  const resolveDesc = (codes: string[]) => codes.map(c => { const el = processElements.find(e => e.code === c); return el?.description || c; });

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;

  // ─── Compute SVG viewBox ───
  let minX = 0, minY = 0, maxX = 800, maxY = 800;
  if (layout) {
    const allX = [...layout.nodes.map(n => n.x), ...layout.nodes.map(n => n.x + n.w), ...layout.gateways.map(g => g.x), ...layout.gateways.map(g => g.x + g.s), layout.startCx + CIRCLE_R, layout.endCx + CIRCLE_R];
    const allY = [...layout.nodes.map(n => n.y), ...layout.nodes.map(n => n.y + n.h), ...layout.gateways.map(g => g.y), ...layout.gateways.map(g => g.y + g.s), layout.startCy + CIRCLE_R, layout.endCy + CIRCLE_R];
    minX = Math.min(...allX) - 60;
    minY = Math.min(...allY) - 60;
    maxX = Math.max(...allX) + 60;
    maxY = Math.max(...allY) + 60;
  }
  const vbW = maxX - minX;
  const vbH = maxY - minY;

  const canvas = (
    <div className={cn("relative bg-muted/20 rounded-xl border border-border/50 overflow-hidden", fullscreen ? "w-full h-full" : "w-full")}
      style={{ height: fullscreen ? "100%" : "min(70vh, 700px)" }}>
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
        <Button size="icon" variant="outline" className="h-8 w-8 bg-card/80 backdrop-blur-sm shadow-sm" onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}><ZoomOut className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="outline" className="h-8 w-8 bg-card/80 backdrop-blur-sm shadow-sm" onClick={resetView}><RotateCcw className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="outline" className="h-8 w-8 bg-card/80 backdrop-blur-sm shadow-sm" onClick={() => setFullscreen(f => !f)}>
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </Button>
      </div>
      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 z-20 text-xs text-muted-foreground bg-card/80 backdrop-blur-sm rounded px-2 py-1 shadow-sm">
        {Math.round(zoom * 100)}%
      </div>

      <svg ref={svgRef} width="100%" height="100%" className="cursor-grab active:cursor-grabbing select-none"
        onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--border))" />
          </marker>
          {/* Grid pattern */}
          <pattern id="flowgrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="10" cy="10" r="0.5" fill="hsl(var(--border) / 0.3)" />
          </pattern>
        </defs>

        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {/* Background grid */}
          <rect data-bg="true" x={minX - 500} y={minY - 500} width={vbW + 1000} height={vbH + 1000}
            fill="url(#flowgrid)" />

          {layout && (
            <>
              {/* Edges */}
              {layout.edges.map((e, i) => <FlowchartEdge key={i} edge={e} index={i} />)}

              {/* Start circle */}
              <circle cx={layout.startCx} cy={layout.startCy} r={CIRCLE_R} fill="hsl(var(--primary))" stroke="none" />
              <text x={layout.startCx} y={layout.startCy + 1} textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--primary-foreground))" fontSize="10" fontWeight="600" fontFamily="inherit">Début</text>

              {/* Gateways */}
              {layout.gateways.map((gw, i) => <GatewayShape key={i} gw={gw} />)}

              {/* Task nodes as foreignObject cards */}
              {layout.nodes.map(node => {
                const t = node.task;
                const isSelected = selectedTaskId === t.id;
                const isHovered = hoveredNodeId === t.id;
                const resp = acteurName(t.responsable_id);
                const entrees = parseCodes(t.entrees);
                const sorties = parseCodes(t.sorties);
                const flowColor = FLOW_COLORS[t.type_flux] || FLOW_COLORS.sequentiel;

                return (
                  <g key={t.id}>
                    <foreignObject x={node.x} y={node.y} width={node.w} height={node.h}
                      className="overflow-visible">
                      <div
                        className={cn(
                          "w-full h-full rounded-xl border-2 bg-card/95 backdrop-blur-sm p-3 flex flex-col justify-between cursor-pointer transition-all duration-200",
                          isSelected ? "shadow-lg ring-2 ring-primary/30 scale-[1.02]" : isHovered ? "shadow-md scale-[1.01]" : "shadow-sm",
                        )}
                        style={{ borderColor: isSelected ? "hsl(var(--primary))" : flowColor }}
                        onClick={() => canEdit ? openEditDialog(t) : undefined}
                        onMouseEnter={() => setHoveredNodeId(t.id)}
                        onMouseLeave={() => setHoveredNodeId(null)}
                      >
                        {/* Header: code badge */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary shrink-0">{t.code}</span>
                          <div className="flex items-center gap-1">
                            {entrees.length > 0 && (
                              <span className="text-[9px] flex items-center gap-0.5 text-muted-foreground" title={`Entrées: ${resolveDesc(entrees).join(", ")}`}>
                                <ArrowDownRight className="h-3 w-3" />{entrees.length}
                              </span>
                            )}
                            {sorties.length > 0 && (
                              <span className="text-[9px] flex items-center gap-0.5 text-muted-foreground" title={`Sorties: ${resolveDesc(sorties).join(", ")}`}>
                                <ArrowUpRight className="h-3 w-3" />{sorties.length}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Description */}
                        <p className="text-[11px] leading-tight text-foreground font-medium line-clamp-2 flex-1">{t.description}</p>
                        {/* Footer: responsable */}
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {resp && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                              <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <User className="h-2.5 w-2.5 text-primary" />
                              </div>
                              <span className="truncate max-w-[140px]">{resp}</span>
                            </div>
                          )}
                        </div>
                        {/* Add branch button for gateway tasks */}
                        {canEdit && !t.parent_code && ["conditionnel", "parallele", "inclusif"].includes(t.type_flux) && isHovered && (
                          <button
                            className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md text-xs hover:scale-110 transition-transform z-10"
                            onClick={(e) => { e.stopPropagation(); openAddDialog(t.code, t.type_flux); }}
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
            </>
          )}

          {/* Empty state */}
          {!layout && (
            <text x="400" y="400" textAnchor="middle" className="fill-muted-foreground text-sm" fontFamily="inherit">
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
