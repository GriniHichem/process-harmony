import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Wand2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BpmnNode, BpmnEdge, BpmnData, BpmnDiagram, BpmnNodeType, NODE_DEFAULTS } from "@/components/bpmn/types";
import BpmnToolbar from "@/components/bpmn/BpmnToolbar";
import BpmnCanvas, { BpmnCanvasHandle } from "@/components/bpmn/BpmnCanvas";
import BpmnPropertiesPanel from "@/components/bpmn/BpmnPropertiesPanel";
import { generateBpmnFromTasks } from "@/lib/generateBpmnFromTasks";
import { exportBpmnDiagram } from "@/lib/exportBpmnDiagram";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type ToolMode = "select" | "connect" | "delete";

export default function Bpmn() {
  const { hasRole } = useAuth();
  const [processes, setProcesses] = useState<{ id: string; nom: string }[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState("");
  const [diagram, setDiagram] = useState<BpmnDiagram | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<ToolMode>("select");
  const [zoom, setZoom] = useState(1);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [history, setHistory] = useState<BpmnData[]>([]);
  const [generating, setGenerating] = useState(false);
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);
  const canEdit = hasRole("admin") || hasRole("rmq") || hasRole("responsable_processus") || hasRole("consultant");
  const canvasRef = useRef<BpmnCanvasHandle>(null);

  const handleExport = useCallback(async (format: "png" | "pdf") => {
    const svg = canvasRef.current?.getSvgElement();
    if (!svg) { toast.error("Aucun diagramme à exporter"); return; }
    const processName = processes.find(p => p.id === selectedProcessId)?.nom ?? "bpmn";
    try {
      await exportBpmnDiagram(svg, format, `BPMN-${processName}`);
      toast.success(`Diagramme exporté en ${format.toUpperCase()}`);
    } catch (err) {
      toast.error("Erreur lors de l'export");
    }
  }, [processes, selectedProcessId]);

  useEffect(() => {
    supabase.from("processes").select("id, nom").neq("statut", "archive").order("nom").then(({ data }) => {
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
      const d: BpmnDiagram = { ...raw, donnees: raw.donnees as unknown as BpmnData | null };
      setDiagram(d);
      if (d.donnees) setHistory([d.donnees]);
    } else {
      setDiagram(null);
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    if (selectedProcessId) fetchDiagram(selectedProcessId);
    else { setDiagram(null); setHistory([]); }
  }, [selectedProcessId, fetchDiagram]);

  const updateData = useCallback((newData: BpmnData) => {
    if (!diagram) return;
    setDiagram({ ...diagram, donnees: newData });
    setHistory(prev => [...prev.slice(-20), newData]);
  }, [diagram]);

  const nodes = diagram?.donnees?.nodes ?? [];
  const edges = diagram?.donnees?.edges ?? [];

  const createDiagram = async () => {
    if (!selectedProcessId) return;
    const processName = processes.find(p => p.id === selectedProcessId)?.nom ?? "Diagramme";
    const defaultData: BpmnData = {
      nodes: [
        { id: "n1", type: "start", label: "Début", x: 60, y: 200 },
        { id: "n2", type: "task", label: "Activité 1", x: 180, y: 170 },
        { id: "n3", type: "end", label: "Fin", x: 400, y: 200 },
      ],
      edges: [
        { id: "e1", from: "n1", to: "n2" },
        { id: "e2", from: "n2", to: "n3" },
      ],
    };
    const { error } = await supabase.from("bpmn_diagrams").insert([{
      nom: `BPMN - ${processName}`,
      process_id: selectedProcessId,
      donnees: defaultData as unknown as null,
    }]);
    if (error) { toast.error(error.message); return; }
    toast.success("Diagramme créé");
    fetchDiagram(selectedProcessId);
  };

  const saveDiagram = async () => {
    if (!diagram) return;
    setSaving(true);
    const { error } = await supabase.from("bpmn_diagrams").update({
      donnees: diagram.donnees as unknown as null,
    }).eq("id", diagram.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Diagramme sauvegardé");
  };

  const handleAddNode = (type: BpmnNodeType) => {
    if (!diagram?.donnees) return;
    const def = NODE_DEFAULTS[type];
    const maxX = Math.max(...nodes.map(n => n.x + (n.width ?? NODE_DEFAULTS[n.type].width)), 100);
    const newNode: BpmnNode = {
      id: `n${Date.now()}`,
      type,
      label: def.label,
      x: maxX + 40,
      y: 180,
      width: def.width,
      height: def.height,
    };
    updateData({ ...diagram.donnees, nodes: [...nodes, newNode] });
  };

  const handleNodeDelete = (nodeId: string) => {
    if (!diagram?.donnees) return;
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    updateData({
      nodes: nodes.filter(n => n.id !== nodeId),
      edges: edges.filter(e => e.from !== nodeId && e.to !== nodeId),
    });
  };

  const handleEdgeAdd = (from: string, to: string) => {
    if (!diagram?.donnees) return;
    if (edges.some(e => e.from === from && e.to === to)) {
      toast.error("Ce lien existe déjà");
      return;
    }
    updateData({
      ...diagram.donnees,
      edges: [...edges, { id: `e${Date.now()}`, from, to }],
    });
  };

  const handleEdgeDelete = (edgeId: string) => {
    if (!diagram?.donnees) return;
    updateData({ ...diagram.donnees, edges: edges.filter(e => e.id !== edgeId) });
  };

  const handleNodeLabelChange = (nodeId: string, label: string) => {
    if (!diagram?.donnees) return;
    updateData({ ...diagram.donnees, nodes: nodes.map(n => n.id === nodeId ? { ...n, label } : n) });
  };

  const handleUndo = () => {
    if (history.length <= 1 || !diagram) return;
    const prev = history[history.length - 2];
    setHistory(h => h.slice(0, -1));
    setDiagram({ ...diagram, donnees: prev });
  };

  const doGenerate = async () => {
    if (!selectedProcessId) return;
    setGenerating(true);
    try {
      const [{ data: tasks }, { data: elements }, { data: docLinks }] = await Promise.all([
        supabase.from("process_tasks").select("*").eq("process_id", selectedProcessId).order("ordre"),
        supabase.from("process_elements").select("*").eq("process_id", selectedProcessId),
        supabase.from("document_processes").select("document_id, documents(id, titre)").eq("process_id", selectedProcessId),
      ]);

      if (!tasks || tasks.length === 0) {
        toast.error("Aucune activité trouvée pour ce processus. Ajoutez des activités d'abord.");
        setGenerating(false);
        return;
      }

      // Build documents list from linked documents
      const allDocs: { id: string; titre: string }[] = [];
      if (docLinks) {
        for (const link of docLinks) {
          const doc = link.documents as unknown as { id: string; titre: string } | null;
          if (doc) allDocs.push(doc);
        }
      }

      const bpmnData = generateBpmnFromTasks(
        tasks.map(t => ({
          id: t.id,
          code: t.code,
          description: t.description,
          type_flux: t.type_flux as "sequentiel" | "conditionnel" | "parallele" | "inclusif",
          condition: t.condition,
          parent_code: t.parent_code,
          entrees: t.entrees,
          sorties: t.sorties,
          ordre: t.ordre,
          documents: t.documents,
        })),
        (elements ?? []).map(e => ({
          id: e.id,
          code: e.code,
          description: e.description,
          type: e.type,
        })),
        allDocs
      );

      if (diagram) {
        // Update existing diagram
        updateData(bpmnData);
      } else {
        // Create new diagram with generated data
        const processName = processes.find(p => p.id === selectedProcessId)?.nom ?? "Diagramme";
        const { error } = await supabase.from("bpmn_diagrams").insert([{
          nom: `BPMN - ${processName}`,
          process_id: selectedProcessId,
          donnees: bpmnData as unknown as null,
        }]);
        if (error) { toast.error(error.message); setGenerating(false); return; }
        await fetchDiagram(selectedProcessId);
      }

      toast.success("Diagramme généré depuis les activités du processus");
    } catch (err) {
      toast.error("Erreur lors de la génération");
    }
    setGenerating(false);
  };

  const handleGenerate = () => {
    if (diagram?.donnees && diagram.donnees.nodes.length > 0) {
      setShowGenerateConfirm(true);
    } else {
      doGenerate();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Modélisation BPMN</h1>
        <p className="text-muted-foreground">Diagrammes de flux des processus selon la norme BPMN 2.0</p>
      </div>

      {/* Process selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label>Processus</Label>
              <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
                <SelectTrigger><SelectValue placeholder="Choisir un processus..." /></SelectTrigger>
                <SelectContent>
                  {processes.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProcessId && diagram && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">v{diagram.version}</Badge>
                <Badge variant="secondary">{diagram.statut}</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* No diagram */}
      {selectedProcessId && !diagram && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <p className="text-muted-foreground">Aucun diagramme BPMN pour ce processus</p>
            {canEdit && (
              <div className="flex justify-center gap-3">
                <Button onClick={createDiagram}>
                  <Plus className="mr-2 h-4 w-4" /> Créer un diagramme vide
                </Button>
                <Button variant="outline" onClick={doGenerate} disabled={generating}>
                  <Wand2 className="mr-2 h-4 w-4" />
                  {generating ? "Génération..." : "Générer depuis les activités"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Diagram editor */}
      {diagram?.donnees && (
        <>
          <BpmnToolbar
            mode={mode}
            onModeChange={setMode}
            onAddNode={handleAddNode}
            onZoomIn={() => setZoom(z => Math.min(z + 0.15, 3))}
            onZoomOut={() => setZoom(z => Math.max(z - 0.15, 0.3))}
            onFitView={() => { setZoom(1); }}
            onSave={saveDiagram}
            onUndo={handleUndo}
            onGenerate={handleGenerate}
            onExport={handleExport}
            saving={saving}
            generating={generating}
            canEdit={canEdit}
          />

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            <BpmnCanvas
              ref={canvasRef}
              nodes={nodes}
              edges={edges}
              mode={mode}
              zoom={zoom}
              onNodesChange={(n) => updateData({ nodes: n, edges })}
              onEdgesChange={(e) => updateData({ nodes, edges: e })}
              onEdgeAdd={handleEdgeAdd}
              onNodeDelete={handleNodeDelete}
              onEdgeDelete={handleEdgeDelete}
              onNodeSelect={setSelectedNodeId}
              selectedNodeId={selectedNodeId}
              canEdit={canEdit}
            />

            <BpmnPropertiesPanel
              nodes={nodes}
              edges={edges}
              selectedNodeId={selectedNodeId}
              onNodeLabelChange={handleNodeLabelChange}
              onNodeDelete={handleNodeDelete}
              onEdgeDelete={handleEdgeDelete}
              canEdit={canEdit}
            />
          </div>
        </>
      )}

      {!selectedProcessId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Sélectionnez un processus pour afficher ou créer son diagramme BPMN
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showGenerateConfirm} onOpenChange={setShowGenerateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remplacer le diagramme existant ?</AlertDialogTitle>
            <AlertDialogDescription>
              La génération va remplacer le diagramme actuel par un nouveau basé sur les activités du processus. Cette action est irréversible si vous sauvegardez ensuite.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={doGenerate}>Générer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
