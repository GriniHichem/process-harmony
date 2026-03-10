import { useRef, useState, useCallback, useEffect } from "react";
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
  
  return { from: getNodePort(from, fromSide), to: getNodePort(to, toSide) };
}

export default function BpmnCanvas({
  nodes, edges, mode, zoom,
  onNodesChange, onEdgesChange, onEdgeAdd,
  onNodeDelete, onEdgeDelete, onNodeSelect,
  selectedNodeId, canEdit,
}: BpmnCanvasProps) {
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
      // Pan canvas
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y });
      return;
    }

    if (mode === "delete") {
      onNodeDelete(nodeId);
      return;
    }

    if (mode === "connect") {
      const pt = getSvgPoint(e);
      setConnecting({ fromId: nodeId, mouseX: pt.x, mouseY: pt.y });
      return;
    }

    // Select mode - drag
    onNodeSelect(nodeId);
    const pt = getSvgPoint(e);
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    setDragging({ nodeId, offsetX: pt.x - node.x, offsetY: pt.y - node.y });
  }, [canEdit, mode, nodes, getSvgPoint, onNodeDelete, onNodeSelect, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: panStart.panX + (e.clientX - panStart.x),
        y: panStart.panY + (e.clientY - panStart.y),
      });
      return;
    }

    if (dragging) {
      const pt = getSvgPoint(e);
      const updated = nodes.map(n =>
        n.id === dragging.nodeId
          ? { ...n, x: Math.max(0, pt.x - dragging.offsetX), y: Math.max(0, pt.y - dragging.offsetY) }
          : n
      );
      onNodesChange(updated);
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
      if (targetNodeId && targetNodeId !== connecting.fromId) {
        onEdgeAdd(connecting.fromId, targetNodeId);
      }
      setConnecting(null);
    }
  }, [connecting, onEdgeAdd]);

  const handleEdgeClick = useCallback((edgeId: string) => {
    if (mode === "delete" && canEdit) {
      onEdgeDelete(edgeId);
    }
  }, [mode, canEdit, onEdgeDelete]);

  // Render node shapes
  const renderNode = (node: BpmnNode) => {
    const def = NODE_DEFAULTS[node.type];
    const w = node.width ?? def.width;
    const h = node.height ?? def.height;
    const isSelected = node.id === selectedNodeId;
    const selStroke = isSelected ? "hsl(var(--primary))" : undefined;
    const selWidth = isSelected ? 3 : 2;

    const commonEvents = {
      onMouseDown: (e: React.MouseEvent) => { e.stopPropagation(); handleMouseDown(e, node.id); },
      onMouseUp: (e: React.MouseEvent) => { e.stopPropagation(); handleMouseUp(e, node.id); },
      style: { cursor: mode === "delete" ? "crosshair" : mode === "connect" ? "cell" : "grab" } as React.CSSProperties,
    };

    switch (node.type) {
      case "start":
        return (
          <g key={node.id} {...commonEvents}>
            <circle cx={node.x + w/2} cy={node.y + h/2} r={w/2}
              fill="hsl(142, 71%, 85%)" stroke={selStroke ?? "hsl(142, 71%, 35%)"} strokeWidth={selWidth} />
            <polygon points={`${node.x + w/2 - 6},${node.y + h/2 - 8} ${node.x + w/2 - 6},${node.y + h/2 + 8} ${node.x + w/2 + 8},${node.y + h/2}`}
              fill="hsl(142, 71%, 35%)" />
            <text x={node.x + w/2} y={node.y + h + 16} textAnchor="middle" className="text-[11px] fill-foreground">{node.label}</text>
          </g>
        );

      case "end":
        return (
          <g key={node.id} {...commonEvents}>
            <circle cx={node.x + w/2} cy={node.y + h/2} r={w/2}
              fill="hsl(0, 84%, 90%)" stroke={selStroke ?? "hsl(0, 84%, 45%)"} strokeWidth={selWidth + 1} />
            <rect x={node.x + w/2 - 7} y={node.y + h/2 - 7} width={14} height={14} rx={2}
              fill="hsl(0, 84%, 45%)" />
            <text x={node.x + w/2} y={node.y + h + 16} textAnchor="middle" className="text-[11px] fill-foreground">{node.label}</text>
          </g>
        );

      case "intermediate-timer":
        return (
          <g key={node.id} {...commonEvents}>
            <circle cx={node.x + w/2} cy={node.y + h/2} r={w/2}
              fill="hsl(45, 93%, 90%)" stroke={selStroke ?? "hsl(45, 93%, 40%)"} strokeWidth={selWidth} />
            <circle cx={node.x + w/2} cy={node.y + h/2} r={w/2 - 4}
              fill="none" stroke="hsl(45, 93%, 40%)" strokeWidth={1} />
            {/* Clock hands */}
            <line x1={node.x + w/2} y1={node.y + h/2} x2={node.x + w/2} y2={node.y + h/2 - 10}
              stroke="hsl(45, 93%, 30%)" strokeWidth={2} />
            <line x1={node.x + w/2} y1={node.y + h/2} x2={node.x + w/2 + 7} y2={node.y + h/2}
              stroke="hsl(45, 93%, 30%)" strokeWidth={2} />
            <text x={node.x + w/2} y={node.y + h + 16} textAnchor="middle" className="text-[11px] fill-foreground">{node.label}</text>
          </g>
        );

      case "intermediate-message":
        return (
          <g key={node.id} {...commonEvents}>
            <circle cx={node.x + w/2} cy={node.y + h/2} r={w/2}
              fill="hsl(210, 80%, 90%)" stroke={selStroke ?? "hsl(210, 80%, 45%)"} strokeWidth={selWidth} />
            <circle cx={node.x + w/2} cy={node.y + h/2} r={w/2 - 4}
              fill="none" stroke="hsl(210, 80%, 45%)" strokeWidth={1} />
            {/* Envelope */}
            <rect x={node.x + w/2 - 8} y={node.y + h/2 - 5} width={16} height={11} rx={1}
              fill="none" stroke="hsl(210, 80%, 35%)" strokeWidth={1.5} />
            <polyline points={`${node.x + w/2 - 8},${node.y + h/2 - 5} ${node.x + w/2},${node.y + h/2 + 2} ${node.x + w/2 + 8},${node.y + h/2 - 5}`}
              fill="none" stroke="hsl(210, 80%, 35%)" strokeWidth={1.5} />
            <text x={node.x + w/2} y={node.y + h + 16} textAnchor="middle" className="text-[11px] fill-foreground">{node.label}</text>
          </g>
        );

      case "gateway-exclusive":
      case "gateway-parallel":
      case "gateway-inclusive": {
        const cx = node.x + w/2;
        const cy = node.y + h/2;
        const r = w / 2;
        return (
          <g key={node.id} {...commonEvents}>
            <polygon
              points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
              fill="hsl(45, 93%, 85%)" stroke={selStroke ?? "hsl(45, 93%, 40%)"} strokeWidth={selWidth}
            />
            {node.type === "gateway-exclusive" && (
              <>
                <line x1={cx - 8} y1={cy - 8} x2={cx + 8} y2={cy + 8} stroke="hsl(45, 93%, 25%)" strokeWidth={3} />
                <line x1={cx + 8} y1={cy - 8} x2={cx - 8} y2={cy + 8} stroke="hsl(45, 93%, 25%)" strokeWidth={3} />
              </>
            )}
            {node.type === "gateway-parallel" && (
              <>
                <line x1={cx} y1={cy - 10} x2={cx} y2={cy + 10} stroke="hsl(45, 93%, 25%)" strokeWidth={3} />
                <line x1={cx - 10} y1={cy} x2={cx + 10} y2={cy} stroke="hsl(45, 93%, 25%)" strokeWidth={3} />
              </>
            )}
            {node.type === "gateway-inclusive" && (
              <circle cx={cx} cy={cy} r={10} fill="none" stroke="hsl(45, 93%, 25%)" strokeWidth={3} />
            )}
            <text x={cx} y={cy + r + 16} textAnchor="middle" className="text-[11px] fill-foreground">{node.label}</text>
          </g>
        );
      }

      case "task":
        return (
          <g key={node.id} {...commonEvents}>
            <rect x={node.x} y={node.y} width={w} height={h} rx={8}
              fill="hsl(210, 80%, 93%)" stroke={selStroke ?? "hsl(210, 80%, 50%)"} strokeWidth={selWidth} />
            <text x={node.x + w/2} y={node.y + h/2 + 4} textAnchor="middle" className="text-[12px] fill-foreground font-medium">
              {node.label.length > 18 ? node.label.slice(0, 18) + "…" : node.label}
            </text>
          </g>
        );

      case "subprocess":
        return (
          <g key={node.id} {...commonEvents}>
            <rect x={node.x} y={node.y} width={w} height={h} rx={8}
              fill="hsl(210, 80%, 95%)" stroke={selStroke ?? "hsl(210, 80%, 50%)"} strokeWidth={selWidth} />
            <rect x={node.x} y={node.y} width={w} height={h} rx={8}
              fill="none" stroke={selStroke ?? "hsl(210, 80%, 50%)"} strokeWidth={selWidth} strokeDasharray="none" />
            {/* + marker at bottom */}
            <rect x={node.x + w/2 - 8} y={node.y + h - 16} width={16} height={12} rx={2}
              fill="none" stroke="hsl(210, 80%, 50%)" strokeWidth={1.5} />
            <line x1={node.x + w/2} y1={node.y + h - 14} x2={node.x + w/2} y2={node.y + h - 6}
              stroke="hsl(210, 80%, 50%)" strokeWidth={1.5} />
            <line x1={node.x + w/2 - 4} y1={node.y + h - 10} x2={node.x + w/2 + 4} y2={node.y + h - 10}
              stroke="hsl(210, 80%, 50%)" strokeWidth={1.5} />
            <text x={node.x + w/2} y={node.y + h/2 - 2} textAnchor="middle" className="text-[12px] fill-foreground font-medium">
              {node.label.length > 20 ? node.label.slice(0, 20) + "…" : node.label}
            </text>
          </g>
        );

      case "annotation":
        return (
          <g key={node.id} {...commonEvents}>
            <rect x={node.x} y={node.y} width={w} height={h} rx={2}
              fill="hsl(var(--muted))" stroke={selStroke ?? "hsl(var(--muted-foreground))"} strokeWidth={1}
              strokeDasharray="4 2" />
            <line x1={node.x} y1={node.y} x2={node.x} y2={node.y + h}
              stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
            <text x={node.x + 8} y={node.y + h/2 + 4} className="text-[11px] fill-muted-foreground">
              {node.label.length > 20 ? node.label.slice(0, 20) + "…" : node.label}
            </text>
          </g>
        );
    }
  };

  const renderEdge = (edge: BpmnEdge) => {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);
    if (!fromNode || !toNode) return null;

    const ports = bestPorts(fromNode, toNode);
    const isAnnotation = fromNode.type === "annotation" || toNode.type === "annotation";

    return (
      <g key={edge.id} onClick={() => handleEdgeClick(edge.id)}
        style={{ cursor: mode === "delete" ? "crosshair" : "default" }}>
        <defs>
          <marker id={`ah-${edge.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--foreground) / 0.6)" />
          </marker>
        </defs>
        {/* Invisible fat line for easier clicking */}
        <line x1={ports.from.x} y1={ports.from.y} x2={ports.to.x} y2={ports.to.y}
          stroke="transparent" strokeWidth={12} />
        <line
          x1={ports.from.x} y1={ports.from.y} x2={ports.to.x} y2={ports.to.y}
          stroke="hsl(var(--foreground) / 0.4)"
          strokeWidth={1.5}
          strokeDasharray={isAnnotation ? "4 3" : "none"}
          markerEnd={isAnnotation ? undefined : `url(#ah-${edge.id})`}
        />
        {edge.label && (
          <g>
            <rect
              x={(ports.from.x + ports.to.x) / 2 - 20}
              y={(ports.from.y + ports.to.y) / 2 - 10}
              width={40} height={18} rx={4}
              fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={1}
            />
            <text
              x={(ports.from.x + ports.to.x) / 2}
              y={(ports.from.y + ports.to.y) / 2 + 3}
              textAnchor="middle"
              className="text-[10px] fill-muted-foreground"
            >
              {edge.label}
            </text>
          </g>
        )}
      </g>
    );
  };

  // Render connecting line
  const renderConnectingLine = () => {
    if (!connecting) return null;
    const fromNode = nodes.find(n => n.id === connecting.fromId);
    if (!fromNode) return null;
    const fc = getNodeCenter(fromNode);
    return (
      <line
        x1={fc.cx} y1={fc.cy} x2={connecting.mouseX} y2={connecting.mouseY}
        stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="6 3"
      />
    );
  };

  // Grid pattern
  const gridSize = 20;

  return (
    <div className="relative border rounded-lg bg-background overflow-hidden" style={{ height: 500 }}>
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
          <pattern id="grid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse"
            patternTransform={`translate(${pan.x % (gridSize * zoom)}, ${pan.y % (gridSize * zoom)}) scale(${zoom})`}>
            <circle cx={gridSize / 2} cy={gridSize / 2} r={0.8} fill="hsl(var(--muted-foreground) / 0.2)" />
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
      <div className="absolute bottom-2 right-2 bg-card/80 border rounded px-2 py-1 text-xs text-muted-foreground">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
