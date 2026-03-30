/**
 * Static SVG string renderer for the process flowchart (logigramme).
 * Used in PDF export when BPMN is disabled.
 * Renders 3-column cards: Entrées | Activité | Sorties
 */

type TaskFlowType = "sequentiel" | "conditionnel" | "parallele" | "inclusif";

interface ProcessTask {
  id: string;
  code: string;
  description: string;
  type_flux: TaskFlowType;
  condition: string | null;
  parent_code: string | null;
  responsable_id: string | null;
  entrees: string | null;
  sorties: string | null;
  ordre: number;
}

interface ProcessElement {
  id: string;
  code: string;
  description: string;
  type: string;
}

interface LayoutNode {
  task: ProcessTask;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface LayoutGateway {
  code: string;
  type: TaskFlowType;
  label: string;
  x: number;
  y: number;
  s: number;
  isMerge?: boolean;
}

interface LayoutEdge {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  label?: string;
  isDefault?: boolean;
  flowType?: TaskFlowType;
}

// ─── Constants (larger for PDF legibility) ───
const COL_SIDE = 110;
const COL_CENTER = 240;
const CARD_W = COL_SIDE + COL_CENTER + COL_SIDE; // 460
const MIN_CARD_H = 90;
const GW_S = 44;
const V_GAP = 70;
const H_GAP = 50;
const CIRCLE_R = 22;
const LINE_H = 14;
const FONT = {
  code: 11,
  desc: 12,
  resp: 10,
  sideTitle: 9,
  sideItem: 10,
  gw: 10,
  edge: 9,
  circle: 11,
};

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

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
  return lines.slice(0, 4);
}

function parseCodeList(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

function resolveElements(codes: string[], elements: ProcessElement[]): string[] {
  return codes.map(code => {
    const el = elements.find(e => e.code === code);
    return el ? el.description : code;
  });
}

function calcCardHeight(task: ProcessTask, elements: ProcessElement[]): number {
  const entreeCodes = parseCodeList(task.entrees);
  const sortieCodes = parseCodeList(task.sorties);
  const entrees = resolveElements(entreeCodes, elements);
  const sorties = resolveElements(sortieCodes, elements);
  const descLines = wrapText(task.description, 28);
  const sideMax = Math.max(entrees.length, sorties.length);
  const sideH = 24 + sideMax * LINE_H + 8; // title + items + padding
  const centerH = 20 + descLines.length * LINE_H + 20; // code + desc + resp
  return Math.max(MIN_CARD_H, sideH, centerH);
}

// ─── Layout engine ───

function computeLayout(tasks: ProcessTask[], acteurMap: Record<string, string>, elements: ProcessElement[]) {
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
  const centerX = CARD_W / 2 + 40;
  let curY = 60;

  const startCx = centerX;
  const startCy = curY;
  curY += CIRCLE_R * 2 + V_GAP;

  function subtreeWidth(code: string): number {
    const ch = branchMap.get(code);
    if (!ch || ch.length === 0) return CARD_W;
    const childWidths = ch.map(c => subtreeWidth(c.code));
    return childWidths.reduce((a, b) => a + b, 0) + (ch.length - 1) * H_GAP;
  }

  function layoutSequence(
    taskList: ProcessTask[], startY: number, cx: number
  ): { lastY: number; connectFromX: number; connectFromY: number } {
    let y = startY;
    let prevBottom = startY;
    let prevCx = cx;

    for (let i = 0; i < taskList.length; i++) {
      const task = taskList[i];
      const branches = branchMap.get(task.code);

      if (branches && branches.length > 0) {
        const gwY = y;
        const gwCx = cx;
        const leafCounts = branches.map(b => countLeaves(b.code));
        const totalLeaves = leafCounts.reduce((a, b) => a + b, 0);
        const totalW = Math.max(
          (totalLeaves - 1) * (CARD_W + H_GAP),
          (branches.length - 1) * (CARD_W + H_GAP)
        );

        gateways.push({
          code: task.code, type: task.type_flux, label: task.description,
          x: gwCx - GW_S / 2, y: gwY, s: GW_S,
        });

        if (i > 0) edges.push({ fromX: prevCx, fromY: prevBottom, toX: gwCx, toY: gwY });

        const branchStartY = gwY + GW_S + V_GAP;
        let accX = gwCx - totalW / 2;
        let maxEndY = branchStartY;
        const branchEnds: { x: number; y: number }[] = [];

        for (let bi = 0; bi < branches.length; bi++) {
          const span = totalLeaves > 0 ? (leafCounts[bi] / totalLeaves) * totalW : 0;
          const bCx = accX + span / 2;
          accX += span;

          const branch = branches[bi];
          const isDefaultPath = task.type_flux === "conditionnel" && !branch.condition;
          const edgeLabel = isDefaultPath ? "Sinon" : branch.condition || undefined;

          const nestedBranches = branchMap.get(branch.code);
          if (nestedBranches && nestedBranches.length > 0) {
            const res = layoutSequence([branch], branchStartY, bCx);
            edges.push({
              fromX: gwCx, fromY: gwY + GW_S, toX: bCx, toY: branchStartY,
              label: edgeLabel, isDefault: isDefaultPath, flowType: task.type_flux,
            });
            branchEnds.push({ x: res.connectFromX, y: res.connectFromY });
            maxEndY = Math.max(maxEndY, res.lastY);
          } else {
            const h = calcCardHeight(branch, elements);
            const nx = bCx - CARD_W / 2;
            nodes.push({ task: branch, x: nx, y: branchStartY, w: CARD_W, h });
            edges.push({
              fromX: gwCx, fromY: gwY + GW_S, toX: bCx, toY: branchStartY,
              label: edgeLabel, isDefault: isDefaultPath, flowType: task.type_flux,
            });
            branchEnds.push({ x: bCx, y: branchStartY + h });
            maxEndY = Math.max(maxEndY, branchStartY + h);
          }
        }

        const mergeY = maxEndY + V_GAP;
        gateways.push({
          code: task.code + "_merge", type: task.type_flux, label: "",
          x: gwCx - GW_S / 2, y: mergeY, s: GW_S, isMerge: true,
        });
        for (const be of branchEnds) {
          edges.push({ fromX: be.x, fromY: be.y, toX: gwCx, toY: mergeY });
        }

        prevBottom = mergeY + GW_S;
        prevCx = gwCx;
        y = prevBottom + V_GAP;
      } else {
        const h = calcCardHeight(task, elements);
        const nx = cx - CARD_W / 2;
        nodes.push({ task, x: nx, y, w: CARD_W, h });
        if (i > 0) edges.push({ fromX: prevCx, fromY: prevBottom, toX: cx, toY: y });
        prevBottom = y + h;
        prevCx = cx;
        y = prevBottom + V_GAP;
      }
    }
    return { lastY: y, connectFromX: prevCx, connectFromY: prevBottom };
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

  return { nodes, gateways, edges, startCx, startCy, endCx, endCy };
}

// ─── SVG Renderers ───

function renderNode(node: LayoutNode, acteurMap: Record<string, string>, elements: ProcessElement[]): string {
  const { task, x, y, w, h } = node;
  const entreeCodes = parseCodeList(task.entrees);
  const sortieCodes = parseCodeList(task.sorties);
  const entrees = resolveElements(entreeCodes, elements);
  const sorties = resolveElements(sortieCodes, elements);
  const descLines = wrapText(task.description, 28);
  const resp = task.responsable_id ? acteurMap[task.responsable_id] || "" : "";

  // Card background
  let svg = `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#ffffff" stroke="#3b82f6" stroke-width="1.5"/>`;

  // Left column - Entrées (blue tint)
  svg += `<rect x="${x}" y="${y}" width="${COL_SIDE}" height="${h}" rx="8" fill="#eff6ff"/>
    <rect x="${x + COL_SIDE - 4}" y="${y}" width="4" height="${h}" fill="#eff6ff"/>
    <line x1="${x + COL_SIDE}" y1="${y + 1}" x2="${x + COL_SIDE}" y2="${y + h - 1}" stroke="#bfdbfe" stroke-width="1"/>
    <text x="${x + COL_SIDE / 2}" y="${y + 15}" text-anchor="middle" font-size="${FONT.sideTitle}" font-weight="700" fill="#1e40af">Entrées</text>`;
  entrees.forEach((e, i) => {
    const lineY = y + 30 + i * LINE_H;
    const displayText = e.length > 14 ? e.slice(0, 13) + "…" : e;
    svg += `<text x="${x + 8}" y="${lineY}" font-size="${FONT.sideItem}" fill="#334155">• ${esc(displayText)}</text>`;
  });

  // Right column - Sorties (green tint)
  const rx = x + COL_SIDE + COL_CENTER;
  svg += `<rect x="${rx}" y="${y}" width="${COL_SIDE}" height="${h}" rx="8" fill="#f0fdf4"/>
    <rect x="${rx}" y="${y}" width="4" height="${h}" fill="#f0fdf4"/>
    <line x1="${rx}" y1="${y + 1}" x2="${rx}" y2="${y + h - 1}" stroke="#bbf7d0" stroke-width="1"/>
    <text x="${rx + COL_SIDE / 2}" y="${y + 15}" text-anchor="middle" font-size="${FONT.sideTitle}" font-weight="700" fill="#166534">Sorties</text>`;
  sorties.forEach((s, i) => {
    const lineY = y + 30 + i * LINE_H;
    const displayText = s.length > 14 ? s.slice(0, 13) + "…" : s;
    svg += `<text x="${rx + 8}" y="${lineY}" font-size="${FONT.sideItem}" fill="#334155">• ${esc(displayText)}</text>`;
  });

  // Center column - Code + description + responsable
  const cx = x + COL_SIDE;
  svg += `<text x="${cx + COL_CENTER / 2}" y="${y + 18}" text-anchor="middle" font-size="${FONT.code}" font-weight="700" fill="#1e40af" font-family="monospace">${esc(task.code)}</text>`;
  descLines.forEach((line, i) => {
    svg += `<text x="${cx + COL_CENTER / 2}" y="${y + 34 + i * LINE_H}" text-anchor="middle" font-size="${FONT.desc}" fill="#1e293b">${esc(line)}</text>`;
  });
  if (resp) {
    svg += `<text x="${cx + COL_CENTER / 2}" y="${y + h - 8}" text-anchor="middle" font-size="${FONT.resp}" fill="#64748b" font-style="italic">${esc(resp)}</text>`;
  }

  svg += `</g>`;
  return svg;
}

function renderGateway(gw: LayoutGateway): string {
  const cx = gw.x + gw.s / 2;
  const cy = gw.y + gw.s / 2;
  const r = gw.s / 2;

  let inner = "";
  if (gw.type === "conditionnel") {
    inner = `<line x1="${cx - 9}" y1="${cy - 9}" x2="${cx + 9}" y2="${cy + 9}" stroke="#78350f" stroke-width="3" stroke-linecap="round"/>
             <line x1="${cx + 9}" y1="${cy - 9}" x2="${cx - 9}" y2="${cy + 9}" stroke="#78350f" stroke-width="3" stroke-linecap="round"/>`;
  } else if (gw.type === "parallele") {
    inner = `<line x1="${cx}" y1="${cy - 10}" x2="${cx}" y2="${cy + 10}" stroke="#78350f" stroke-width="3" stroke-linecap="round"/>
             <line x1="${cx - 10}" y1="${cy}" x2="${cx + 10}" y2="${cy}" stroke="#78350f" stroke-width="3" stroke-linecap="round"/>`;
  } else if (gw.type === "inclusif") {
    inner = `<circle cx="${cx}" cy="${cy}" r="10" fill="none" stroke="#78350f" stroke-width="3"/>`;
  }

  const labelLines = gw.isMerge ? [] : wrapText(gw.label, 35);

  return `<g>
    <polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="#fef9c3" stroke="#f59e0b" stroke-width="2.5"/>
    ${inner}
    ${labelLines.map((line, i) => `<text x="${cx}" y="${cy + r + 16 + i * 13}" text-anchor="middle" font-size="${FONT.gw}" fill="#475569">${esc(line.length > 40 ? line.slice(0, 39) + "…" : line)}</text>`).join("")}
  </g>`;
}

function renderEdge(edge: LayoutEdge): string {
  const dx = edge.toX - edge.fromX;
  const dy = edge.toY - edge.fromY;
  const midY = edge.fromY + dy * 0.3;
  const isStraight = Math.abs(dx) < 2;
  const path = isStraight
    ? `M${edge.fromX},${edge.fromY} L${edge.toX},${edge.toY}`
    : `M${edge.fromX},${edge.fromY} L${edge.fromX},${midY} L${edge.toX},${midY} L${edge.toX},${edge.toY}`;

  let labelSvg = "";
  if (edge.label) {
    const displayText = edge.label.length > 30 ? edge.label.slice(0, 29) + "…" : edge.label;
    const tw = Math.max(70, displayText.length * 6 + 20);
    const lx = isStraight ? edge.fromX : edge.toX;
    const ly = isStraight ? edge.fromY + 28 : midY;
    labelSvg = `<rect x="${lx - tw / 2}" y="${ly - 10}" width="${tw}" height="18" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="1"/>
      <text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="${FONT.edge}" font-weight="600" fill="#64748b">${esc(displayText)}</text>`;
  }

  return `<g>
    <path d="${path}" fill="none" stroke="#64748b" stroke-width="2" marker-end="url(#fcArrow)" stroke-linecap="round" stroke-linejoin="round"/>
    ${labelSvg}
  </g>`;
}

// ─── Main export ───

export function renderFlowchartSvgString(
  tasks: ProcessTask[],
  acteurMap: Record<string, string>,
  processElements: ProcessElement[] = []
): string {
  if (tasks.length === 0) return "";

  const layout = computeLayout(tasks, acteurMap, processElements);
  const { nodes, gateways, edges, startCx, startCy, endCx, endCy } = layout;

  // Compute bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  minX = Math.min(minX, startCx - CIRCLE_R, endCx - CIRCLE_R);
  minY = Math.min(minY, startCy - CIRCLE_R);
  maxX = Math.max(maxX, startCx + CIRCLE_R, endCx + CIRCLE_R);
  maxY = Math.max(maxY, endCy + CIRCLE_R + 30);

  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w);
    maxY = Math.max(maxY, n.y + n.h);
  }
  for (const g of gateways) {
    minX = Math.min(minX, g.x);
    minY = Math.min(minY, g.y);
    maxX = Math.max(maxX, g.x + g.s);
    maxY = Math.max(maxY, g.y + g.s + 40);
  }

  const padding = 30;
  const svgW = maxX - minX + padding * 2;
  const svgH = maxY - minY + padding * 2;
  const offsetX = -minX + padding;
  const offsetY = -minY + padding;

  const oNodes = nodes.map(n => ({ ...n, x: n.x + offsetX, y: n.y + offsetY }));
  const oGateways = gateways.map(g => ({ ...g, x: g.x + offsetX, y: g.y + offsetY }));
  const oEdges = edges.map(e => ({
    ...e,
    fromX: e.fromX + offsetX, fromY: e.fromY + offsetY,
    toX: e.toX + offsetX, toY: e.toY + offsetY,
  }));
  const oStartCx = startCx + offsetX;
  const oStartCy = startCy + offsetY;
  const oEndCx = endCx + offsetX;
  const oEndCy = endCy + offsetY;

  const edgeSvgs = oEdges.map(e => renderEdge(e)).join("\n");
  const nodeSvgs = oNodes.map(n => renderNode(n, acteurMap, processElements)).join("\n");
  const gwSvgs = oGateways.map(g => renderGateway(g)).join("\n");

  const startSvg = `<g>
    <circle cx="${oStartCx}" cy="${oStartCy}" r="${CIRCLE_R}" fill="#bbf7d0" stroke="#22c55e" stroke-width="2.5"/>
    <polygon points="${oStartCx - 5},${oStartCy - 8} ${oStartCx - 5},${oStartCy + 8} ${oStartCx + 8},${oStartCy}" fill="#16a34a"/>
    <text x="${oStartCx}" y="${oStartCy + CIRCLE_R + 16}" text-anchor="middle" font-size="${FONT.circle}" font-weight="600" fill="#334155">Début</text>
  </g>`;
  const endSvg = `<g>
    <circle cx="${oEndCx}" cy="${oEndCy}" r="${CIRCLE_R}" fill="#fecaca" stroke="#ef4444" stroke-width="3.5"/>
    <rect x="${oEndCx - 6}" y="${oEndCy - 6}" width="12" height="12" rx="2" fill="#b91c1c"/>
    <text x="${oEndCx}" y="${oEndCy + CIRCLE_R + 16}" text-anchor="middle" font-size="${FONT.circle}" font-weight="600" fill="#334155">Fin</text>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="max-width:100%;height:auto;font-family:'Segoe UI',Arial,sans-serif">
    <defs>
      <marker id="fcArrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
        <path d="M0,0 L10,4 L0,8 L2,4 Z" fill="#64748b"/>
      </marker>
    </defs>
    <rect width="${svgW}" height="${svgH}" fill="#ffffff" rx="6"/>
    ${edgeSvgs}
    ${startSvg}
    ${nodeSvgs}
    ${gwSvgs}
    ${endSvg}
  </svg>`;
}
