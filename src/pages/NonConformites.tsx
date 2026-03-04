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
import { Plus, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type NC = { id: string; reference: string; description: string; gravite: string; statut: string; origine: string | null; date_detection: string };

const graviteColors: Record<string, string> = {
  mineure: "bg-warning/20 text-warning",
  majeure: "bg-destructive/20 text-destructive",
  critique: "bg-destructive text-destructive-foreground",
};

export default function NonConformites() {
  const { role } = useAuth();
  const [ncs, setNcs] = useState<NC[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newNC, setNewNC] = useState({ reference: "", description: "", gravite: "mineure", origine: "" });

  const canCreate = role === "rmq" || role === "responsable_processus" || role === "auditeur";

  const fetchNCs = async () => {
    const { data } = await supabase.from("nonconformities").select("*").order("date_detection", { ascending: false });
    setNcs((data ?? []) as NC[]);
    setLoading(false);
  };

  useEffect(() => { fetchNCs(); }, []);

  const handleCreate = async () => {
    if (!newNC.reference || !newNC.description) { toast.error("Référence et description requises"); return; }
    const { error } = await supabase.from("nonconformities").insert({
      reference: newNC.reference,
      description: newNC.description,
      gravite: newNC.gravite as any,
      origine: newNC.origine || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Non-conformité enregistrée");
    setDialogOpen(false);
    setNewNC({ reference: "", description: "", gravite: "mineure", origine: "" });
    fetchNCs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Non-conformités</h1><p className="text-muted-foreground">Suivi des écarts qualité</p></div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Enregistrer NC</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Enregistrer une non-conformité</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Référence</Label><Input value={newNC.reference} onChange={(e) => setNewNC({ ...newNC, reference: e.target.value })} placeholder="NC-2026-001" /></div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={newNC.description} onChange={(e) => setNewNC({ ...newNC, description: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Gravité</Label>
                  <Select value={newNC.gravite} onValueChange={(v) => setNewNC({ ...newNC, gravite: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mineure">Mineure</SelectItem>
                      <SelectItem value="majeure">Majeure</SelectItem>
                      <SelectItem value="critique">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Origine</Label><Input value={newNC.origine} onChange={(e) => setNewNC({ ...newNC, origine: e.target.value })} placeholder="Audit, réclamation, interne..." /></div>
                <Button onClick={handleCreate} className="w-full">Enregistrer</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : ncs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune non-conformité</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {ncs.map((nc) => (
            <Card key={nc.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium">{nc.reference}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{nc.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={graviteColors[nc.gravite] ?? ""}>{nc.gravite}</Badge>
                  <Badge variant="outline">{nc.statut.replace("_", " ")}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
