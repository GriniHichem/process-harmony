import { BpmnNode, BpmnEdge, BpmnData, BpmnNodeType, NODE_DEFAULTS } from "@/components/bpmn/types";

// ─── Input interfaces ───────────────────────────────────────────────

export interface TaskInput {
  id: string;
  code: string;
  description: string;
  type_flux: "sequentiel" | "conditionnel" | "parallele" | "inclusif";
  condition: string | null;
  parent_code: string | null;
  entrees: string | null;
  sorties: string | null;
  ordre: number;
  documents: string[] | null;
  next_activity_code?: string | null;
}

export interface ElementInput {
  id: string;
  code: string;
  description: string;
  type: string;
}

export interface DocumentInput {
  id: string;
  titre: string;
}

// ─── Layout constants (increased for clean, readable layout) ────────

const H_SPACING = 340;       // was 260 — much more horizontal room
const V_SPACING = 200;       // was 150 — more vertical room between branches
const BASE_Y = 400;          // was 320 — more room for top artifacts
const ARTIFACT_GAP_Y = 120;  // was 80  — data stores further from tasks
const DOC_GAP_X = 30;        // was 20  — documents further from task edge
const ARTIFACT_ITEM_GAP = 80; // was 55 — more spacing between data store items

// ─── Internal state (reset each call) ───────────────────────────────

let _nc = 0;
let _ec = 0;
const nid = () => `n${++_nc}`;
const eid = () => `e${++_ec}`;

function mkNode(type: BpmnNodeType, label: string, x: number, y: number): BpmnNode {
  const d = NODE_DEFAULTS[type];
  return { id: nid(), type, label, x, y, width: d.width, height: d.height };
}

function mkEdge(from: string, to: string, label?: string, type?: BpmnEdge["type"]): BpmnEdge {
  return { id: eid(), from, to, label, type };
}

function gwTypeFor(flux: string): BpmnNodeType {
  if (flux === "parallele") return "gateway-parallel";
  if (flux === "inclusif") return "gateway-inclusive";
  return "gateway-exclusive";
}

function parseCodes(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

/** Center a node's Y so its visual center is at `centerY` */
function centerNodeY(type: BpmnNodeType, centerY: number): number {
  const h = NODE_DEFAULTS[type].height;
  return centerY - h / 2;
}

/** Count total leaf branches for vertical space estimation */
function countLeaves(code: string, branchMap: Map<string, TaskInput[]>): number {
  const children = branchMap.get(code);
  if (!children || children.length === 0) return 1;
  return children.reduce((sum, c) => sum + countLeaves(c.code, branchMap), 0);
}

/** Estimate horizontal width needed for a task (including nested gateways) */
function estimateWidth(code: string, branchMap: Map<string, TaskInput[]>): number {
  const children = branchMap.get(code);
  if (!children || children.length === 0) return H_SPACING;
  // gateway split + max child width + gateway merge
  const maxChildWidth = Math.max(...children.map(c => estimateWidth(c.code, branchMap)));
  return H_SPACING + maxChildWidth + H_SPACING;
}

// ─── Core generation ────────────────────────────────────────────────

export function generateBpmnFromTasks(
  tasks: TaskInput[],
  elements: ElementInput[],
  documents: DocumentInput[] = []
): BpmnData {
  _nc = 0;
  _ec = 0;

  const nodes: BpmnNode[] = [];
  const edges: BpmnEdge[] = [];
  const taskCodeToNodeId = new Map<string, string>();

  // Empty process
  if (tasks.length === 0) {
    const s = mkNode("start", "Début", 80, BASE_Y);
    const e = mkNode("end", "Fin", 400, BASE_Y);
    nodes.push(s, e);
    edges.push(mkEdge(s.id, e.id));
    return { nodes, edges };
  }

  // Build lookups
  const elByCode = new Map<string, ElementInput>();
  for (const el of elements) elByCode.set(el.code, el);

  const docById = new Map<string, DocumentInput>();
  for (const d of documents) docById.set(d.id, d);

  // Sort + classify
  const sorted = [...tasks].sort((a, b) => a.ordre - b.ordre);
  const rootTasks = sorted.filter(t => !t.parent_code);
  const branchMap = new Map<string, TaskInput[]>();
  for (const t of sorted) {
    if (t.parent_code) {
      let arr = branchMap.get(t.parent_code);
      if (!arr) { arr = []; branchMap.set(t.parent_code, arr); }
      arr.push(t);
    }
  }

  let curX = 80;

  // ── Start event ──
  const startNode = mkNode("start", "Début", curX, centerNodeY("start", BASE_Y));
  nodes.push(startNode);
  curX += H_SPACING * 0.5;

  // Process-level inputs (data stores at top-left, well above the flow)
  const inputElements = elements.filter(e => e.type === "donnee_entree");
  if (inputElements.length > 0) {
    const totalW = inputElements.length * ARTIFACT_ITEM_GAP;
    const startXPos = curX - totalW / 2;
    for (let i = 0; i < inputElements.length; i++) {
      const label = inputElements[i].description;
      const ds = mkNode("data-store",
        label.length > 24 ? label.slice(0, 24) + "…" : label,
        startXPos + i * ARTIFACT_ITEM_GAP, BASE_Y - ARTIFACT_GAP_Y - 80
      );
      nodes.push(ds);
      edges.push(mkEdge(ds.id, startNode.id, undefined, "data"));
    }
  }

  let lastId = startNode.id;

  // ── Process root tasks sequentially ──
  for (let ri = 0; ri < rootTasks.length; ri++) {
    const task = rootTasks[ri];
    const branches = branchMap.get(task.code);

    if (branches && branches.length > 0) {
      const result = buildGatewayGroup(task, branches, curX, BASE_Y, nodes, edges, elByCode, docById, branchMap, taskCodeToNodeId);
      edges.push(mkEdge(lastId, result.entryId));
      lastId = result.exitId;
      curX = result.nextX;
    } else {
      const taskNode = mkNode("task", task.description, curX, centerNodeY("task", BASE_Y));
      nodes.push(taskNode);
      taskCodeToNodeId.set(task.code, taskNode.id);
      edges.push(mkEdge(lastId, taskNode.id));
      attachDataArtifacts(task, taskNode, curX, BASE_Y, nodes, edges, elByCode, docById);
      lastId = taskNode.id;
      curX += H_SPACING;
    }
  }

  // ── End event ──
  const endNode = mkNode("end", "Fin", curX, centerNodeY("end", BASE_Y));
  nodes.push(endNode);
  edges.push(mkEdge(lastId, endNode.id));

  // Process-level outputs (data stores at bottom-right)
  const outputElements = elements.filter(e => e.type === "donnee_sortie");
  if (outputElements.length > 0) {
    const totalW = outputElements.length * ARTIFACT_ITEM_GAP;
    const startXPos = curX - totalW / 2;
    for (let i = 0; i < outputElements.length; i++) {
      const label = outputElements[i].description;
      const ds = mkNode("data-store",
        label.length > 24 ? label.slice(0, 24) + "…" : label,
        startXPos + i * ARTIFACT_ITEM_GAP, BASE_Y + ARTIFACT_GAP_Y + 60
      );
      nodes.push(ds);
      edges.push(mkEdge(endNode.id, ds.id, undefined, "data"));
    }
  }

  // ── Jump edges (next_activity_code) — only for root sequential tasks ──
  for (const task of tasks) {
    if (task.next_activity_code && !task.parent_code) {
      const fromNodeId = taskCodeToNodeId.get(task.code);
      const toNodeId = taskCodeToNodeId.get(task.next_activity_code);
      if (fromNodeId && toNodeId) {
        edges.push(mkEdge(fromNodeId, toNodeId, `→ ${task.next_activity_code}`, "association"));
      }
    }
  }

  return { nodes, edges };
}

// ─── Build a gateway split/merge group (supports nesting) ───────────

interface GatewayResult {
  entryId: string;
  exitId: string;
  nextX: number;
}

function buildGatewayGroup(
  parentTask: TaskInput,
  branches: TaskInput[],
  startX: number,
  centerY: number,
  nodes: BpmnNode[],
  edges: BpmnEdge[],
  elByCode: Map<string, ElementInput>,
  docById: Map<string, DocumentInput>,
  branchMap: Map<string, TaskInput[]>,
  taskCodeToNodeId: Map<string, string>
): GatewayResult {
  const fluxType = branches[0].type_flux;
  const gwType = gwTypeFor(fluxType);

  // Split gateway — centered vertically
  const splitGw = mkNode(gwType, parentTask.description || "", startX, centerNodeY(gwType, centerY));
  nodes.push(splitGw);

  const branchX = startX + H_SPACING;
  const branchCount = branches.length;

  // Compute adaptive vertical spacing based on leaf count
  const leafCounts = branches.map(b => countLeaves(b.code, branchMap));
  const totalLeaves = leafCounts.reduce((a, b) => a + b, 0);
  // Ensure minimum spacing between branches
  const minTotalHeight = (branchCount - 1) * V_SPACING;
  const totalHeight = Math.max((totalLeaves - 1) * V_SPACING, minTotalHeight);

  // Distribute branches based on their leaf weight
  const branchCenters: number[] = [];
  let accY = centerY - totalHeight / 2;
  for (let i = 0; i < branchCount; i++) {
    const span = (leafCounts[i] / totalLeaves) * totalHeight;
    branchCenters.push(accY + span / 2);
    accY += span;
  }

  // Fallback: if only equal leaves, use even distribution
  if (totalLeaves === branchCount) {
    for (let i = 0; i < branchCount; i++) {
      branchCenters[i] = centerY - totalHeight / 2 + i * V_SPACING;
    }
  }

  const branchEndIds: string[] = [];
  let maxBranchEndX = branchX;

  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];
    const branchY = branchCenters[i];
    const childBranches = branchMap.get(branch.code);

    if (childBranches && childBranches.length > 0) {
      const nested = buildGatewayGroup(branch, childBranches, branchX, branchY, nodes, edges, elByCode, docById, branchMap, taskCodeToNodeId);
      edges.push(mkEdge(splitGw.id, nested.entryId, branch.condition || undefined));
      branchEndIds.push(nested.exitId);
      maxBranchEndX = Math.max(maxBranchEndX, nested.nextX);
    } else {
      const branchNode = mkNode("task", branch.description, branchX, centerNodeY("task", branchY));
      nodes.push(branchNode);
      taskCodeToNodeId.set(branch.code, branchNode.id);
      edges.push(mkEdge(splitGw.id, branchNode.id, branch.condition || undefined));
      branchEndIds.push(branchNode.id);
      attachDataArtifacts(branch, branchNode, branchX, branchY, nodes, edges, elByCode, docById);
      maxBranchEndX = Math.max(maxBranchEndX, branchX + H_SPACING);
    }
  }

  // Merge gateway — aligned with the split, at the furthest X + extra gap
  const mergeX = maxBranchEndX + 40;
  const mergeGw = mkNode(gwType, "", mergeX, centerNodeY(gwType, centerY));
  nodes.push(mergeGw);

  for (const bid of branchEndIds) {
    edges.push(mkEdge(bid, mergeGw.id));
  }

  return {
    entryId: splitGw.id,
    exitId: mergeGw.id,
    nextX: mergeX + H_SPACING,
  };
}

// ─── Attach data artifacts (I/O + documents) to a task node ─────────

function attachDataArtifacts(
  task: TaskInput,
  taskNode: BpmnNode,
  x: number,
  centerY: number,
  nodes: BpmnNode[],
  edges: BpmnEdge[],
  elByCode: Map<string, ElementInput>,
  docById: Map<string, DocumentInput>
) {
  const entryCodes = parseCodes(task.entrees);
  const exitCodes = parseCodes(task.sorties);
  const docIds = task.documents?.filter(Boolean) ?? [];

  const taskW = taskNode.width ?? NODE_DEFAULTS["task"].width;
  const taskH = taskNode.height ?? NODE_DEFAULTS["task"].height;

  // ── Input data (data-store, above, well spaced from task) ──
  if (entryCodes.length > 0) {
    const labels = entryCodes.map(c => elByCode.get(c)?.description || c);
    const totalW = labels.length * ARTIFACT_ITEM_GAP;
    const startXPos = x + (taskW - totalW) / 2;
    for (let i = 0; i < labels.length; i++) {
      const ds = mkNode("data-store",
        labels[i].length > 18 ? labels[i].slice(0, 18) + "…" : labels[i],
        startXPos + i * ARTIFACT_ITEM_GAP, centerY - ARTIFACT_GAP_Y - 10
      );
      nodes.push(ds);
      edges.push(mkEdge(ds.id, taskNode.id, undefined, "data"));
    }
  }

  // ── Output data (data-store, below, well spaced from task) ──
  if (exitCodes.length > 0) {
    const labels = exitCodes.map(c => elByCode.get(c)?.description || c);
    const totalW = labels.length * ARTIFACT_ITEM_GAP;
    const startXPos = x + (taskW - totalW) / 2;
    for (let i = 0; i < labels.length; i++) {
      const ds = mkNode("data-store",
        labels[i].length > 18 ? labels[i].slice(0, 18) + "…" : labels[i],
        startXPos + i * ARTIFACT_ITEM_GAP, centerY + ARTIFACT_GAP_Y + 20
      );
      nodes.push(ds);
      edges.push(mkEdge(taskNode.id, ds.id, undefined, "data"));
    }
  }

  // ── Documents (data-object, stacked to the right, with more spacing) ──
  if (docIds.length > 0) {
    const docX = x + taskW + DOC_GAP_X + 10;
    const docItemGap = 65;
    const docStartY = centerY - (docIds.length * docItemGap) / 2 + 10;
    for (let i = 0; i < docIds.length; i++) {
      const doc = docById.get(docIds[i]);
      const label = doc?.titre || "Document";
      const docNode = mkNode("data-object",
        label.length > 16 ? label.slice(0, 16) + "…" : label,
        docX, docStartY + i * docItemGap
      );
      nodes.push(docNode);
      edges.push(mkEdge(taskNode.id, docNode.id, undefined, "association"));
    }
  }
}
