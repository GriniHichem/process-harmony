/**
 * Generates a static SVG string from BPMN data (nodes + edges) for embedding in PDF.
 */

import { BpmnNode, BpmnEdge, BpmnData, NODE_DEFAULTS } from "@/components/bpmn/types";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
  return { from: getNodePort(from, fromSide), to: getNodePort(to, toSide), fromSide, toSide };
}

function orthogonalPath(p1: { x: number; y: number }, p2: { x: number; y: number }, fromSide: string, toSide: string): string {
  if ((fromSide === "right" || fromSide === "left") && (toSide === "left" || toSide === "right")) {
    const midX = (p1.x + p2.x) / 2;
    return `M${p1.x},${p1.y} L${midX},${p1.y} L${midX},${p2.y} L${p2.x},${p2.y}`;
  }
  if ((fromSide === "top" || fromSide === "bottom") && (toSide === "top" || toSide === "bottom")) {
    const midY = (p1.y + p2.y) / 2;
    return `M${p1.x},${p1.y} L${p1.x},${midY} L${p2.x},${midY} L${p2.x},${p2.y}`;
  }
  if (fromSide === "right" || fromSide === "left") {
    return `M${p1.x},${p1.y} L${p2.x},${p1.y} L${p2.x},${p2.y}`;
  }
  return `M${p1.x},${p1.y} L${p1.x},${p2.y} L${p2.x},${p2.y}`;
}

function wrapText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur.length + w.length + 1 > maxLen && cur) { lines.push(cur); cur = w; }
    else { cur = cur ? cur + " " + w : w; }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

function renderNodeSvg(node: BpmnNode): string {
  const def = NODE_DEFAULTS[node.type];
  const w = node.width ?? def.width;
  const h = node.height ?? def.height;

  switch (node.type) {
    case "start":
      return `<g>
        <circle cx="${node.x + w / 2}" cy="${node.y + h / 2}" r="${w / 2}" fill="#bbf7d0" stroke="#22c55e" stroke-width="2.5"/>
        <polygon points="${node.x + w / 2 - 5},${node.y + h / 2 - 7} ${node.x + w / 2 - 5},${node.y + h / 2 + 7} ${node.x + w / 2 + 7},${node.y + h / 2}" fill="#16a34a"/>
        <text x="${node.x + w / 2}" y="${node.y + h + 16}" text-anchor="middle" font-size="10" font-weight="600" fill="#334155">${esc(node.label)}</text>
      </g>`;
    case "end":
      return `<g>
        <circle cx="${node.x + w / 2}" cy="${node.y + h / 2}" r="${w / 2}" fill="#fecaca" stroke="#ef4444" stroke-width="3.5"/>
        <rect x="${node.x + w / 2 - 6}" y="${node.y + h / 2 - 6}" width="12" height="12" rx="2" fill="#b91c1c"/>
        <text x="${node.x + w / 2}" y="${node.y + h + 16}" text-anchor="middle" font-size="10" font-weight="600" fill="#334155">${esc(node.label)}</text>
      </g>`;
    case "task": {
      const lines = wrapText(node.label, 22);
      const lineH = 14;
      const textBlockH = lines.length * lineH;
      const startTextY = node.y + (h - textBlockH) / 2 + 11;
      return `<g>
        <rect x="${node.x}" y="${node.y}" width="${w}" height="${h}" rx="10" fill="#eff6ff" stroke="#60a5fa" stroke-width="2"/>
        <path d="M${node.x},${node.y + 10} L${node.x},${node.y + h - 10} Q${node.x},${node.y + h} ${node.x + 5},${node.y + h} L${node.x + 5},${node.y} Q${node.x},${node.y} ${node.x},${node.y + 10}" fill="#3b82f6" opacity="0.9"/>
        ${lines.map((line, i) => `<text x="${node.x + w / 2 + 2}" y="${startTextY + i * lineH}" text-anchor="middle" font-size="11" font-weight="600" fill="#1e293b">${esc(line)}</text>`).join("")}
      </g>`;
    }
    case "subprocess": {
      const lines = wrapText(node.label, 24);
      return `<g>
        <rect x="${node.x}" y="${node.y}" width="${w}" height="${h}" rx="10" fill="#eef2ff" stroke="#818cf8" stroke-width="2"/>
        <rect x="${node.x + w / 2 - 8}" y="${node.y + h - 18}" width="16" height="14" rx="3" fill="none" stroke="#818cf8" stroke-width="1.5"/>
        <line x1="${node.x + w / 2}" y1="${node.y + h - 16}" x2="${node.x + w / 2}" y2="${node.y + h - 6}" stroke="#818cf8" stroke-width="1.5"/>
        <line x1="${node.x + w / 2 - 4}" y1="${node.y + h - 11}" x2="${node.x + w / 2 + 4}" y2="${node.y + h - 11}" stroke="#818cf8" stroke-width="1.5"/>
        ${lines.map((line, i) => `<text x="${node.x + w / 2}" y="${node.y + 26 + i * 14}" text-anchor="middle" font-size="11" font-weight="600" fill="#1e293b">${esc(line)}</text>`).join("")}
      </g>`;
    }
    case "gateway-exclusive":
    case "gateway-parallel":
    case "gateway-inclusive": {
      const cx = node.x + w / 2;
      const cy = node.y + h / 2;
      const r = w / 2;
      let inner = "";
      if (node.type === "gateway-exclusive") {
        inner = `<line x1="${cx - 9}" y1="${cy - 9}" x2="${cx + 9}" y2="${cy + 9}" stroke="#78350f" stroke-width="3.5" stroke-linecap="round"/>
                  <line x1="${cx + 9}" y1="${cy - 9}" x2="${cx - 9}" y2="${cy + 9}" stroke="#78350f" stroke-width="3.5" stroke-linecap="round"/>`;
      } else if (node.type === "gateway-parallel") {
        inner = `<line x1="${cx}" y1="${cy - 11}" x2="${cx}" y2="${cy + 11}" stroke="#78350f" stroke-width="3.5" stroke-linecap="round"/>
                  <line x1="${cx - 11}" y1="${cy}" x2="${cx + 11}" y2="${cy}" stroke="#78350f" stroke-width="3.5" stroke-linecap="round"/>`;
      } else {
        inner = `<circle cx="${cx}" cy="${cy}" r="11" fill="none" stroke="#78350f" stroke-width="3.5"/>`;
      }
      const labelLines = wrapText(node.label, 24);
      return `<g>
        <polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="#fef9c3" stroke="#f59e0b" stroke-width="2.5"/>
        ${inner}
        ${labelLines.map((line, i) => `<text x="${cx}" y="${cy + r + 16 + i * 12}" text-anchor="middle" font-size="9" font-weight="500" fill="#475569">${esc(line.length > 28 ? line.slice(0, 28) + "…" : line)}</text>`).join("")}
      </g>`;
    }
    case "intermediate-timer":
      return `<g>
        <circle cx="${node.x + w / 2}" cy="${node.y + h / 2}" r="${w / 2}" fill="#fef9c3" stroke="#eab308" stroke-width="2"/>
        <circle cx="${node.x + w / 2}" cy="${node.y + h / 2}" r="${w / 2 - 4}" fill="none" stroke="#a16207" stroke-width="1"/>
        <line x1="${node.x + w / 2}" y1="${node.y + h / 2}" x2="${node.x + w / 2}" y2="${node.y + h / 2 - 9}" stroke="#713f12" stroke-width="2" stroke-linecap="round"/>
        <line x1="${node.x + w / 2}" y1="${node.y + h / 2}" x2="${node.x + w / 2 + 6}" y2="${node.y + h / 2}" stroke="#713f12" stroke-width="2" stroke-linecap="round"/>
        <text x="${node.x + w / 2}" y="${node.y + h + 16}" text-anchor="middle" font-size="10" font-weight="500" fill="#475569">${esc(node.label)}</text>
      </g>`;
    case "intermediate-message":
      return `<g>
        <circle cx="${node.x + w / 2}" cy="${node.y + h / 2}" r="${w / 2}" fill="#dbeafe" stroke="#3b82f6" stroke-width="2"/>
        <circle cx="${node.x + w / 2}" cy="${node.y + h / 2}" r="${w / 2 - 4}" fill="none" stroke="#3b82f6" stroke-width="1"/>
        <rect x="${node.x + w / 2 - 7}" y="${node.y + h / 2 - 4}" width="14" height="9" rx="1" fill="none" stroke="#1e40af" stroke-width="1.5"/>
        <text x="${node.x + w / 2}" y="${node.y + h + 16}" text-anchor="middle" font-size="10" font-weight="500" fill="#475569">${esc(node.label)}</text>
      </g>`;
    case "annotation":
      return `<g>
        <rect x="${node.x}" y="${node.y}" width="${w}" height="${h}" rx="4" fill="#f1f5f9" stroke="none"/>
        <path d="M${node.x + 3},${node.y} L${node.x + 3},${node.y + h}" stroke="#1e293b" stroke-width="2.5" stroke-linecap="round"/>
        <text x="${node.x + 12}" y="${node.y + h / 2 + 4}" font-size="9" font-weight="500" fill="#64748b">${esc(node.label.length > 24 ? node.label.slice(0, 24) + "…" : node.label)}</text>
      </g>`;
    case "data-object":
      return `<g>
        <path d="M${node.x},${node.y + 3} Q${node.x},${node.y} ${node.x + 3},${node.y} L${node.x + w - 12},${node.y} L${node.x + w},${node.y + 12} L${node.x + w},${node.y + h - 3} Q${node.x + w},${node.y + h} ${node.x + w - 3},${node.y + h} L${node.x + 3},${node.y + h} Q${node.x},${node.y + h} ${node.x},${node.y + h - 3} Z" fill="#fffbeb" stroke="#d97706" stroke-width="1.5"/>
        <path d="M${node.x + w - 12},${node.y} L${node.x + w - 12},${node.y + 12} L${node.x + w},${node.y + 12}" fill="#fef3c7" stroke="#d97706" stroke-width="1"/>
        <text x="${node.x + w / 2}" y="${node.y + h + 14}" text-anchor="middle" font-size="9" font-weight="500" fill="#64748b">${esc(node.label.length > 20 ? node.label.slice(0, 20) + "…" : node.label)}</text>
      </g>`;
    case "data-store": {
      const ry = 7;
      return `<g>
        <path d="M${node.x},${node.y + ry} L${node.x},${node.y + h - ry} Q${node.x},${node.y + h} ${node.x + w / 2},${node.y + h} Q${node.x + w},${node.y + h} ${node.x + w},${node.y + h - ry} L${node.x + w},${node.y + ry}" fill="#eef2ff" stroke="#6366f1" stroke-width="1.5"/>
        <ellipse cx="${node.x + w / 2}" cy="${node.y + ry}" rx="${w / 2}" ry="${ry}" fill="#c7d2fe" stroke="#6366f1" stroke-width="1.5"/>
        <text x="${node.x + w / 2}" y="${node.y + h + 14}" text-anchor="middle" font-size="9" font-weight="500" fill="#64748b">${esc(node.label.length > 20 ? node.label.slice(0, 20) + "…" : node.label)}</text>
      </g>`;
    }
    default:
      return "";
  }
}

function renderEdgeSvg(edge: BpmnEdge, nodes: BpmnNode[]): string {
  const fromNode = nodes.find(n => n.id === edge.from);
  const toNode = nodes.find(n => n.id === edge.to);
  if (!fromNode || !toNode) return "";

  const ports = bestPorts(fromNode, toNode);
  const isData = edge.type === "data" || edge.type === "association"
    || fromNode.type === "data-object" || toNode.type === "data-object"
    || fromNode.type === "data-store" || toNode.type === "data-store"
    || fromNode.type === "annotation" || toNode.type === "annotation";

  const pathD = orthogonalPath(ports.from, ports.to, ports.fromSide, ports.toSide);
  const midX = (ports.from.x + ports.to.x) / 2;
  const midY = (ports.from.y + ports.to.y) / 2;

  const markerRef = isData ? "url(#pdfArrowData)" : "url(#pdfArrowSeq)";

  let labelSvg = "";
  if (edge.label) {
    const tw = Math.min(edge.label.length * 6 + 16, 120);
    labelSvg = `<rect x="${midX - tw / 2}" y="${midY - 10}" width="${tw}" height="18" rx="5" fill="#ffffff" stroke="#e2e8f0" stroke-width="1"/>
      <text x="${midX}" y="${midY + 4}" text-anchor="middle" font-size="9" font-weight="600" fill="#64748b">${esc(edge.label.length > 18 ? edge.label.slice(0, 18) + "…" : edge.label)}</text>`;
  }

  return `<g>
    <path d="${pathD}" fill="none" stroke="${isData ? "#94a3b8" : "#64748b"}" stroke-width="${isData ? 1.2 : 1.8}" ${isData ? 'stroke-dasharray="6 4"' : ""} stroke-linecap="round" stroke-linejoin="round" marker-end="${markerRef}"/>
    ${labelSvg}
  </g>`;
}

export function renderBpmnSvgString(data: BpmnData): string {
  const { nodes, edges } = data;
  if (nodes.length === 0) return "";

  // Compute bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    const def = NODE_DEFAULTS[n.type];
    const w = n.width ?? def.width;
    const h = n.height ?? def.height;
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + w);
    maxY = Math.max(maxY, n.y + h + 20); // extra for labels below
  }

  const padding = 30;
  const svgW = maxX - minX + padding * 2;
  const svgH = maxY - minY + padding * 2;
  const offsetX = -minX + padding;
  const offsetY = -minY + padding;

  // Offset all nodes for rendering
  const offsetNodes = nodes.map(n => ({ ...n, x: n.x + offsetX, y: n.y + offsetY }));

  const edgeSvgs = edges.map(e => renderEdgeSvg(e, offsetNodes)).join("\n");
  const nodeSvgs = offsetNodes.map(n => renderNodeSvg(n)).join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="max-width:100%;height:auto;font-family:'Segoe UI',Arial,sans-serif">
    <defs>
      <marker id="pdfArrowSeq" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
        <path d="M0,0 L10,4 L0,8 L2,4 Z" fill="#64748b"/>
      </marker>
      <marker id="pdfArrowData" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
        <path d="M0,0 L8,3 L0,6" fill="none" stroke="#94a3b8" stroke-width="1"/>
      </marker>
    </defs>
    <rect width="${svgW}" height="${svgH}" fill="#ffffff" rx="8"/>
    ${edgeSvgs}
    ${nodeSvgs}
  </svg>`;
}
