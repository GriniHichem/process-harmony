export type BpmnNodeType = 
  | "start" 
  | "end" 
  | "task" 
  | "gateway-exclusive" 
  | "gateway-parallel" 
  | "gateway-inclusive"
  | "intermediate-timer"
  | "intermediate-message"
  | "subprocess"
  | "annotation"
  | "data-object"
  | "data-store";

export interface BpmnNode {
  id: string;
  type: BpmnNodeType;
  label: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface BpmnEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  type?: "sequence" | "association" | "data";
}

export interface BpmnData {
  nodes: BpmnNode[];
  edges: BpmnEdge[];
}

export interface BpmnDiagram {
  id: string;
  nom: string;
  process_id: string;
  donnees: BpmnData | null;
  version: number;
  statut: string;
}

export const NODE_DEFAULTS: Record<BpmnNodeType, { width: number; height: number; label: string }> = {
  "start": { width: 44, height: 44, label: "Début" },
  "end": { width: 44, height: 44, label: "Fin" },
  "task": { width: 180, height: 70, label: "Tâche" },
  "gateway-exclusive": { width: 54, height: 54, label: "XOR" },
  "gateway-parallel": { width: 54, height: 54, label: "AND" },
  "gateway-inclusive": { width: 54, height: 54, label: "OR" },
  "intermediate-timer": { width: 44, height: 44, label: "Timer" },
  "intermediate-message": { width: 44, height: 44, label: "Message" },
  "subprocess": { width: 200, height: 90, label: "Sous-processus" },
  "annotation": { width: 160, height: 44, label: "Note" },
  "data-object": { width: 40, height: 52, label: "Document" },
  "data-store": { width: 50, height: 44, label: "Données" },
};

export const NODE_CATEGORIES = [
  {
    label: "Événements",
    items: [
      { type: "start" as BpmnNodeType, label: "Début", icon: "play" },
      { type: "end" as BpmnNodeType, label: "Fin", icon: "square" },
      { type: "intermediate-timer" as BpmnNodeType, label: "Timer", icon: "clock" },
      { type: "intermediate-message" as BpmnNodeType, label: "Message", icon: "mail" },
    ],
  },
  {
    label: "Activités",
    items: [
      { type: "task" as BpmnNodeType, label: "Tâche", icon: "check-square" },
      { type: "subprocess" as BpmnNodeType, label: "Sous-processus", icon: "layers" },
    ],
  },
  {
    label: "Passerelles",
    items: [
      { type: "gateway-exclusive" as BpmnNodeType, label: "Exclusive (XOR)", icon: "diamond" },
      { type: "gateway-parallel" as BpmnNodeType, label: "Parallèle (AND)", icon: "diamond" },
      { type: "gateway-inclusive" as BpmnNodeType, label: "Inclusive (OR)", icon: "diamond" },
    ],
  },
  {
    label: "Artefacts",
    items: [
      { type: "annotation" as BpmnNodeType, label: "Annotation", icon: "sticky-note" },
    ],
  },
];
