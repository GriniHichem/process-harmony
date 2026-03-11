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

// ─── Layout constants ───────────────────────────────────────────────

const H_SPACING = 220;
const V_SPACING = 130;
const BASE_Y = 280;
const ANNOTATION_OFFSET_Y = -100;
const DATA_OBJ_OFFSET_Y = 100;
const DATA_STORE_OFFSET_Y_TOP = -110;
const DATA_STORE_OFFSET_Y_BOT = 110;

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

  // Empty process → minimal diagram
  if (tasks.length === 0) {
    const s = mkNode("start", "Début", 60, BASE_Y);
    const e = mkNode("end", "Fin", 300, BASE_Y);
    nodes.push(s, e);
    edges.push(mkEdge(s.id, e.id));
    return { nodes, edges };
  }

  // Lookups
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

  // Detect nested branches: branches that themselves have child branches
  const hasNestedBranches = (code: string): boolean => {
    const children = branchMap.get(code);
    if (!children) return false;
    return children.some(c => branchMap.has(c.code));
  };

  let curX = 60;

  // ── Start event ──
  const startNode = mkNode("start", "Début", curX, BASE_Y);
  nodes.push(startNode);
  curX += H_SPACING * 0.7;

  // Add process-level inputs as data stores at the top
  const inputElements = elements.filter(e => e.type === "donnee_entree");
  if (inputElements.length > 0) {
    const label = inputElements.map(e => e.description).join("\n");
    const ds = mkNode("data-store", label.length > 30 ? label.slice(0, 30) + "…" : label, curX - 80, BASE_Y + DATA_STORE_OFFSET_Y_TOP);
    nodes.push(ds);
    edges.push(mkEdge(ds.id, startNode.id, undefined, "data"));
  }

  let lastId = startNode.id;

  // ── Process root tasks sequentially ──
  for (let ri = 0; ri < rootTasks.length; ri++) {
    const task = rootTasks[ri];
    const branches = branchMap.get(task.code);

    if (branches && branches.length > 0) {
      // ── Gateway pattern ──
      const result = buildGatewayGroup(task, branches, curX, BASE_Y, nodes, edges, elByCode, docById, branchMap);
      edges.push(mkEdge(lastId, result.entryId));
      lastId = result.exitId;
      curX = result.nextX;
    } else {
      // ── Sequential task ──
      const taskNode = mkNode("task", task.description, curX, BASE_Y);
      nodes.push(taskNode);
      edges.push(mkEdge(lastId, taskNode.id));

      // Attach data artifacts
      attachDataArtifacts(task, taskNode, curX, BASE_Y, nodes, edges, elByCode, docById);

      lastId = taskNode.id;
      curX += H_SPACING;
    }
  }

  // ── End event ──
  const endNode = mkNode("end", "Fin", curX, BASE_Y);
  nodes.push(endNode);
  edges.push(mkEdge(lastId, endNode.id));

  // Add process-level outputs as data stores
  const outputElements = elements.filter(e => e.type === "donnee_sortie");
  if (outputElements.length > 0) {
    const label = outputElements.map(e => e.description).join("\n");
    const ds = mkNode("data-store", label.length > 30 ? label.slice(0, 30) + "…" : label, curX - 80, BASE_Y + DATA_STORE_OFFSET_Y_BOT);
    nodes.push(ds);
    edges.push(mkEdge(endNode.id, ds.id, undefined, "data"));
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
  branchMap: Map<string, TaskInput[]>
): GatewayResult {
  const fluxType = branches[0].type_flux;
  const gwType = gwTypeFor(fluxType);

  // Split gateway — label is the parent task description (the decision question)
  const splitGw = mkNode(gwType, parentTask.description || "", startX, centerY);
  nodes.push(splitGw);

  let branchX = startX + H_SPACING;
  const branchCount = branches.length;
  const totalHeight = (branchCount - 1) * V_SPACING;
  const topY = centerY - totalHeight / 2;

  const branchEndIds: string[] = [];
  let maxBranchEndX = branchX;

  for (let i = 0; i < branches.length; i++) {
    const branch = branches[i];
    const branchY = topY + i * V_SPACING;
    const childBranches = branchMap.get(branch.code);

    if (childBranches && childBranches.length > 0) {
      // Nested gateway inside this branch
      const nested = buildGatewayGroup(branch, childBranches, branchX, branchY, nodes, edges, elByCode, docById, branchMap);
      edges.push(mkEdge(splitGw.id, nested.entryId, branch.condition || undefined));
      branchEndIds.push(nested.exitId);
      maxBranchEndX = Math.max(maxBranchEndX, nested.nextX);
    } else {
      // Simple task branch
      const branchNode = mkNode("task", branch.description, branchX, branchY);
      nodes.push(branchNode);
      edges.push(mkEdge(splitGw.id, branchNode.id, branch.condition || undefined));
      branchEndIds.push(branchNode.id);

      attachDataArtifacts(branch, branchNode, branchX, branchY, nodes, edges, elByCode, docById);
      maxBranchEndX = Math.max(maxBranchEndX, branchX + H_SPACING);
    }
  }

  // Merge gateway
  const mergeX = maxBranchEndX;
  const mergeGw = mkNode(gwType, "", mergeX, centerY);
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
  y: number,
  nodes: BpmnNode[],
  edges: BpmnEdge[],
  elByCode: Map<string, ElementInput>,
  docById: Map<string, DocumentInput>
) {
  const entryCodes = parseCodes(task.entrees);
  const exitCodes = parseCodes(task.sorties);
  const docIds = task.documents?.filter(Boolean) ?? [];

  // ── Input data (data-store, placed above-left) ──
  if (entryCodes.length > 0) {
    const labels = entryCodes.map(c => elByCode.get(c)?.description || c);
    for (let i = 0; i < labels.length; i++) {
      const ds = mkNode("data-store",
        labels[i].length > 25 ? labels[i].slice(0, 25) + "…" : labels[i],
        x - 50 + i * 55, y + ANNOTATION_OFFSET_Y
      );
      nodes.push(ds);
      edges.push(mkEdge(ds.id, taskNode.id, undefined, "data"));
    }
  }

  // ── Output data (data-store, placed below-left) ──
  if (exitCodes.length > 0) {
    const labels = exitCodes.map(c => elByCode.get(c)?.description || c);
    for (let i = 0; i < labels.length; i++) {
      const ds = mkNode("data-store",
        labels[i].length > 25 ? labels[i].slice(0, 25) + "…" : labels[i],
        x - 50 + i * 55, y + DATA_OBJ_OFFSET_Y
      );
      nodes.push(ds);
      edges.push(mkEdge(taskNode.id, ds.id, undefined, "data"));
    }
  }

  // ── Documents (data-object, placed below-right) ──
  if (docIds.length > 0) {
    const startXDoc = x + (taskNode.width ?? 140) + 10;
    for (let i = 0; i < docIds.length; i++) {
      const doc = docById.get(docIds[i]);
      const label = doc?.titre || "Document";
      const docNode = mkNode("data-object",
        label.length > 20 ? label.slice(0, 20) + "…" : label,
        startXDoc, y - 30 + i * 55
      );
      nodes.push(docNode);
      edges.push(mkEdge(taskNode.id, docNode.id, undefined, "association"));
    }
  }
}
