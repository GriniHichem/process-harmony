import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Play, Square, Diamond, ArrowRight, GripVertical } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type BpmnNodeType = "start" | "end" | "task" | "gateway" | "annotation";

interface BpmnNode {
  id: string;
  type: BpmnNodeType;
  label: string;
  x: number;
  y: number;
}

interface BpmnEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
}

interface BpmnData {
  nodes: BpmnNode[];
  edges: BpmnEdge[];
}

interface BpmnDiagram {
  id: string;
  nom: string;
  process_id: string;
  donnees: BpmnData | null;
  version: number;
  statut: string;
}

const NODE_COLORS: Record<BpmnNodeType, { bg: string; border: string; icon: React.ReactNode }> = {
  start: { bg: "bg-green-100", border: "border-green-500", icon: <Play className="h-4 w-4 text-green-700" /> },
  end: { bg: "bg-red-100", border: "border-red-500", icon: <Square className="h-4 w-4 text-red-700" /> },
  task: { bg: "bg-blue-100", border: "border-blue-500", icon: null },
  gateway: { bg: "bg-yellow-100", border: "border-yellow-500", icon: <Diamond className="h-4 w-4 text-yellow-700" /> },
  annotation: { bg: "bg-muted", border: "border-muted-foreground", icon: null },
};

const NODE_TYPE_LABELS: Record<BpmnNodeType, string> = {
  start: "Début",
  end: "Fin",
  task: "Tâche",
  gateway: "Passerelle",
  annotation: "Annotation",
};

export default function Bpmn() {
  const { role } = useAuth();
  const [processes, setProcesses] = useState<{ id: string; nom: string }[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<string>("");
  const [diagram, setDiagram] = useState<BpmnDiagram | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [addNodeOpen, setAddNodeOpen] = useState(false);
  const [newNodeType, setNewNodeType] = useState<BpmnNodeType>("task");
  const [newNodeLabel, setNewNodeLabel] = useState("");
  const [addEdgeOpen, setAddEdgeOpen] = useState(false);
  const [edgeFrom, setEdgeFrom] = useState("");
  const [edgeTo, setEdgeTo] = useState("");
  const [edgeLabel, setEdgeLabel] = useState("");

  const canEdit = role === "rmq" || role === "responsable_processus" || role === "consultant";

  useEffect(() => {
    supabase.from("processes").select("id, nom").order("nom").then(({ data }) => {
      setProcesses(data ?? []);
      setLoading(false);
    });
  }, []);

  const fetchDiagram = useCallback(async (processId: string) => {
    const { data } = await supabase
      .from("bpmn_diagrams")
      .select("*")
      .eq("process_id", processId)
      .order("version", { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      const raw = data[0];
      setDiagram({
        ...raw,
        donnees: raw.donnees as unknown as BpmnData | null,
      });
    } else {
      setDiagram(null);
    }
  }, []);

  useEffect(() => {
    if (selectedProcessId) fetchDiagram(selectedProcessId);
    else setDiagram(null);
  }, [selectedProcessId, fetchDiagram]);

  const createDiagram = async () => {
    if (!selectedProcessId) return;
    const processName = processes.find(p => p.id === selectedProcessId)?.nom ?? "Diagramme";
    const defaultData: BpmnData = {
      nodes: [
        { id: "n1", type: "start", label: "Début", x: 50, y: 150 },
        { id: "n2", type: "end", label: "Fin", x: 650, y: 150 },
      ],
      edges: [{ id: "e1", from: "n1", to: "n2" }],
    };
    const { error } = await supabase.from("bpmn_diagrams").insert({
      nom: `BPMN - ${processName}`,
      process_id: selectedProcessId,
      donnees: defaultData as unknown as Record<string, unknown>,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Diagramme créé");
    fetchDiagram(selectedProcessId);
  };

  const saveDiagram = async () => {
    if (!diagram) return;
    setSaving(true);
    const { error } = await supabase.from("bpmn_diagrams").update({
      donnees: diagram.donnees as unknown as Record<string, unknown>,
    }).eq("id", diagram.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Diagramme sauvegardé");
  };

  const addNode = () => {
    if (!diagram || !diagram.donnees || !newNodeLabel.trim()) return;
    const nodes = diagram.donnees.nodes;
    const maxX = Math.max(...nodes.map(n => n.x), 0);
    const newNode: BpmnNode = {
      id: `n${Date.now()}`,
      type: newNodeType,
      label: newNodeLabel.trim(),
      x: maxX + 150,
      y: 150,
    };
    setDiagram({
      ...diagram,
      donnees: { ...diagram.donnees, nodes: [...nodes, newNode] },
    });
    setNewNodeLabel("");
    setAddNodeOpen(false);
  };

  const removeNode = (nodeId: string) => {
    if (!diagram?.donnees) return;
    setDiagram({
      ...diagram,
      donnees: {
        nodes: diagram.donnees.nodes.filter(n => n.id !== nodeId),
        edges: diagram.donnees.edges.filter(e => e.from !== nodeId && e.to !== nodeId),
      },
    });
  };

  const addEdge = () => {
    if (!diagram?.donnees || !edgeFrom || !edgeTo || edgeFrom === edgeTo) return;
    const exists = diagram.donnees.edges.some(e => e.from === edgeFrom && e.to === edgeTo);
    if (exists) { toast.error("Ce lien existe déjà"); return; }
    const newEdge: BpmnEdge = { id: `e${Date.now()}`, from: edgeFrom, to: edgeTo, label: edgeLabel.trim() || undefined };
    setDiagram({
      ...diagram,
      donnees: { ...diagram.donnees, edges: [...diagram.donnees.edges, newEdge] },
    });
    setEdgeFrom("");
    setEdgeTo("");
    setEdgeLabel("");
    setAddEdgeOpen(false);
  };

  const removeEdge = (edgeId: string) => {
    if (!diagram?.donnees) return;
    setDiagram({
      ...diagram,
      donnees: { ...diagram.donnees, edges: diagram.donnees.edges.filter(e => e.id !== edgeId) },
    });
  };

  const nodes = diagram?.donnees?.nodes ?? [];
  const edges = diagram?.donnees?.edges ?? [];

  // Auto-layout: arrange nodes left to right
  const layoutNodes = nodes.map((node, i) => ({
    ...node,
    x: 40 + i * 160,
    y: 80,
  }));

  const getNodeLabel = (id: string) => nodes.find(n => n.id === id)?.label ?? id;

  const renderFlowDiagram = () => {
    const width = Math.max(800, layoutNodes.length * 160 + 80);
    const height = 220;

    return (
      <div className="overflow-x-auto border rounded-lg bg-background p-4">
        <svg width={width} height={height} className="min-w-full">
          {/* Draw edges */}
          {edges.map(edge => {
            const fromNode = layoutNodes.find(n => n.id === edge.from);
            const toNode = layoutNodes.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return null;
            const x1 = fromNode.x + 60;
            const y1 = fromNode.y + 25;
            const x2 = toNode.x;
            const y2 = toNode.y + 25;
            return (
              <g key={edge.id}>
                <defs>
                  <marker id={`arrow-${edge.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" className="fill-muted-foreground" />
                  </marker>
                </defs>
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  className="stroke-muted-foreground"
                  strokeWidth="2"
                  markerEnd={`url(#arrow-${edge.id})`}
                />
                {edge.label && (
                  <text x={(x1 + x2) / 2} y={y1 - 10} textAnchor="middle" className="fill-muted-foreground text-xs">
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Draw nodes */}
          {layoutNodes.map(node => {
            const style = NODE_COLORS[node.type];
            if (node.type === "start" || node.type === "end") {
              return (
                <g key={node.id}>
                  <circle
                    cx={node.x + 30} cy={node.y + 25} r="22"
                    className={`${node.type === "start" ? "fill-green-200 stroke-green-600" : "fill-red-200 stroke-red-600"}`}
                    strokeWidth="3"
                  />
                  <text x={node.x + 30} y={node.y + 30} textAnchor="middle" className="text-xs fill-foreground font-medium">
                    {node.label}
                  </text>
                </g>
              );
            }
            if (node.type === "gateway") {
              return (
                <g key={node.id}>
                  <rect
                    x={node.x + 5} y={node.y} width="50" height="50" rx="4"
                    transform={`rotate(45, ${node.x + 30}, ${node.y + 25})`}
                    className="fill-yellow-200 stroke-yellow-600"
                    strokeWidth="2"
                  />
                  <text x={node.x + 30} y={node.y + 70} textAnchor="middle" className="text-xs fill-foreground font-medium">
                    {node.label}
                  </text>
                </g>
              );
            }
            // Task or annotation
            return (
              <g key={node.id}>
                <rect
                  x={node.x} y={node.y} width="120" height="50" rx="8"
                  className={`${node.type === "annotation" ? "fill-muted stroke-muted-foreground" : "fill-blue-100 stroke-blue-500"}`}
                  strokeWidth="2"
                />
                <text x={node.x + 60} y={node.y + 30} textAnchor="middle" className="text-xs fill-foreground font-medium">
                  {node.label.length > 16 ? node.label.slice(0, 16) + "…" : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Visualisation BPMN</h1>
        <p className="text-muted-foreground">Diagrammes de flux des processus</p>
      </div>

      {/* Process selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label>Sélectionner un processus</Label>
              <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
                <SelectTrigger><SelectValue placeholder="Choisir un processus..." /></SelectTrigger>
                <SelectContent>
                  {processes.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diagram area */}
      {selectedProcessId && !diagram && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">Aucun diagramme BPMN pour ce processus</p>
            {canEdit && (
              <Button onClick={createDiagram}>
                <Plus className="mr-2 h-4 w-4" /> Créer un diagramme
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {diagram && diagram.donnees && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {diagram.nom}
                  <Badge variant="outline">v{diagram.version}</Badge>
                  <Badge variant="secondary">{diagram.statut}</Badge>
                </CardTitle>
                {canEdit && (
                  <Button onClick={saveDiagram} disabled={saving} size="sm">
                    {saving ? "Sauvegarde..." : "Sauvegarder"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {renderFlowDiagram()}
            </CardContent>
          </Card>

          {/* Node/Edge management */}
          {canEdit && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Nodes list */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Éléments ({nodes.length})</CardTitle>
                    <Dialog open={addNodeOpen} onOpenChange={setAddNodeOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline"><Plus className="mr-1 h-3 w-3" /> Ajouter</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Ajouter un élément</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={newNodeType} onValueChange={(v) => setNewNodeType(v as BpmnNodeType)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(NODE_TYPE_LABELS).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Libellé</Label>
                            <Input value={newNodeLabel} onChange={e => setNewNodeLabel(e.target.value)} placeholder="Nom de l'élément" />
                          </div>
                          <Button onClick={addNode} className="w-full">Ajouter</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {nodes.map(node => (
                      <div key={node.id} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{NODE_TYPE_LABELS[node.type]}</Badge>
                          <span className="text-sm">{node.label}</span>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeNode(node.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Edges list */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Flux ({edges.length})</CardTitle>
                    <Dialog open={addEdgeOpen} onOpenChange={setAddEdgeOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline"><ArrowRight className="mr-1 h-3 w-3" /> Ajouter</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Ajouter un flux</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>De</Label>
                            <Select value={edgeFrom} onValueChange={setEdgeFrom}>
                              <SelectTrigger><SelectValue placeholder="Élément source" /></SelectTrigger>
                              <SelectContent>
                                {nodes.map(n => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Vers</Label>
                            <Select value={edgeTo} onValueChange={setEdgeTo}>
                              <SelectTrigger><SelectValue placeholder="Élément cible" /></SelectTrigger>
                              <SelectContent>
                                {nodes.map(n => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Libellé (optionnel)</Label>
                            <Input value={edgeLabel} onChange={e => setEdgeLabel(e.target.value)} placeholder="ex: Oui / Non" />
                          </div>
                          <Button onClick={addEdge} className="w-full">Ajouter</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {edges.map(edge => (
                      <div key={edge.id} className="flex items-center justify-between p-2 rounded border">
                        <div className="flex items-center gap-2 text-sm">
                          <span>{getNodeLabel(edge.from)}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span>{getNodeLabel(edge.to)}</span>
                          {edge.label && <Badge variant="secondary" className="text-xs">{edge.label}</Badge>}
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeEdge(edge.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    {edges.length === 0 && <p className="text-sm text-muted-foreground">Aucun flux</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {!selectedProcessId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Sélectionnez un processus pour afficher ou créer son diagramme BPMN
          </CardContent>
        </Card>
      )}
    </div>
  );
}
