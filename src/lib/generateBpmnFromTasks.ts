import { BpmnNode, BpmnEdge, BpmnData, BpmnNodeType, NODE_DEFAULTS } from "@/components/bpmn/types";

interface TaskInput {
  id: string;
  code: string;
  description: string;
  type_flux: "sequentiel" | "conditionnel" | "parallele" | "inclusif";
  condition: string | null;
  parent_code: string | null;
  entrees: string | null;
  sorties: string | null;
  ordre: number;
}

interface ElementInput {
  id: string;
  code: string;
  description: string;
  type: string;
}

const H_SPACING = 200;
const V_SPACING = 110;
const BASE_Y = 220;

let nodeCounter = 0;
let edgeCounter = 0;

function makeNodeId() {
  return `n${++nodeCounter}`;
}
function makeEdgeId() {
  return `e${++edgeCounter}`;
}

function makeNode(type: BpmnNodeType, label: string, x: number, y: number): BpmnNode {
  const def = NODE_DEFAULTS[type];
  return { id: makeNodeId(), type, label, x, y, width: def.width, height: def.height };
}

function makeEdge(from: string, to: string, label?: string): BpmnEdge {
  return { id: makeEdgeId(), from, to, label };
}

function gatewayTypeForFlux(flux: string): BpmnNodeType {
  switch (flux) {
    case "conditionnel": return "gateway-exclusive";
    case "parallele": return "gateway-parallel";
    case "inclusif": return "gateway-inclusive";
    default: return "gateway-exclusive";
  }
}

export function generateBpmnFromTasks(
  tasks: TaskInput[],
  elements: ElementInput[]
): BpmnData {
  nodeCounter = 0;
  edgeCounter = 0;

  const nodes: BpmnNode[] = [];
  const edges: BpmnEdge[] = [];

  if (tasks.length === 0) {
    const start = makeNode("start", "Début", 60, BASE_Y);
    const end = makeNode("end", "Fin", 260, BASE_Y);
    nodes.push(start, end);
    edges.push(makeEdge(start.id, end.id));
    return { nodes, edges };
  }

  const sorted = [...tasks].sort((a, b) => a.ordre - b.ordre);

  // Separate root tasks and branch tasks
  const rootTasks = sorted.filter(t => !t.parent_code);
  const branchMap = new Map<string, TaskInput[]>();
  for (const t of sorted) {
    if (t.parent_code) {
      const arr = branchMap.get(t.parent_code) || [];
      arr.push(t);
      branchMap.set(t.parent_code, arr);
    }
  }

  // Build element lookup for annotations
  const elementByCode = new Map<string, ElementInput>();
  for (const el of elements) {
    elementByCode.set(el.code, el);
  }

  let curX = 60;

  // Start node
  const startNode = makeNode("start", "Début", curX, BASE_Y);
  nodes.push(startNode);
  curX += H_SPACING;

  let lastNodeId = startNode.id;

  for (const task of rootTasks) {
    const branches = branchMap.get(task.code);

    if (branches && branches.length > 0) {
      // This root task has branches → gateway pattern
      const fluxType = branches[0].type_flux;
      const gwType = gatewayTypeForFlux(fluxType);

      // Split gateway
      const splitGw = makeNode(gwType, task.description || gwType.toUpperCase(), curX, BASE_Y);
      nodes.push(splitGw);
      edges.push(makeEdge(lastNodeId, splitGw.id));
      curX += H_SPACING;

      const branchEndIds: string[] = [];
      const branchCount = branches.length;
      const startY = BASE_Y - ((branchCount - 1) * V_SPACING) / 2;

      for (let i = 0; i < branches.length; i++) {
        const branch = branches[i];
        const y = startY + i * V_SPACING;
        const branchNode = makeNode("task", branch.description, curX, y);
        nodes.push(branchNode);

        const edgeLabel = branch.condition || undefined;
        edges.push(makeEdge(splitGw.id, branchNode.id, edgeLabel));
        branchEndIds.push(branchNode.id);

        // Add annotation for branch entries/exits
        addAnnotations(branch, branchNode, curX, y, nodes, edges, elementByCode);
      }

      curX += H_SPACING;

      // Merge gateway
      const mergeGw = makeNode(gwType, "", curX, BASE_Y);
      nodes.push(mergeGw);
      for (const bid of branchEndIds) {
        edges.push(makeEdge(bid, mergeGw.id));
      }

      lastNodeId = mergeGw.id;
      curX += H_SPACING;
    } else {
      // Sequential task
      const taskNode = makeNode("task", task.description, curX, BASE_Y);
      nodes.push(taskNode);
      edges.push(makeEdge(lastNodeId, taskNode.id));

      // Add annotations for entries/exits
      addAnnotations(task, taskNode, curX, BASE_Y, nodes, edges, elementByCode);

      lastNodeId = taskNode.id;
      curX += H_SPACING;
    }
  }

  // End node
  const endNode = makeNode("end", "Fin", curX, BASE_Y);
  nodes.push(endNode);
  edges.push(makeEdge(lastNodeId, endNode.id));

  return { nodes, edges };
}

function addAnnotations(
  task: TaskInput,
  taskNode: BpmnNode,
  x: number,
  y: number,
  nodes: BpmnNode[],
  edges: BpmnEdge[],
  elementByCode: Map<string, ElementInput>
) {
  const entryCodes = parseCodes(task.entrees);
  const exitCodes = parseCodes(task.sorties);

  if (entryCodes.length > 0) {
    const labels = entryCodes
      .map(c => elementByCode.get(c)?.description || c)
      .join(", ");
    const ann = makeNode("annotation", `⬇ ${labels}`, x - 30, y - 90);
    nodes.push(ann);
    edges.push(makeEdge(ann.id, taskNode.id));
  }

  if (exitCodes.length > 0) {
    const labels = exitCodes
      .map(c => elementByCode.get(c)?.description || c)
      .join(", ");
    const ann = makeNode("annotation", `⬆ ${labels}`, x - 30, y + 80);
    nodes.push(ann);
    edges.push(makeEdge(taskNode.id, ann.id));
  }
}

function parseCodes(raw: string | null): string[] {
  if (!raw || !raw.trim()) return [];
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}
