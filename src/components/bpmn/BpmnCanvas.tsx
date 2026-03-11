import { useRef, useState, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { BpmnNode, BpmnEdge, BpmnNodeType, NODE_DEFAULTS } from "./types";

type ToolMode = "select" | "connect" | "delete";

interface BpmnCanvasProps {
  nodes: BpmnNode[];
  edges: BpmnEdge[];
  mode: ToolMode;
  zoom: number;
  onNodesChange: (nodes: BpmnNode[]) => void;
  onEdgesChange: (edges: BpmnEdge[]) => void;
  onEdgeAdd: (from: string, to: string) => void;
  onNodeDelete: (id: string) => void;
  onEdgeDelete: (id: string) => void;
  onNodeSelect: (id: string | null) => void;
  selectedNodeId: string | null;
  canEdit: boolean;
}

export interface BpmnCanvasHandle {
  getSvgElement: () => SVGSVGElement | null;
}

/* ── Helpers ────────────────────────────────────────────── */

function getNodeCenter(node: BpmnNode) {
  const def = NODE_DEFAULTS[node.type];
  const w = node.width ?? def.width;
  const h = node.height ?? def.height;
  return { cx: node.x + w / 2, cy: node.y + h / 2 };
}

function getNodePort(node: BpmnNode, side: "left" | "right" | "top" | "bottom") {
  const def = NODE_DEFAULTS[node.type];
  const w = node.width ?? def.width;
  const h = node.height ?? def.height;
  switch (side) {
    case "left": return { x: node.x, y: node.y + h / 2 };
    case "right": return { x: node.x + w, y: node.y + h / 2 };
    case "top": return { x: node.x + w / 2, y: node.y };
    case "bottom": return { x: node.x + w / 2, y: node.y + h };
  }
}

function bestPorts(from: BpmnNode, to: BpmnNode) {
  const fc = getNodeCenter(from);
  const tc = getNodeCenter(to);
  const dx = tc.cx - fc.cx;
  const dy = tc.cy - fc.cy;
  let fromSide: "left" | "right" | "top" | "bottom";
  let toSide: "left" | "right" | "top" | "bottom";
  if (Math.abs(dx) > Math.abs(dy)) {
    fromSide = dx > 0 ? "right" : "left";
    toSide = dx > 0 ? "left" : "right";
  } else {
    fromSide = dy > 0 ? "bottom" : "top";
    toSide = dy > 0 ? "top" : "bottom";
  }
  return { from: getNodePort(from, fromSide), to: getNodePort(to, toSide), fromSide, toSide };
}

/** Word-wrap text into lines of maxLen chars */
function wrapText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur.length + w.length + 1 > maxLen && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + " " + w : w;
    }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3); // max 3 lines
}

/** Build orthogonal path (right-angle connectors) */
function orthogonalPath(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  fromSide: string,
  toSide: string
): string {
  // Horizontal → Horizontal
  if ((fromSide === "right" || fromSide === "left") && (toSide === "left" || toSide === "right")) {
    const midX = (p1.x + p2.x) / 2;
    return `M${p1.x},${p1.y} L${midX},${p1.y} L${midX},${p2.y} L${p2.x},${p2.y}`;
  }
  // Vertical → Vertical
  if ((fromSide === "top" || fromSide === "bottom") && (toSide === "top" || toSide === "bottom")) {
    const midY = (p1.y + p2.y) / 2;
    return `M${p1.x},${p1.y} L${p1.x},${midY} L${p2.x},${midY} L${p2.x},${p2.y}`;
  }
  // Mixed: horizontal-then-vertical or vertical-then-horizontal
  if (fromSide === "right" || fromSide === "left") {
    return `M${p1.x},${p1.y} L${p2.x},${p1.y} L${p2.x},${p2.y}`;
  }
  return `M${p1.x},${p1.y} L${p1.x},${p2.y} L${p2.x},${p2.y}`;
}

/* ── Component ──────────────────────────────────────────── */

const BpmnCanvas = forwardRef<BpmnCanvasHandle, BpmnCanvasProps>(function BpmnCanvas({
  nodes, edges, mode, zoom,
  onNodesChange, onEdgesChange, onEdgeAdd,
  onNodeDelete, onEdgeDelete, onNodeSelect,
  selectedNodeId, canEdit,
}, ref) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ nodeId: string; offsetX: number; offsetY: number } | null>(null);
  const [connecting, setConnecting] = useState<{ fromId: string; mouseX: number; mouseY: number } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });

  const getSvgPoint = useCallback((e: React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  }, [zoom, pan]);

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId?: string) => {
    if (!canEdit) return;
    if (!nodeId) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y });
      return;
    }
    if (mode === "delete") { onNodeDelete(nodeId); return; }
    if (mode === "connect") {
      const pt = getSvgPoint(e);
      setConnecting({ fromId: nodeId, mouseX: pt.x, mouseY: pt.y });
      return;
    }
    onNodeSelect(nodeId);
    const pt = getSvgPoint(e);
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDragging({ nodeId, offsetX: pt.x - node.x, offsetY: pt.y - node.y });
  }, [canEdit, mode, nodes, getSvgPoint, onNodeDelete, onNodeSelect, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: panStart.panX + (e.clientX - panStart.x), y: panStart.panY + (e.clientY - panStart.y) });
      return;
    }
    if (dragging) {
      const pt = getSvgPoint(e);
      onNodesChange(nodes.map(n =>
        n.id === dragging.nodeId ? { ...n, x: Math.max(0, pt.x - dragging.offsetX), y: Math.max(0, pt.y - dragging.offsetY) } : n
      ));
      return;
    }
    if (connecting) {
      const pt = getSvgPoint(e);
      setConnecting({ ...connecting, mouseX: pt.x, mouseY: pt.y });
    }
  }, [isPanning, dragging, connecting, getSvgPoint, nodes, onNodesChange, panStart]);

  const handleMouseUp = useCallback((e: React.MouseEvent, targetNodeId?: string) => {
    setIsPanning(false);
    setDragging(null);
    if (connecting) {
      if (targetNodeId && targetNodeId !== connecting.fromId) onEdgeAdd(connecting.fromId, targetNodeId);
      setConnecting(null);
    }
  }, [connecting, onEdgeAdd]);

  const handleEdgeClick = useCallback((edgeId: string) => {
    if (mode === "delete" && canEdit) onEdgeDelete(edgeId);
  }, [mode, canEdit, onEdgeDelete]);

  /* ── Render node ──────────────────────────────────────── */
  const renderNode = (node: BpmnNode) => {
    const def = NODE_DEFAULTS[node.type];
    const w = node.width ?? def.width;
    const h = node.height ?? def.height;
    const isSelected = node.id === selectedNodeId;

    const commonEvents = {
      onMouseDown: (e: React.MouseEvent) => { e.stopPropagation(); handleMouseDown(e, node.id); },
      onMouseUp: (e: React.MouseEvent) => { e.stopPropagation(); handleMouseUp(e, node.id); },
      style: { cursor: mode === "delete" ? "crosshair" : mode === "connect" ? "cell" : "grab" } as React.CSSProperties,
    };

    const selFilter = isSelected ? "url(#selectedGlow)" : "url(#nodeShadow)";

    switch (node.type) {
      case "start":
        return (
          <g key={node.id} {...commonEvents}>
            <circle cx={node.x + w / 2} cy={node.y + h / 2} r={w / 2 + 2}
              fill="none" stroke="transparent" strokeWidth={8} />
            <circle cx={node.x + w / 2} cy={node.y + h / 2} r={w / 2}
              fill="url(#gradStart)" stroke={isSelected ? "#16a34a" : "#22c55e"} strokeWidth={isSelected ? 3 : 2.5}
              filter={selFilter} />
            <polygon
              points={`${node.x + w / 2 - 5},${node.y + h / 2 - 7} ${node.x + w / 2 - 5},${node.y + h / 2 + 7} ${node.x + w / 2 + 7},${node.y + h / 2}`}
              fill="#16a34a" />
            <text x={node.x + w / 2} y={node.y + h + 18} textAnchor="middle"
              fontSize="11" fontWeight="600" fill="hsl(var(--foreground))" opacity={0.7}>{node.label}</text>
          </g>
        );

      case "end":
        return (
          <g key={node.id} {...commonEvents}>
            <circle cx={node.x + w / 2} cy={node.y + h / 2} r={w / 2 + 2}
              fill="none" stroke="transparent" strokeWidth={8} />
            <circle cx={node.x + w / 2} cy={node.y + h / 2} r={w / 2}
              fill="url(#gradEnd)" stroke={isSelected ? "#b91c1c" : "#ef4444"} strokeWidth={isSelected ? 4 : 3.5}
              filter={selFilter} />
            <rect x={node.x + w / 2 - 6} y={node.y + h / 2 - 6} width={12} height={12} rx={2}
              fill="#b91c1c" />
            <text x={node.x + w / 2} y={node.y + h + 18} textAnchor="middle"
              fontSize="11" fontWeight="600" fill="hsl(var(--foreground))" opacity={0.7}>{node.label}</text>
          </g>
        );

      case "intermediate-timer":
        return (
          <g key={node.id} {...commonEvents}>
            <circle cx={node.x + w / 2} cy={node.y + h / 2} r={w / 2}
              fill="url(#gradTimer)" stroke={isSelected ? "#a16207" : "#eab308"} strokeWidth={isSelected ? 3 : 2}
              filter={selFilter} />
            <circle cx={node.x + w / 2} cy={node.y + h / 2} r={w / 2 - 4}
              fill="none" stroke="#a16207" strokeWidth={1} />
            <line x1={node.x + w / 2} y1={node.y + h / 2} x2={node.x + w / 2} y2={node.y + h / 2 - 9}
              stroke="#713f12" strokeWidth={2} strokeLinecap="round" />
            <line x1={node.x + w / 2} y1={node.y + h / 2} x2={node.x + w / 2 + 6} y2={node.y + h / 2}
              stroke="#713f12" strokeWidth={2} strokeLinecap="round" />
            <text x={node.x + w / 2} y={node.y + h + 18} textAnchor="middle"
              fontSize="11" fontWeight="500" fill="hsl(var(--foreground))" opacity={0.7}>{node.label}</text>
          </g>
        );

      case "intermediate-message":
        return (
          <g key={node.id} {...commonEvents}>
            <circle cx={node.x + w / 2} cy={node.y + h / 2} r={w / 2}
              fill="url(#gradMessage)" stroke={isSelected ? "#1d4ed8" : "#3b82f6"} strokeWidth={isSelected ? 3 : 2}
              filter={selFilter} />
            <circle cx={node.x + w / 2} cy={node.y + h / 2} r={w / 2 - 4}
              fill="none" stroke="#3b82f6" strokeWidth={1} />
            <rect x={node.x + w / 2 - 7} y={node.y + h / 2 - 4} width={14} height={9} rx={1}
              fill="none" stroke="#1e40af" strokeWidth={1.5} />
            <polyline
              points={`${node.x + w / 2 - 7},${node.y + h / 2 - 4} ${node.x + w / 2},${node.y + h / 2 + 2} ${node.x + w / 2 + 7},${node.y + h / 2 - 4}`}
              fill="none" stroke="#1e40af" strokeWidth={1.5} />
            <text x={node.x + w / 2} y={node.y + h + 18} textAnchor="middle"
              fontSize="11" fontWeight="500" fill="hsl(var(--foreground))" opacity={0.7}>{node.label}</text>
          </g>
        );

      case "gateway-exclusive":
      case "gateway-parallel":
      case "gateway-inclusive": {
        const cx = node.x + w / 2;
        const cy = node.y + h / 2;
        const r = w / 2;
        return (
          <g key={node.id} {...commonEvents}>
            {/* Hit area */}
            <polygon
              points={`${cx},${cy - r - 4} ${cx + r + 4},${cy} ${cx},${cy + r + 4} ${cx - r - 4},${cy}`}
              fill="transparent" stroke="none" />
            <polygon
              points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
              fill="url(#gradGateway)" stroke={isSelected ? "#a16207" : "#f59e0b"} strokeWidth={isSelected ? 3 : 2.5}
              filter={selFilter} />
            {node.type === "gateway-exclusive" && (
              <>
                <line x1={cx - 9} y1={cy - 9} x2={cx + 9} y2={cy + 9} stroke="#78350f" strokeWidth={3.5} strokeLinecap="round" />
                <line x1={cx + 9} y1={cy - 9} x2={cx - 9} y2={cy + 9} stroke="#78350f" strokeWidth={3.5} strokeLinecap="round" />
              </>
            )}
            {node.type === "gateway-parallel" && (
              <>
                <line x1={cx} y1={cy - 11} x2={cx} y2={cy + 11} stroke="#78350f" strokeWidth={3.5} strokeLinecap="round" />
                <line x1={cx - 11} y1={cy} x2={cx + 11} y2={cy} stroke="#78350f" strokeWidth={3.5} strokeLinecap="round" />
              </>
            )}
            {node.type === "gateway-inclusive" && (
              <circle cx={cx} cy={cy} r={11} fill="none" stroke="#78350f" strokeWidth={3.5} />
            )}
            {/* Gateway label (below, multi-line) */}
            {node.label && (() => {
              const lines = wrapText(node.label, 24);
              return lines.map((line, li) => (
                <text key={li} x={cx} y={cy + r + 18 + li * 13} textAnchor="middle"
                  fontSize="10" fontWeight="500" fill="hsl(var(--foreground))" opacity={0.65}>
                  {line.length > 28 ? line.slice(0, 28) + "…" : line}
                </text>
              ));
            })()}
          </g>
        );
      }

      case "task": {
        const lines = wrapText(node.label, 22);
        const lineH = 15;
        const textBlockH = lines.length * lineH;
        const startTextY = node.y + (h - textBlockH) / 2 + 12;
        return (
          <g key={node.id} {...commonEvents}>
            <rect x={node.x} y={node.y} width={w} height={h} rx={10}
              fill="url(#gradTask)" stroke={isSelected ? "#1d4ed8" : "#60a5fa"} strokeWidth={isSelected ? 3 : 2}
              filter={selFilter} />
            {/* Left accent bar */}
            <rect x={node.x} y={node.y} width={5} height={h} rx={2}
              fill="#3b82f6" clipPath={`inset(0 0 0 0 round 10px 0 0 10px)`} />
            <path d={`M${node.x},${node.y + 10} L${node.x},${node.y + h - 10} Q${node.x},${node.y + h} ${node.x + 5},${node.y + h} L${node.x + 5},${node.y} Q${node.x},${node.y} ${node.x},${node.y + 10}`}
              fill="#3b82f6" opacity={0.9} />
            {/* Task icon */}
            <rect x={node.x + 12} y={node.y + 6} width={12} height={10} rx={1.5}
              fill="none" stroke="#93c5fd" strokeWidth={1.2} />
            <line x1={node.x + 14} y1={node.y + 10} x2={node.x + 22} y2={node.y + 10}
              stroke="#93c5fd" strokeWidth={1} />
            <line x1={node.x + 14} y1={node.y + 13} x2={node.x + 20} y2={node.y + 13}
              stroke="#93c5fd" strokeWidth={1} />
            {/* Text lines */}
            {lines.map((line, li) => (
              <text key={li} x={node.x + w / 2 + 2} y={startTextY + li * lineH}
                textAnchor="middle" fontSize="12" fontWeight="600"
                fill="hsl(var(--foreground))">
                {line}
              </text>
            ))}
          </g>
        );
      }

      case "subprocess": {
        const lines = wrapText(node.label, 24);
        return (
          <g key={node.id} {...commonEvents}>
            <rect x={node.x} y={node.y} width={w} height={h} rx={10}
              fill="url(#gradSubprocess)" stroke={isSelected ? "#1d4ed8" : "#818cf8"} strokeWidth={isSelected ? 3 : 2}
              filter={selFilter} />
            <rect x={node.x + w / 2 - 8} y={node.y + h - 18} width={16} height={14} rx={3}
              fill="none" stroke="#818cf8" strokeWidth={1.5} />
            <line x1={node.x + w / 2} y1={node.y + h - 16} x2={node.x + w / 2} y2={node.y + h - 6}
              stroke="#818cf8" strokeWidth={1.5} />
            <line x1={node.x + w / 2 - 4} y1={node.y + h - 11} x2={node.x + w / 2 + 4} y2={node.y + h - 11}
              stroke="#818cf8" strokeWidth={1.5} />
            {lines.map((line, li) => (
              <text key={li} x={node.x + w / 2} y={node.y + 28 + li * 15}
                textAnchor="middle" fontSize="12" fontWeight="600"
                fill="hsl(var(--foreground))">
                {line}
              </text>
            ))}
          </g>
        );
      }

      case "annotation":
        return (
          <g key={node.id} {...commonEvents}>
            <rect x={node.x} y={node.y} width={w} height={h} rx={4}
              fill="hsl(var(--muted) / 0.6)" stroke="none" filter="url(#nodeShadow)" />
            <path d={`M${node.x + 3},${node.y} L${node.x + 3},${node.y + h}`}
              stroke="hsl(var(--primary))" strokeWidth={2.5} strokeLinecap="round" />
            <text x={node.x + 12} y={node.y + h / 2 + 4} fontSize="10" fontWeight="500"
              fill="hsl(var(--muted-foreground))">
              {node.label.length > 24 ? node.label.slice(0, 24) + "…" : node.label}
            </text>
          </g>
        );

      case "data-object":
        return (
          <g key={node.id} {...commonEvents}>
            <path
              d={`M${node.x},${node.y + 3} Q${node.x},${node.y} ${node.x + 3},${node.y} L${node.x + w - 12},${node.y} L${node.x + w},${node.y + 12} L${node.x + w},${node.y + h - 3} Q${node.x + w},${node.y + h} ${node.x + w - 3},${node.y + h} L${node.x + 3},${node.y + h} Q${node.x},${node.y + h} ${node.x},${node.y + h - 3} Z`}
              fill="url(#gradDoc)" stroke={isSelected ? "#a16207" : "#d97706"} strokeWidth={isSelected ? 2.5 : 1.5}
              filter="url(#nodeShadow)" />
            <path
              d={`M${node.x + w - 12},${node.y} L${node.x + w - 12},${node.y + 12} L${node.x + w},${node.y + 12}`}
              fill="#fef3c7" stroke="#d97706" strokeWidth={1} />
            <text x={node.x + w / 2} y={node.y + h + 14} textAnchor="middle"
              fontSize="9" fontWeight="500" fill="hsl(var(--muted-foreground))">
              {node.label.length > 20 ? node.label.slice(0, 20) + "…" : node.label}
            </text>
          </g>
        );

      case "data-store": {
        const ry = 7;
        return (
          <g key={node.id} {...commonEvents}>
            {/* Cylinder body */}
            <path
              d={`M${node.x},${node.y + ry} L${node.x},${node.y + h - ry} Q${node.x},${node.y + h} ${node.x + w / 2},${node.y + h} Q${node.x + w},${node.y + h} ${node.x + w},${node.y + h - ry} L${node.x + w},${node.y + ry}`}
              fill="url(#gradDataStore)" stroke={isSelected ? "#4338ca" : "#6366f1"} strokeWidth={isSelected ? 2.5 : 1.5}
              filter="url(#nodeShadow)" />
            {/* Top ellipse */}
            <ellipse cx={node.x + w / 2} cy={node.y + ry} rx={w / 2} ry={ry}
              fill="url(#gradDataStoreTop)" stroke={isSelected ? "#4338ca" : "#6366f1"} strokeWidth={isSelected ? 2.5 : 1.5} />
            <text x={node.x + w / 2} y={node.y + h + 14} textAnchor="middle"
              fontSize="9" fontWeight="500" fill="hsl(var(--muted-foreground))">
              {node.label.length > 20 ? node.label.slice(0, 20) + "…" : node.label}
            </text>
          </g>
        );
      }
    }
  };

  /* ── Render edge ──────────────────────────────────────── */
  const renderEdge = (edge: BpmnEdge) => {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return null;

    const ports = bestPorts(fromNode, toNode);
    const isData = edge.type === "data" || edge.type === "association"
      || fromNode.type === "data-object" || toNode.type === "data-object"
      || fromNode.type === "data-store" || toNode.type === "data-store"
      || fromNode.type === "annotation" || toNode.type === "annotation";

    const pathD = orthogonalPath(ports.from, ports.to, ports.fromSide, ports.toSide);
    const midX = (ports.from.x + ports.to.x) / 2;
    const midY = (ports.from.y + ports.to.y) / 2;

    const markerRef = isData ? "url(#arrowData)" : "url(#arrowSeq)";

    return (
      <g key={edge.id} onClick={() => handleEdgeClick(edge.id)}
        style={{ cursor: mode === "delete" ? "crosshair" : "default" }}>
        {/* Fat invisible hit area */}
        <path d={pathD} stroke="transparent" strokeWidth={14} fill="none" />
        <path
          d={pathD}
          fill="none"
          stroke={isData ? "hsl(var(--foreground) / 0.2)" : "hsl(var(--foreground) / 0.45)"}
          strokeWidth={isData ? 1.2 : 2}
          strokeDasharray={isData ? "6 4" : "none"}
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={markerRef}
        />
        {edge.label && (
          <g>
            <rect
              x={midX - Math.min(edge.label.length * 3.5 + 8, 60)}
              y={midY - 11}
              width={Math.min(edge.label.length * 7 + 16, 120)} height={20} rx={6}
              fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={1}
              filter="url(#nodeShadow)" />
            <text x={midX} y={midY + 4} textAnchor="middle"
              fontSize="10" fontWeight="600" fill="hsl(var(--muted-foreground))">
              {edge.label.length > 18 ? edge.label.slice(0, 18) + "…" : edge.label}
            </text>
          </g>
        )}
      </g>
    );
  };

  /* ── Connecting line ──────────────────────────────────── */
  const renderConnectingLine = () => {
    if (!connecting) return null;
    const fromNode = nodes.find(n => n.id === connecting.fromId);
    if (!fromNode) return null;
    const fc = getNodeCenter(fromNode);
    return (
      <line x1={fc.cx} y1={fc.cy} x2={connecting.mouseX} y2={connecting.mouseY}
        stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="6 3" />
    );
  };

  const gridSize = 20;

  return (
    <div className="relative border rounded-xl bg-background overflow-hidden shadow-sm" style={{ height: 550 }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onMouseDown={(e) => handleMouseDown(e)}
        onMouseMove={handleMouseMove}
        onMouseUp={(e) => handleMouseUp(e)}
        onMouseLeave={(e) => { handleMouseUp(e); setIsPanning(false); }}
        style={{ cursor: isPanning ? "grabbing" : mode === "select" ? "default" : mode === "connect" ? "cell" : "crosshair" }}
      >
        <defs>
          {/* ── Gradients ── */}
          <linearGradient id="gradStart" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bbf7d0" />
            <stop offset="100%" stopColor="#86efac" />
          </linearGradient>
          <linearGradient id="gradEnd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fecaca" />
            <stop offset="100%" stopColor="#fca5a5" />
          </linearGradient>
          <linearGradient id="gradTask" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eff6ff" />
            <stop offset="100%" stopColor="#dbeafe" />
          </linearGradient>
          <linearGradient id="gradSubprocess" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eef2ff" />
            <stop offset="100%" stopColor="#e0e7ff" />
          </linearGradient>
          <linearGradient id="gradGateway" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="100%" stopColor="#fde68a" />
          </linearGradient>
          <linearGradient id="gradTimer" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="100%" stopColor="#fde68a" />
          </linearGradient>
          <linearGradient id="gradMessage" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="100%" stopColor="#bfdbfe" />
          </linearGradient>
          <linearGradient id="gradDoc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="100%" stopColor="#fef3c7" />
          </linearGradient>
          <linearGradient id="gradDataStore" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eef2ff" />
            <stop offset="100%" stopColor="#e0e7ff" />
          </linearGradient>
          <linearGradient id="gradDataStoreTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c7d2fe" />
            <stop offset="100%" stopColor="#e0e7ff" />
          </linearGradient>

          {/* ── Filters ── */}
          <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" floodColor="#000" />
          </filter>
          <filter id="selectedGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodOpacity="0.35" floodColor="#3b82f6" />
          </filter>

          {/* ── Arrow markers ── */}
          <marker id="arrowSeq" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
            <path d="M0,0 L10,4 L0,8 L2,4 Z" fill="hsl(var(--foreground) / 0.5)" />
          </marker>
          <marker id="arrowData" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <path d="M0,0 L8,3 L0,6" fill="none" stroke="hsl(var(--foreground) / 0.25)" strokeWidth="1" />
          </marker>

          {/* ── Grid ── */}
          <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x % (gridSize * zoom)}, ${pan.y % (gridSize * zoom)}) scale(${zoom})`}>
            <circle cx={gridSize / 2} cy={gridSize / 2} r={0.6} fill="hsl(var(--muted-foreground) / 0.12)" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {edges.map(renderEdge)}
          {renderConnectingLine()}
          {nodes.map(renderNode)}
        </g>
      </svg>

      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 bg-card/90 backdrop-blur-sm border rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
