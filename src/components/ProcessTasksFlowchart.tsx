import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, User, AlertTriangle, Locate, Link2, FileText } from "lucide-react";
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
const CARD_W = 440, CARD_MIN_H = 140, CARD_MAX_H = 260, GW_S = 44;
const V_GAP = 100, H_GAP = 60;
const CIRCLE_R = 22;
const IO_COL_W = 110;
const PROCESS_IO_BOX_W = 360, PROCESS_IO_BOX_H = 44;

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

// ─── Dynamic card height calculator ───
function calcCardHeight(task: ProcessTask, processElements: ProcessElement[]): number {
  const entrees = task.entrees ? task.entrees.split(",").map(s => s.trim()).filter(Boolean) : [];
  const sorties = task.sorties ? task.sorties.split(",").map(s => s.trim()).filter(Boolean) : [];
  const ioCount = Math.max(entrees.length, sorties.length);
  const descLines = Math.ceil((task.description || "").length / 35);
  const ioH = Math.max(0, ioCount - 2) * 22;
  const descH = Math.max(0, descLines - 2) * 16;
  return Math.min(CARD_MAX_H, Math.max(CARD_MIN_H, CARD_MIN_H + ioH + descH));
}

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

  // Process inputs box at top — dynamic height
  const processInputsY = curY;
  const realInputBoxH = PROCESS_IO_BOX_H + Math.max(0, processEntrees.length) * 20 + 12;
  if (processEntrees.length > 0) {
    curY += realInputBoxH + 60;
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
      const cardH = calcCardHeight(task, processElements);

      if (branches && branches.length > 0) {
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
            const branchCardH = calcCardHeight(branch, processElements);
            const nx = bCx - CARD_W / 2;
            nodes.push({ task: branch, x: nx, y: branchStartY, w: CARD_W, h: branchCardH });
            edges.push({ fromX: gwCx, fromY: gwY + GW_S, toX: bCx, toY: branchStartY, label: edgeLabel, isDefault: isDefaultPath, flowType: task.type_flux });
            branchEnds.push({ x: bCx, y: branchStartY + branchCardH });
            maxEndY = Math.max(maxEndY, branchStartY + branchCardH);
          }
        }

        const mergeY = maxEndY + V_GAP;
        gateways.push({ code: task.code + "_merge", type: task.type_flux, label: "", x: gwCx - GW_S / 2, y: mergeY, s: GW_S, isMerge: true });
        for (const be of branchEnds) {
          edges.push({ fromX: be.x, fromY: be.y, toX: gwCx, toY: mergeY });
        }

        prevBottom = mergeY + GW_S;
        prevCx = gwCx;
        y = prevBottom + V_GAP;
      } else {
        const nx = cx - CARD_W / 2;
        nodes.push({ task, x: nx, y, w: CARD_W, h: cardH });
        if (i > 0) {
          edges.push({ fromX: prevCx, fromY: prevBottom, toX: cx, toY: y });
        }
        prevBottom = y + cardH;
        prevCx = cx;
        y = prevBottom + V_GAP;
      }
    }

    return { lastY: y, lastCx: prevCx, connectFromX: prevCx, connectFromY: prevBottom };
  }

  const res = layoutSequence(roots, curY, centerX);

  if (roots.length > 0) {
    const firstBranches = branchMap.get(roots[0].code);
    if (firstBranches && firstBranches.length > 0) {
      edges.push({ fromX: startCx, fromY: startCy + CIRCLE_R, toX: centerX, toY: curY });
    } else if (nodes.length > 0) {
      edges.push({ fromX: startCx, fromY: startCy + CIRCLE_R, toX: centerX, toY: nodes[0].y });
    }
  }

  const endCx = centerX;
  const endCy = res.connectFromY + V_GAP + CIRCLE_R;
  edges.push({ fromX: res.connectFromX, fromY: res.connectFromY, toX: endCx, toY: endCy - CIRCLE_R });

  const processOutputsY = endCy + CIRCLE_R + 40;

  return { nodes, gateways, edges, startCx, startCy, endCx, endCy, processInputsY, processOutputsY, processEntrees, processSorties, realInputBoxH };
}

// ─── Data flow links between consecutive tasks ───
interface DataFlowLink {
  fromNodeId: string; toNodeId: string; code: string;
  fromX: number; fromY: number; toX: number; toY: number;
}

function computeDataFlowLinks(nodes: LayoutNode[], processElements: ProcessElement[]): DataFlowLink[] {
  const links: DataFlowLink[] = [];
  const sorted = [...nodes].sort((a, b) => a.task.ordre - b.task.ordre);

  for (let i = 0; i < sorted.length - 1; i++) {
    const prev = sorted[i];
    const next = sorted[i + 1];
    if (prev.task.parent_code !== next.task.parent_code) continue;

    const prevSorties = prev.task.sorties ? prev.task.sorties.split(",").map(s => s.trim()).filter(Boolean) : [];
    const nextEntrees = next.task.entrees ? next.task.entrees.split(",").map(s => s.trim()).filter(Boolean) : [];

    for (const code of prevSorties) {
      if (nextEntrees.includes(code)) {
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
  // Place the horizontal segment closer to the top (30%) so labels sit near the gateway
  const midY = edge.fromY + dy * 0.3;

  const isStraight = Math.abs(dx) < 2;
  const path = isStraight
    ? `M${edge.fromX},${edge.fromY} L${edge.toX},${edge.toY}`
    : `M${edge.fromX},${edge.fromY} L${edge.fromX},${midY} L${edge.toX},${midY} L${edge.toX},${edge.toY}`;

  const badgeColors: Record<string, { bg: string; text: string }> = {
    conditionnel: { bg: "hsl(38 92% 50% / 0.18)", text: "hsl(38 92% 30%)" },
    inclusif: { bg: "hsl(280 60% 55% / 0.18)", text: "hsl(280 60% 35%)" },
  };
  const defaultBadge = { bg: "hsl(var(--muted))", text: "hsl(var(--muted-foreground))" };
  const colors = edge.flowType ? (badgeColors[edge.flowType] || defaultBadge) : defaultBadge;

  // Dynamic badge sizing
  const labelText = edge.label || "";
  const displayText = labelText.length > 30 ? labelText.slice(0, 29) + "…" : labelText;
  const badgeW = Math.max(90, displayText.length * 7.5 + 28);
  const badgeH = 28;

  // Position label on the horizontal segment, near the destination branch
  const labelX = isStraight
    ? edge.fromX + (dx > 0 ? 1 : -1) * 60
    : edge.toX + (edge.fromX > edge.toX ? badgeW / 2 + 8 : -badgeW / 2 - 8);
  const labelY = isStraight ? edge.fromY + 36 : midY;

  return (
    <g>
      <path d={path} fill="none" stroke="hsl(var(--border))" strokeWidth={2} markerEnd="url(#arrowhead)"
        strokeDasharray={edge.dashed ? "6 4" : undefined} />
      {/* Default path slash indicator */}
      {edge.isDefault && !isStraight && (
        <line x1={edge.fromX - 5} y1={edge.fromY + 10} x2={edge.fromX + 5} y2={edge.fromY + 22}
          stroke={colors.text} strokeWidth={2.5} />
      )}
      {edge.label && (
        <g>
          {/* Background with shadow effect */}
          <rect x={labelX - badgeW / 2 - 1} y={labelY - badgeH / 2 + 1} width={badgeW + 2} height={badgeH}
            rx={6} fill="hsl(var(--background))" opacity={0.5} />
          <rect x={labelX - badgeW / 2} y={labelY - badgeH / 2} width={badgeW} height={badgeH}
            rx={6}
            fill={edge.isDefault ? "hsl(var(--muted))" : colors.bg}
            stroke={edge.isDefault ? "hsl(var(--border))" : colors.text} strokeWidth={1} opacity={0.97} />
          <text x={labelX} y={labelY + 1} textAnchor="middle" dominantBaseline="middle"
            fill={edge.isDefault ? "hsl(var(--muted-foreground))" : colors.text}
            fontSize="11" fontFamily="inherit" fontWeight={edge.isDefault ? "500" : "700"}
            fontStyle={edge.isDefault ? "italic" : "normal"}>
            {displayText}
          </text>
        </g>
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
  const showDecisionBubble = !gw.isMerge && gw.label && gw.type !== "parallele";

  // Decision bubble to the left of the diamond
  const bubbleLabel = gw.label || "";
  const bubbleText = bubbleLabel.length > 35 ? bubbleLabel.slice(0, 34) + "…" : bubbleLabel;
  const bubbleW = Math.min(220, Math.max(120, bubbleText.length * 6.5 + 32));

  return (
    <g>
      <polygon points={`${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}`}
        fill="hsl(var(--card))" stroke={color} strokeWidth={2.5} />
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={gw.s * 0.45} fontWeight="bold" fontFamily="inherit">
        {symbol}
      </text>
      {/* Decision question bubble — positioned to the LEFT of the diamond */}
      {showDecisionBubble && (
        <foreignObject x={cx - half - bubbleW - 12} y={cy - 18} width={bubbleW} height={36}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px",
            background: "hsl(45 93% 94%)", border: "1.5px solid hsl(38 92% 60%)",
            borderRadius: "8px", padding: "4px 10px", width: "fit-content", marginLeft: "auto",
            maxWidth: `${bubbleW - 4}px`,
          }}>
            <span style={{ fontSize: "12px", flexShrink: 0 }}>❓</span>
            <span style={{
              fontSize: "11px", fontWeight: 600, color: "hsl(38 50% 30%)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {bubbleText}
            </span>
          </div>
        </foreignObject>
      )}
      {/* AND label — text to the right */}
      {!gw.isMerge && gw.label && gw.type === "parallele" && (
        <text x={cx + half + 10} y={cy + 1} textAnchor="start" dominantBaseline="middle"
          className="fill-foreground" fontSize="12" fontWeight="500" fontFamily="inherit">
          {gw.label.length > 40 ? gw.label.slice(0, 40) + "…" : gw.label}
        </text>
      )}
    </g>
  );
}

// ─── Minimap Component ───
function Minimap({ nodes, gateways, edges, startCx, startCy, endCx, endCy, minX, minY, vbW, vbH, zoom, pan, containerW, containerH }: {
  nodes: LayoutNode[]; gateways: LayoutGateway[]; edges: LayoutEdge[];
  startCx: number; startCy: number; endCx: number; endCy: number;
  minX: number; minY: number; vbW: number; vbH: number;
  zoom: number; pan: { x: number; y: number };
  containerW: number; containerH: number;
}) {
  const mmW = 180, mmH = 110;
  const scale = Math.min(mmW / vbW, mmH / vbH) * 0.9;
  const offX = (mmW - vbW * scale) / 2;
  const offY = (mmH - vbH * scale) / 2;
  const tx = (x: number) => (x - minX) * scale + offX;
  const ty = (y: number) => (y - minY) * scale + offY;

  // Viewport rectangle
  const vpW = (containerW / zoom) * scale;
  const vpH = (containerH / zoom) * scale;
  const vpX = (-pan.x / zoom - minX) * scale + offX;
  const vpY = (-pan.y / zoom - minY) * scale + offY;

  return (
    <div className="absolute bottom-12 right-3 z-20 bg-card/90 backdrop-blur-sm rounded-lg border border-border/50 shadow-md overflow-hidden" style={{ width: mmW, height: mmH }}>
      <svg width={mmW} height={mmH}>
        {/* Edges as simple lines */}
        {edges.map((e, i) => (
          <line key={i} x1={tx(e.fromX)} y1={ty(e.fromY)} x2={tx(e.toX)} y2={ty(e.toY)}
            stroke="hsl(var(--border))" strokeWidth={0.5} opacity={0.5} />
        ))}
        {/* Nodes as small rectangles */}
        {nodes.map((n, i) => (
          <rect key={i} x={tx(n.x)} y={ty(n.y)} width={n.w * scale} height={n.h * scale}
            fill="hsl(var(--primary) / 0.3)" stroke="hsl(var(--primary))" strokeWidth={0.5} rx={2} />
        ))}
        {/* Gateways as small diamonds */}
        {gateways.map((gw, i) => {
          const gcx = tx(gw.x + gw.s / 2);
          const gcy = ty(gw.y + gw.s / 2);
          const gs = gw.s * scale * 0.6;
          return <polygon key={i} points={`${gcx},${gcy - gs} ${gcx + gs},${gcy} ${gcx},${gcy + gs} ${gcx - gs},${gcy}`}
            fill="hsl(38 92% 50% / 0.3)" stroke="hsl(38 92% 50%)" strokeWidth={0.5} />;
        })}
        {/* Start/End circles */}
        <circle cx={tx(startCx)} cy={ty(startCy)} r={3} fill="hsl(var(--primary))" />
        <circle cx={tx(endCx)} cy={ty(endCy)} r={3} fill="none" stroke="hsl(var(--primary))" strokeWidth={1} />
        {/* Viewport indicator */}
        <rect x={vpX} y={vpY} width={vpW} height={vpH}
          fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--primary))" strokeWidth={1} rx={2} strokeDasharray="3 2" />
      </svg>
    </div>
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
  const [editorParentFluxType, setEditorParentFluxType] = useState<TaskFlowType | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    const parent = parentCode ? tasks.find(t => t.code === parentCode) : null;
    setEditorParentFluxType(parent?.type_flux || null);
    setEditorOpen(true);
  };

  const openEditDialog = (task: ProcessTask) => {
    setEditorTask(task);
    setEditorIsBranch(false);
    setBranchParentCode(null);
    const parent = task.parent_code ? tasks.find(t => t.code === task.parent_code) : null;
    setEditorParentFluxType(parent?.type_flux || null);
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

      const savedFlux = parentCode ? "sequentiel" : data.type_flux;
      if (!parentCode && (savedFlux === "parallele" || savedFlux === "inclusif")) {
        const existingBranches = tasks.filter(t => t.parent_code === code);
        if (existingBranches.length < 2) {
          const msg = savedFlux === "parallele"
            ? "N'oubliez pas d'ajouter au moins 2 branches parallèles via le bouton ＋ sur l'activité"
            : "Ajoutez au moins 2 branches inclusives pour que la logique soit complète";
          setTimeout(() => toast.info(msg, { duration: 6000 }), 600);
        }
      }
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

  // Fit to view — auto-calculate zoom & pan to show entire diagram
  const fitToView = useCallback(() => {
    if (!layout || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cW = rect.width;
    const cH = rect.height;
    const fitZoom = Math.min(cW / (vbW + 100), cH / (vbH + 100), 1.5);
    const fitPanX = (cW - vbW * fitZoom) / 2 - minX * fitZoom;
    const fitPanY = (cH - vbH * fitZoom) / 2 - minY * fitZoom;
    setZoom(fitZoom);
    setPan({ x: fitPanX, y: fitPanY });
  }, [layout]);

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
      // Account for decision bubbles on the left
      ...layout.gateways.filter(g => !g.isMerge && g.label && g.type !== "parallele").map(g => g.x - 220),
    ];
    const allY = [
      ...layout.nodes.map(n => n.y), ...layout.nodes.map(n => n.y + n.h),
      ...layout.gateways.map(g => g.y), ...layout.gateways.map(g => g.y + g.s),
      layout.startCy + CIRCLE_R, layout.endCy + CIRCLE_R,
      layout.processOutputsY + PROCESS_IO_BOX_H,
    ];
    minX = Math.min(...allX) - 100;
    minY = Math.min(...allY) - 80;
    maxX = Math.max(...allX) + 100;
    maxY = Math.max(...allY) + 80;
  }
  const vbW = maxX - minX;
  const vbH = maxY - minY;

  const containerW = containerRef.current?.getBoundingClientRect().width || 800;
  const containerH = containerRef.current?.getBoundingClientRect().height || 600;

  const canvas = (
    <div ref={containerRef} className={cn("relative bg-muted/20 rounded-xl border border-border/50 overflow-hidden", fullscreen ? "w-full h-full" : "w-full")}
      style={{ height: fullscreen ? "100%" : "min(75vh, 800px)" }}>
      {/* Toolbar */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5">
        {canEdit && (
          <Button size="sm" variant="default" onClick={() => openAddDialog()} className="gap-1.5 shadow-md">
            <Plus className="h-3.5 w-3.5" /> Activité
          </Button>
        )}
        {/* Activity count badge */}
        {tasks.length > 0 && (
          <span className="text-[11px] bg-card/90 backdrop-blur-sm text-muted-foreground px-2.5 py-1 rounded-md border border-border/40 shadow-sm font-medium">
            {tasks.length} activité{tasks.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1">
        <Button size="icon" variant="outline" className="h-8 w-8 bg-card/80 backdrop-blur-sm shadow-sm" onClick={() => setZoom(z => Math.min(2.5, z + 0.2))} title="Zoom +"><ZoomIn className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="outline" className="h-8 w-8 bg-card/80 backdrop-blur-sm shadow-sm" onClick={() => setZoom(z => Math.max(0.15, z - 0.2))} title="Zoom −"><ZoomOut className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="outline" className="h-8 w-8 bg-card/80 backdrop-blur-sm shadow-sm" onClick={fitToView} title="Ajuster à la vue"><Locate className="h-3.5 w-3.5" /></Button>
        <Button size="icon" variant="outline" className="h-8 w-8 bg-card/80 backdrop-blur-sm shadow-sm" onClick={resetView} title="Réinitialiser"><RotateCcw className="h-3.5 w-3.5" /></Button>
        <div className="w-px h-6 bg-border/50 mx-0.5" />
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

      {/* Minimap */}
      {layout && (
        <Minimap
          nodes={layout.nodes} gateways={layout.gateways} edges={layout.edges}
          startCx={layout.startCx} startCy={layout.startCy} endCx={layout.endCx} endCy={layout.endCy}
          minX={minX} minY={minY} vbW={vbW} vbH={vbH}
          zoom={zoom} pan={pan} containerW={containerW} containerH={containerH}
        />
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
                <foreignObject x={layout.startCx - PROCESS_IO_BOX_W / 2} y={layout.processInputsY} width={PROCESS_IO_BOX_W} height={layout.realInputBoxH}>
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center h-full">
                    <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-1.5">Entrées du processus</div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {layout.processEntrees.map(e => (
                        <span key={e.id} className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">{e.description}</span>
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
                    fontSize="9" fill="hsl(30 80% 50%)" fontFamily="inherit" fontStyle="italic">
                    {resolveDesc(link.code)}
                  </text>
                </g>
              ))}

              {/* Start circle */}
              <circle cx={layout.startCx} cy={layout.startCy} r={CIRCLE_R} fill="hsl(var(--primary))" stroke="none" />
              <text x={layout.startCx} y={layout.startCy + 1} textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--primary-foreground))" fontSize="11" fontWeight="600" fontFamily="inherit">Début</text>

              {/* Gateways + incomplete warning badges */}
              {layout.gateways.map((gw, i) => {
                const branchCount = !gw.isMerge ? tasks.filter(t => t.parent_code === gw.code).length : 2;
                const isIncomplete = !gw.isMerge && (gw.type === "parallele" || gw.type === "inclusif" || gw.type === "conditionnel") && branchCount < 2;
                const canAddBranch = canEdit && !gw.isMerge && ["conditionnel", "parallele", "inclusif"].includes(gw.type);
                const cx = gw.x + gw.s / 2;
                return (
                  <g key={i}>
                    <GatewayShape gw={gw} />
                    {isIncomplete && (
                      <foreignObject x={cx + gw.s / 2 + 2} y={gw.y - 4} width={24} height={24} className="overflow-visible">
                        <div title={`${branchCount === 0 ? "Aucune" : "1 seule"} branche — au moins 2 requises`}
                          className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 border border-amber-400 dark:border-amber-600 flex items-center justify-center cursor-help">
                          <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                        </div>
                      </foreignObject>
                    )}
                    {/* Add branch button on gateway */}
                    {canAddBranch && (
                      <foreignObject x={cx + gw.s / 2 + (isIncomplete ? 28 : 4)} y={gw.y + gw.s / 2 - 14} width={28} height={28} className="overflow-visible" style={{ pointerEvents: "none" }}>
                        <button
                          className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg text-sm font-bold border-2 border-background hover:scale-110 transition-transform"
                          style={{ pointerEvents: "auto" }}
                          onClick={(e) => { e.stopPropagation(); openAddDialog(gw.code); }}
                          title="Ajouter une branche"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </foreignObject>
                    )}
                  </g>
                );
              })}

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
                        <div className="w-[110px] shrink-0 bg-blue-50/50 dark:bg-blue-950/20 border-r border-blue-200/30 dark:border-blue-800/30 p-2 flex flex-col gap-1 overflow-y-auto">
                          <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Entrées</span>
                          {entrees.length > 0 ? entrees.map(code => (
                            <div key={code} className="text-[10px] bg-blue-100/80 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-1.5 py-0.5 rounded leading-tight truncate" title={resolveDesc(code)}>
                              {resolveDesc(code)}
                            </div>
                          )) : (
                            <span className="text-[9px] text-muted-foreground italic">—</span>
                          )}
                        </div>

                        {/* Center column — Code + Description + Actor */}
                        <div className="flex-1 flex flex-col min-w-0">
                          <div className="flex-1 p-3 flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary shrink-0">{t.code}</span>
                              {t.condition && (
                                <span className="text-[10px] text-muted-foreground italic truncate">({t.condition})</span>
                              )}
                            </div>
                            <p className="text-[12px] leading-snug text-foreground font-medium line-clamp-4">{t.description}</p>
                          </div>
                          {/* Actor banner */}
                          <div
                            className="h-8 flex items-center gap-1.5 px-3 shrink-0"
                            style={{
                              backgroundColor: actorColor ? actorColor : "hsl(var(--muted))",
                              opacity: actorColor ? 0.9 : 0.5,
                            }}
                          >
                            <User className="h-3.5 w-3.5 text-white" />
                            <span className="text-[11px] font-medium text-white truncate">
                              {resp || "Non assigné"}
                            </span>
                          </div>
                        </div>

                        {/* Right column — Outputs */}
                        <div className="w-[110px] shrink-0 bg-green-50/50 dark:bg-green-950/20 border-l border-green-200/30 dark:border-green-800/30 p-2 flex flex-col gap-1 overflow-y-auto">
                          <span className="text-[9px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-wider">Sorties</span>
                          {sorties.length > 0 ? sorties.map(code => (
                            <div key={code} className="text-[10px] bg-green-100/80 dark:bg-green-900/40 text-green-800 dark:text-green-200 px-1.5 py-0.5 rounded leading-tight truncate" title={resolveDesc(code)}>
                              {resolveDesc(code)}
                            </div>
                          )) : (
                            <span className="text-[9px] text-muted-foreground italic">—</span>
                          )}
                        </div>
                      </div>
                    </foreignObject>

                    {/* Add branch button */}
                    {canEdit && !t.parent_code && ["conditionnel", "parallele", "inclusif"].includes(t.type_flux) && (
                      <foreignObject
                        x={node.x + node.w / 2 - 16}
                        y={node.y + node.h - 4}
                        width={32} height={32}
                        className="overflow-visible"
                        style={{ pointerEvents: "none" }}
                      >
                        <button
                          className={cn(
                            "w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg text-sm font-bold transition-all duration-200 border-2 border-background",
                            isHovered ? "opacity-100 scale-110" : "opacity-70 scale-100"
                          )}
                          style={{ pointerEvents: "auto" }}
                          onClick={(e) => { e.stopPropagation(); openAddDialog(t.code); }}
                          title="Ajouter une branche"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </foreignObject>
                    )}
                  </g>
                );
              })}

              {/* End circle */}
              <circle cx={layout.endCx} cy={layout.endCy} r={CIRCLE_R} fill="none" stroke="hsl(var(--primary))" strokeWidth={3} />
              <circle cx={layout.endCx} cy={layout.endCy} r={CIRCLE_R - 5} fill="hsl(var(--primary))" />
              <text x={layout.endCx} y={layout.endCy + 1} textAnchor="middle" dominantBaseline="middle" fill="hsl(var(--primary-foreground))" fontSize="11" fontWeight="600" fontFamily="inherit">Fin</text>

              {/* Process-level outputs */}
              {layout.processSorties.length > 0 && (
                <foreignObject x={layout.endCx - PROCESS_IO_BOX_W / 2} y={layout.processOutputsY} width={PROCESS_IO_BOX_W} height={PROCESS_IO_BOX_H + layout.processSorties.length * 20 + 12}>
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                    <div className="text-[11px] font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider mb-1.5">Sorties du processus</div>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {layout.processSorties.map(e => (
                        <span key={e.id} className="text-[10px] bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">{e.description}</span>
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
        parentFluxType={editorParentFluxType}
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
