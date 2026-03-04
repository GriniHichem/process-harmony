import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, BarChart3, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Indicator = { id: string; nom: string; formule: string | null; unite: string | null; cible: number | null; seuil_alerte: number | null; frequence: string; process_id: string };

export default function Indicateurs() {
  const { role } = useAuth();
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [processes, setProcesses] = useState<{id: string; nom: string}[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newInd, setNewInd] = useState({ nom: "", formule: "", unite: "", cible: "", seuil_alerte: "", frequence: "mensuel", process_id: "" });

  const canCreate = role === "rmq" || role === "responsable_processus";

  const fetchData = async () => {
    const [indRes, procRes] = await Promise.all([
      supabase.from("indicators").select("*").order("nom"),
      supabase.from("processes").select("id, nom").order("nom"),
    ]);
    setIndicators((indRes.data ?? []) as Indicator[]);
    setProcesses(procRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!newInd.nom || !newInd.process_id) { toast.error("Nom et processus requis"); return; }
    const { error } = await supabase.from("indicators").insert({
      nom: newInd.nom,
      formule: newInd.formule || null,
      unite: newInd.unite || null,
      cible: newInd.cible ? Number(newInd.cible) : null,
      seuil_alerte: newInd.seuil_alerte ? Number(newInd.seuil_alerte) : null,
      frequence: newInd.frequence as any,
      process_id: newInd.process_id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Indicateur créé");
    setDialogOpen(false);
    setNewInd({ nom: "", formule: "", unite: "", cible: "", seuil_alerte: "", frequence: "mensuel", process_id: "" });
    fetchData();
  };

  const getProcessName = (id: string) => processes.find((p) => p.id === id)?.nom ?? "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Indicateurs</h1>
          <p className="text-muted-foreground">Suivi de la performance des processus</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nouvel indicateur</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer un indicateur</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Nom</Label><Input value={newInd.nom} onChange={(e) => setNewInd({ ...newInd, nom: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Processus</Label>
                  <Select value={newInd.process_id} onValueChange={(v) => setNewInd({ ...newInd, process_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Cible</Label><Input type="number" value={newInd.cible} onChange={(e) => setNewInd({ ...newInd, cible: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Seuil d'alerte</Label><Input type="number" value={newInd.seuil_alerte} onChange={(e) => setNewInd({ ...newInd, seuil_alerte: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Unité</Label><Input value={newInd.unite} onChange={(e) => setNewInd({ ...newInd, unite: e.target.value })} placeholder="%" /></div>
                  <div className="space-y-2"><Label>Formule</Label><Input value={newInd.formule} onChange={(e) => setNewInd({ ...newInd, formule: e.target.value })} /></div>
                </div>
                <Button onClick={handleCreate} className="w-full">Créer</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : indicators.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun indicateur défini</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {indicators.map((ind) => (
            <Card key={ind.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  {ind.nom}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Processus : {getProcessName(ind.process_id)}</p>
                  {ind.cible != null && <p>Cible : {ind.cible} {ind.unite}</p>}
                  {ind.seuil_alerte != null && <p className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-warning" /> Seuil : {ind.seuil_alerte} {ind.unite}</p>}
                  <p>Fréquence : {ind.frequence}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
