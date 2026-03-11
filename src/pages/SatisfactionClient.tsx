import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const statutColors: Record<string, string> = {
  planifiee: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  en_cours: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  terminee: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  analysee: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};
const statutLabels: Record<string, string> = { planifiee: "Planifiée", en_cours: "En cours", terminee: "Terminée", analysee: "Analysée" };
const typeLabels: Record<string, string> = { questionnaire: "Questionnaire", entretien: "Entretien", reclamation: "Réclamation", retour_client: "Retour client" };

const emptyForm = { reference: "", titre: "", date_enquete: "", type_enquete: "questionnaire", score_global: "", nombre_reponses: 0, analyse_resultats: "", actions_prevues: "", statut: "planifiee" };

export default function SatisfactionClient() {
  const { hasRole } = useAuth();
  const canEdit = hasPermission("satisfaction_client", "can_edit");
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: surveys = [] } = useQuery({
    queryKey: ["satisfaction_surveys"],
    queryFn: async () => {
      const { data, error } = await supabase.from("satisfaction_surveys").select("*").order("date_enquete", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMut = useMutation({
    mutationFn: async (f: typeof form & { id?: string }) => {
      const payload = { reference: f.reference, titre: f.titre, date_enquete: f.date_enquete || new Date().toISOString().split("T")[0], type_enquete: f.type_enquete, score_global: f.score_global ? parseFloat(f.score_global) : null, nombre_reponses: f.nombre_reponses, analyse_resultats: f.analyse_resultats, actions_prevues: f.actions_prevues, statut: f.statut };
      if (f.id) { const { error } = await supabase.from("satisfaction_surveys").update(payload).eq("id", f.id); if (error) throw error; }
      else { const { error } = await supabase.from("satisfaction_surveys").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["satisfaction_surveys"] }); setDialog(false); toast({ title: "Enquête enregistrée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("satisfaction_surveys").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["satisfaction_surveys"] }); toast({ title: "Enquête supprimée" }); },
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialog(true); };
  const openEdit = (s: any) => {
    setEditing(s);
    setForm({ reference: s.reference, titre: s.titre, date_enquete: s.date_enquete || "", type_enquete: s.type_enquete, score_global: s.score_global?.toString() || "", nombre_reponses: s.nombre_reponses, analyse_resultats: s.analyse_resultats, actions_prevues: s.actions_prevues, statut: s.statut });
    setDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Satisfaction client</h1>
          
        </div>
        {canEdit && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nouvelle enquête</Button>}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Réf.</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Réponses</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {surveys.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Aucune enquête de satisfaction.</TableCell></TableRow>
            ) : surveys.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-xs">{s.reference}</TableCell>
                <TableCell className="max-w-[180px] truncate">{s.titre}</TableCell>
                <TableCell>{format(new Date(s.date_enquete), "dd/MM/yyyy")}</TableCell>
                <TableCell>{typeLabels[s.type_enquete] || s.type_enquete}</TableCell>
                <TableCell className="font-semibold">{s.score_global != null ? `${s.score_global}%` : "—"}</TableCell>
                <TableCell>{s.nombre_reponses}</TableCell>
                <TableCell><Badge className={statutColors[s.statut]}>{statutLabels[s.statut]}</Badge></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setViewing(s); setViewDialog(true); }}><Eye className="h-4 w-4" /></Button>
                    {canEdit && <>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* View */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{viewing?.titre}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-4">
                <div><Label className="text-xs text-muted-foreground">Référence</Label><p className="text-sm">{viewing.reference}</p></div>
                <div><Label className="text-xs text-muted-foreground">Score global</Label><p className="text-sm font-semibold">{viewing.score_global != null ? `${viewing.score_global}%` : "—"}</p></div>
                <div><Label className="text-xs text-muted-foreground">Réponses</Label><p className="text-sm">{viewing.nombre_reponses}</p></div>
              </div>
              <div><Label className="text-xs text-muted-foreground">Analyse des résultats</Label><p className="text-sm whitespace-pre-wrap">{viewing.analyse_resultats || "—"}</p></div>
              <div><Label className="text-xs text-muted-foreground">Actions prévues</Label><p className="text-sm whitespace-pre-wrap">{viewing.actions_prevues || "—"}</p></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouvelle"} enquête de satisfaction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Référence</Label><Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="SAT-001" /></div>
              <div><Label>Date</Label><Input type="date" value={form.date_enquete} onChange={e => setForm(f => ({ ...f, date_enquete: e.target.value }))} /></div>
              <div><Label>Type</Label>
                <Select value={form.type_enquete} onValueChange={v => setForm(f => ({ ...f, type_enquete: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="questionnaire">Questionnaire</SelectItem>
                    <SelectItem value="entretien">Entretien</SelectItem>
                    <SelectItem value="reclamation">Réclamation</SelectItem>
                    <SelectItem value="retour_client">Retour client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Titre</Label><Input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Score global (%)</Label><Input type="number" value={form.score_global} onChange={e => setForm(f => ({ ...f, score_global: e.target.value }))} /></div>
              <div><Label>Nombre de réponses</Label><Input type="number" value={form.nombre_reponses} onChange={e => setForm(f => ({ ...f, nombre_reponses: parseInt(e.target.value) || 0 }))} /></div>
              <div><Label>Statut</Label>
                <Select value={form.statut} onValueChange={v => setForm(f => ({ ...f, statut: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planifiee">Planifiée</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="terminee">Terminée</SelectItem>
                    <SelectItem value="analysee">Analysée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Analyse des résultats</Label><Textarea rows={4} value={form.analyse_resultats} onChange={e => setForm(f => ({ ...f, analyse_resultats: e.target.value }))} /></div>
            <div><Label>Actions prévues</Label><Textarea rows={3} value={form.actions_prevues} onChange={e => setForm(f => ({ ...f, actions_prevues: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>Annuler</Button>
            <Button onClick={() => saveMut.mutate({ ...form, id: editing?.id })} disabled={saveMut.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
