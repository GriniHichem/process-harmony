import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, AlertTriangle, Lightbulb, Trash2, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RiskMoyensActions } from "@/components/RiskMoyensActions";
import { RiskIncidents } from "@/components/RiskIncidents";

type Risk = { id: string; type: "risque" | "opportunite"; description: string; probabilite: number | null; impact: number | null; criticite: number | null; statut: string; process_id: string };

export default function Risques() {
  const { role } = useAuth();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [processes, setProcesses] = useState<{id: string; nom: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRisk, setNewRisk] = useState({ type: "risque" as const, description: "", probabilite: "3", impact: "3", process_id: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterProcessId, setFilterProcessId] = useState<string>("all");

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRisk, setEditRisk] = useState<{ id: string; type: string; description: string; probabilite: string; impact: string; process_id: string } | null>(null);

  const canCreate = role === "admin" || role === "rmq" || role === "responsable_processus" || role === "consultant";
  const canDelete = role === "admin" || role === "rmq";
  const canEditActions = role === "admin" || role === "rmq" || role === "responsable_processus";

  const fetchData = async () => {
    const [rRes, pRes] = await Promise.all([
      supabase.from("risks_opportunities").select("*").order("criticite", { ascending: false }),
      supabase.from("processes").select("id, nom").order("nom"),
    ]);
    setRisks((rRes.data ?? []) as Risk[]);
    setProcesses(pRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!newRisk.description || !newRisk.process_id) { toast.error("Description et processus requis"); return; }
    const { error } = await supabase.from("risks_opportunities").insert({
      type: newRisk.type,
      description: newRisk.description,
      probabilite: Number(newRisk.probabilite),
      impact: Number(newRisk.impact),
      process_id: newRisk.process_id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Élément ajouté");
    setDialogOpen(false);
    fetchData();
  };

  const handleEdit = (r: Risk) => {
    setEditRisk({
      id: r.id,
      type: r.type,
      description: r.description,
      probabilite: String(r.probabilite ?? 3),
      impact: String(r.impact ?? 3),
      process_id: r.process_id,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editRisk) return;
    if (!editRisk.description || !editRisk.process_id) { toast.error("Description et processus requis"); return; }
    const { error } = await supabase.from("risks_opportunities").update({
      type: editRisk.type as any,
      description: editRisk.description,
      probabilite: Number(editRisk.probabilite),
      impact: Number(editRisk.impact),
      process_id: editRisk.process_id,
    }).eq("id", editRisk.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Élément modifié");
    setEditDialogOpen(false);
    setEditRisk(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("risks_opportunities").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Élément supprimé");
    if (expandedId === id) setExpandedId(null);
    fetchData();
  };

  const criticityColor = (c: number | null) => {
    if (!c) return "";
    if (c >= 16) return "text-destructive";
    if (c >= 9) return "text-warning";
    return "text-success";
  };

  const filteredRisks = risks.filter((r) => filterProcessId === "all" || r.process_id === filterProcessId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Risques & Opportunités</h1>
          <p className="text-muted-foreground">Évaluation par processus — cliquez pour voir les actions & moyens</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Ajouter</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ajouter un risque / opportunité</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newRisk.type} onValueChange={(v: any) => setNewRisk({ ...newRisk, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="risque">Risque</SelectItem>
                      <SelectItem value="opportunite">Opportunité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={newRisk.description} onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Processus</Label>
                  <Select value={newRisk.process_id} onValueChange={(v) => setNewRisk({ ...newRisk, process_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Probabilité (1-5)</Label><Input type="number" min="1" max="5" value={newRisk.probabilite} onChange={(e) => setNewRisk({ ...newRisk, probabilite: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Gravité (1-4)</Label><Input type="number" min="1" max="4" value={newRisk.impact} onChange={(e) => setNewRisk({ ...newRisk, impact: e.target.value })} /></div>
                </div>
                <Button onClick={handleCreate} className="w-full">Ajouter</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm whitespace-nowrap">Filtrer par processus</Label>
        <Select value={filterProcessId} onValueChange={setFilterProcessId}>
          <SelectTrigger className="w-[250px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les processus</SelectItem>
            {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filteredRisks.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun risque ou opportunité identifié</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filteredRisks.map((r) => {
            const isExpanded = expandedId === r.id;
            return (
              <Card key={r.id} className={`transition-shadow ${isExpanded ? "ring-2 ring-primary/30 shadow-md" : ""}`}>
                <CardContent className="py-4">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      {r.type === "risque" ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <Lightbulb className="h-5 w-5 text-accent" />}
                      <div>
                        <p className="font-medium">{r.description}</p>
                        <p className="text-xs text-muted-foreground">P:{r.probabilite} × G:{r.impact}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${criticityColor(r.criticite)}`}>{r.criticite ?? "-"}</span>
                      <Badge variant={r.type === "risque" ? "destructive" : "secondary"}>{r.type}</Badge>
                      {canCreate && (
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); handleEdit(r); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cet élément ?</AlertDialogTitle>
                              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 border-t pt-4 space-y-6">
                      <RiskMoyensActions riskId={r.id} canEdit={canEditActions} />
                      <div className="border-t pt-4">
                        <RiskIncidents riskId={r.id} canEdit={canEditActions} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditRisk(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier le risque / opportunité</DialogTitle></DialogHeader>
          {editRisk && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editRisk.type} onValueChange={(v) => setEditRisk({ ...editRisk, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="risque">Risque</SelectItem>
                    <SelectItem value="opportunite">Opportunité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={editRisk.description} onChange={(e) => setEditRisk({ ...editRisk, description: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Processus</Label>
                <Select value={editRisk.process_id} onValueChange={(v) => setEditRisk({ ...editRisk, process_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Probabilité (1-5)</Label><Input type="number" min="1" max="5" value={editRisk.probabilite} onChange={(e) => setEditRisk({ ...editRisk, probabilite: e.target.value })} /></div>
                <div className="space-y-2"><Label>Gravité (1-4)</Label><Input type="number" min="1" max="4" value={editRisk.impact} onChange={(e) => setEditRisk({ ...editRisk, impact: e.target.value })} /></div>
              </div>
              <Button onClick={handleUpdate} className="w-full">Enregistrer</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
