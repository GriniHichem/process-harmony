import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, AlertTriangle, Lightbulb } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Risk = { id: string; type: "risque" | "opportunite"; description: string; probabilite: number | null; impact: number | null; criticite: number | null; statut: string; process_id: string };

export default function Risques() {
  const { role } = useAuth();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [processes, setProcesses] = useState<{id: string; nom: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRisk, setNewRisk] = useState({ type: "risque" as const, description: "", probabilite: "3", impact: "3", process_id: "" });

  const canCreate = role === "rmq" || role === "responsable_processus" || role === "consultant";

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

  const criticityColor = (c: number | null) => {
    if (!c) return "";
    if (c >= 16) return "text-destructive";
    if (c >= 9) return "text-warning";
    return "text-success";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Risques & Opportunités</h1>
          <p className="text-muted-foreground">Évaluation par processus</p>
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
                  <div className="space-y-2"><Label>Impact (1-5)</Label><Input type="number" min="1" max="5" value={newRisk.impact} onChange={(e) => setNewRisk({ ...newRisk, impact: e.target.value })} /></div>
                </div>
                <Button onClick={handleCreate} className="w-full">Ajouter</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : risks.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun risque ou opportunité identifié</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {risks.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  {r.type === "risque" ? <AlertTriangle className="h-5 w-5 text-destructive" /> : <Lightbulb className="h-5 w-5 text-accent" />}
                  <div>
                    <p className="font-medium">{r.description}</p>
                    <p className="text-xs text-muted-foreground">P:{r.probabilite} × I:{r.impact}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${criticityColor(r.criticite)}`}>{r.criticite ?? "-"}</span>
                  <Badge variant={r.type === "risque" ? "destructive" : "secondary"}>{r.type}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
