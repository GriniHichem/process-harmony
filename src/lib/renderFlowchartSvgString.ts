/**
 * Static SVG string renderer for the process flowchart (logigramme).
 * Used in PDF export when BPMN is disabled.
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
  ordre: number;
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

// ─── Constants ───
const CARD_W = 280;
const CARD_H = 52;
const GW_S = 32;
const V_GAP = 50;
const H_GAP = 40;
const CIRCLE_R = 16;

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
  return lines.slice(0, 3);
}

// ─── Layout engine (simplified from ProcessTasksFlowchart) ───

function computeLayout(tasks: ProcessTask[], acteurMap: Record<string, string>) {
  const sorted = [...tasks].sort((a, b) => a.ordre - b.ordre);
  const roots = sorted.filter((t) => !t.parent_code);
  const branchMap = new Map<string, ProcessTask[]>();
  for (const t of sorted) {
    if (t.parent_code) {
      let arr = branchMap.get(t.parent_code);
      if (!arr) {
        arr = [];
        branchMap.set(t.parent_code, arr);
      }
      arr.push(t);
    }
  }

  const nodes: LayoutNode[] = [];
  const gateways: LayoutGateway[] = [];
  const edges: LayoutEdge[] = [];
  const centerX = 300;
  let curY = 50;

  // Start circle
  const startCx = centerX;
  const startCy = curY;
  curY += CIRCLE_R * 2 + V_GAP;

  function countLeaves(code: string): number {
    const ch = branchMap.get(code);
    if (!ch || ch.length === 0) return 1;
    return ch.reduce((s, c) => s + countLeaves(c.code), 0);
  }

  function layoutSequence(
    taskList: ProcessTask[],
    startY: number,
    cx: number
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
        const leafCounts = branches.map((b) => countLeaves(b.code));
        const totalLeaves = leafCounts.reduce((a, b) => a + b, 0);
        const totalW = Math.max(
          (totalLeaves - 1) * (CARD_W + H_GAP),
          (branches.length - 1) * (CARD_W + H_GAP)
        );

        gateways.push({
          code: task.code,
          type: task.type_flux,
          label: task.description,
          x: gwCx - GW_S / 2,
          y: gwY,
          s: GW_S,
        });

        if (i > 0) {
          edges.push({ fromX: prevCx, fromY: prevBottom, toX: gwCx, toY: gwY });
        }

        const branchStartY = gwY + GW_S + V_GAP;
        let accX = gwCx - totalW / 2;
        let maxEndY = branchStartY;
        const branchEnds: { x: number; y: number }[] = [];

        for (let bi = 0; bi < branches.length; bi++) {
          const span =
            totalLeaves > 0 ? (leafCounts[bi] / totalLeaves) * totalW : 0;
          const bCx = accX + span / 2;
          accX += span;

          const branch = branches[bi];
          const isDefaultPath =
            task.type_flux === "conditionnel" && !branch.condition;
          const edgeLabel = isDefaultPath
            ? "Sinon"
            : branch.condition || undefined;

          const nestedBranches = branchMap.get(branch.code);
          if (nestedBranches && nestedBranches.length > 0) {
            const res = layoutSequence([branch], branchStartY, bCx);
            edges.push({
              fromX: gwCx,
              fromY: gwY + GW_S,
              toX: bCx,
              toY: branchStartY,
              label: edgeLabel,
              isDefault: isDefaultPath,
              flowType: task.type_flux,
            });
            branchEnds.push({ x: res.connectFromX, y: res.connectFromY });
            maxEndY = Math.max(maxEndY, res.lastY);
          } else {
            const nx = bCx - CARD_W / 2;
            nodes.push({ task: branch, x: nx, y: branchStartY, w: CARD_W, h: CARD_H });
            edges.push({
              fromX: gwCx,
              fromY: gwY + GW_S,
              toX: bCx,
              toY: branchStartY,
              label: edgeLabel,
              isDefault: isDefaultPath,
              flowType: task.type_flux,
            });
            branchEnds.push({ x: bCx, y: branchStartY + CARD_H });
            maxEndY = Math.max(maxEndY, branchStartY + CARD_H);
          }
        }

        const mergeY = maxEndY + V_GAP;
        gateways.push({
          code: task.code + "_merge",
          type: task.type_flux,
          label: "",
          x: gwCx - GW_S / 2,
          y: mergeY,
          s: GW_S,
          isMerge: true,
        });
        for (const be of branchEnds) {
          edges.push({ fromX: be.x, fromY: be.y, toX: gwCx, toY: mergeY });
        }

        prevBottom = mergeY + GW_S;
        prevCx = gwCx;
        y = prevBottom + V_GAP;
      } else {
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

    return { lastY: y, connectFromX: prevCx, connectFromY: prevBottom };
  }

  const res = layoutSequence(roots, curY, centerX);

  // Connect start circle to first element
  if (roots.length > 0) {
    const firstBranches = branchMap.get(roots[0].code);
    if (firstBranches && firstBranches.length > 0) {
      edges.push({
        fromX: startCx,
        fromY: startCy + CIRCLE_R,
        toX: centerX,
        toY: curY,
      });
    } else if (nodes.length > 0) {
      edges.push({
        fromX: startCx,
        fromY: startCy + CIRCLE_R,
        toX: centerX,
        toY: nodes[0].y,
      });
    }
  }

  const endCx = centerX;
  const endCy = res.connectFromY + V_GAP + CIRCLE_R;
  edges.push({
    fromX: res.connectFromX,
    fromY: res.connectFromY,
    toX: endCx,
    toY: endCy - CIRCLE_R,
  });

  return { nodes, gateways, edges, startCx, startCy, endCx, endCy };
}

// ─── SVG Renderers ───

function renderNode(node: LayoutNode, acteurMap: Record<string, string>): string {
  const { task, x, y, w, h } = node;
  const borderColor = "#3b82f6";
  const lines = wrapText(task.description, 38);
  const lineH = 13;
  const codeH = 14;
  const textStartY = y + codeH + 8;
  const resp = task.responsable_id ? acteurMap[task.responsable_id] || "" : "";

  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#eff6ff" stroke="${borderColor}" stroke-width="1.5"/>
    <rect x="${x}" y="${y}" width="5" height="${h}" rx="2" fill="${borderColor}"/>
    <text x="${x + 14}" y="${y + 14}" font-size="8" font-weight="700" fill="#1e40af" font-family="monospace">${esc(task.code)}</text>
    ${resp ? `<text x="${x + w - 8}" y="${y + 14}" text-anchor="end" font-size="7" fill="#64748b">${esc(resp)}</text>` : ""}
    ${lines.map((line, i) => `<text x="${x + 14}" y="${textStartY + i * lineH}" font-size="9" fill="#1e293b">${esc(line)}</text>`).join("")}
  </g>`;
}

function renderGateway(gw: LayoutGateway): string {
  const cx = gw.x + gw.s / 2;
  const cy = gw.y + gw.s / 2;
  const r = gw.s / 2;

  let inner = "";
  if (gw.type === "conditionnel") {
    inner = `<line x1="${cx - 7}" y1="${cy - 7}" x2="${cx + 7}" y2="${cy + 7}" stroke="#78350f" stroke-width="2.5" stroke-linecap="round"/>
             <line x1="${cx + 7}" y1="${cy - 7}" x2="${cx - 7}" y2="${cy + 7}" stroke="#78350f" stroke-width="2.5" stroke-linecap="round"/>`;
  } else if (gw.type === "parallele") {
    inner = `<line x1="${cx}" y1="${cy - 8}" x2="${cx}" y2="${cy + 8}" stroke="#78350f" stroke-width="2.5" stroke-linecap="round"/>
             <line x1="${cx - 8}" y1="${cy}" x2="${cx + 8}" y2="${cy}" stroke="#78350f" stroke-width="2.5" stroke-linecap="round"/>`;
  } else if (gw.type === "inclusif") {
    inner = `<circle cx="${cx}" cy="${cy}" r="8" fill="none" stroke="#78350f" stroke-width="2.5"/>`;
  }

  const labelLines = gw.isMerge ? [] : wrapText(gw.label, 30);

  return `<g>
    <polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="#fef9c3" stroke="#f59e0b" stroke-width="2"/>
    ${inner}
    ${labelLines.map((line, i) => `<text x="${cx}" y="${cy + r + 14 + i * 11}" text-anchor="middle" font-size="7.5" fill="#475569">${esc(line.length > 35 ? line.slice(0, 34) + "…" : line)}</text>`).join("")}
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
    const displayText = edge.label.length > 25 ? edge.label.slice(0, 24) + "…" : edge.label;
    const tw = Math.max(60, displayText.length * 5.5 + 16);
    const lx = isStraight ? edge.fromX : edge.toX;
    const ly = isStraight ? edge.fromY + 24 : midY;
    labelSvg = `<rect x="${lx - tw / 2}" y="${ly - 8}" width="${tw}" height="15" rx="4" fill="#fff" stroke="#e2e8f0" stroke-width="0.8"/>
      <text x="${lx}" y="${ly + 3}" text-anchor="middle" font-size="7" font-weight="600" fill="#64748b">${esc(displayText)}</text>`;
  }

  return `<g>
    <path d="${path}" fill="none" stroke="#64748b" stroke-width="1.5" marker-end="url(#fcArrow)" stroke-linecap="round" stroke-linejoin="round"/>
    ${labelSvg}
  </g>`;
}

// ─── Main export ───

export function renderFlowchartSvgString(
  tasks: ProcessTask[],
  acteurMap: Record<string, string>
): string {
  if (tasks.length === 0) return "";

  const layout = computeLayout(tasks, acteurMap);
  const { nodes, gateways, edges, startCx, startCy, endCx, endCy } = layout;

  // Compute bounds
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  // Include circles
  minX = Math.min(minX, startCx - CIRCLE_R, endCx - CIRCLE_R);
  minY = Math.min(minY, startCy - CIRCLE_R);
  maxX = Math.max(maxX, startCx + CIRCLE_R, endCx + CIRCLE_R);
  maxY = Math.max(maxY, endCy + CIRCLE_R + 20);

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
    maxY = Math.max(maxY, g.y + g.s + 30);
  }

  const padding = 20;
  const svgW = maxX - minX + padding * 2;
  const svgH = maxY - minY + padding * 2;
  const offsetX = -minX + padding;
  const offsetY = -minY + padding;

  // Offset everything
  const oNodes = nodes.map((n) => ({ ...n, x: n.x + offsetX, y: n.y + offsetY }));
  const oGateways = gateways.map((g) => ({ ...g, x: g.x + offsetX, y: g.y + offsetY }));
  const oEdges = edges.map((e) => ({
    ...e,
    fromX: e.fromX + offsetX,
    fromY: e.fromY + offsetY,
    toX: e.toX + offsetX,
    toY: e.toY + offsetY,
  }));
  const oStartCx = startCx + offsetX;
  const oStartCy = startCy + offsetY;
  const oEndCx = endCx + offsetX;
  const oEndCy = endCy + offsetY;

  const edgeSvgs = oEdges.map((e) => renderEdge(e)).join("\n");
  const nodeSvgs = oNodes.map((n) => renderNode(n, acteurMap)).join("\n");
  const gwSvgs = oGateways.map((g) => renderGateway(g)).join("\n");

  // Start/End circles
  const startSvg = `<g>
    <circle cx="${oStartCx}" cy="${oStartCy}" r="${CIRCLE_R}" fill="#bbf7d0" stroke="#22c55e" stroke-width="2"/>
    <polygon points="${oStartCx - 4},${oStartCy - 6} ${oStartCx - 4},${oStartCy + 6} ${oStartCx + 6},${oStartCy}" fill="#16a34a"/>
    <text x="${oStartCx}" y="${oStartCy + CIRCLE_R + 12}" text-anchor="middle" font-size="8" font-weight="600" fill="#334155">Début</text>
  </g>`;
  const endSvg = `<g>
    <circle cx="${oEndCx}" cy="${oEndCy}" r="${CIRCLE_R}" fill="#fecaca" stroke="#ef4444" stroke-width="3"/>
    <rect x="${oEndCx - 5}" y="${oEndCy - 5}" width="10" height="10" rx="2" fill="#b91c1c"/>
    <text x="${oEndCx}" y="${oEndCy + CIRCLE_R + 12}" text-anchor="middle" font-size="8" font-weight="600" fill="#334155">Fin</text>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="max-width:100%;height:auto;font-family:'Segoe UI',Arial,sans-serif">
    <defs>
      <marker id="fcArrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
        <path d="M0,0 L8,3 L0,6 L1.5,3 Z" fill="#64748b"/>
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
