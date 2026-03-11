import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import RichTextEditor from "@/components/RichTextEditor";

const statutColors: Record<string, string> = {
  planifiee: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  realisee: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cloturee: "bg-muted text-muted-foreground",
};
const statutLabels: Record<string, string> = { planifiee: "Planifiée", realisee: "Réalisée", cloturee: "Clôturée" };

const emptyForm = { reference: "", date_revue: "", participants: "", elements_entree: "", decisions: "", actions_decidees: "", statut: "planifiee", compte_rendu: "", prochaine_revue: "" };

export default function RevueDirection() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("admin") || hasRole("rmq");
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: reviews = [] } = useQuery({
    queryKey: ["management_reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("management_reviews").select("*").order("date_revue", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMut = useMutation({
    mutationFn: async (f: typeof form & { id?: string }) => {
      const payload = { reference: f.reference, date_revue: f.date_revue || null, participants: f.participants, elements_entree: f.elements_entree, decisions: f.decisions, actions_decidees: f.actions_decidees, statut: f.statut, compte_rendu: f.compte_rendu, prochaine_revue: f.prochaine_revue || null };
      if (f.id) {
        const { error } = await supabase.from("management_reviews").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("management_reviews").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["management_reviews"] }); setDialog(false); toast({ title: "Revue de direction enregistrée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("management_reviews").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["management_reviews"] }); toast({ title: "Revue supprimée" }); },
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialog(true); };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ reference: r.reference, date_revue: r.date_revue || "", participants: r.participants, elements_entree: r.elements_entree, decisions: r.decisions, actions_decidees: r.actions_decidees, statut: r.statut, compte_rendu: r.compte_rendu, prochaine_revue: r.prochaine_revue || "" });
    setDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revue de direction</h1>
        </div>
        {canEdit && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nouvelle revue</Button>}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Réf.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Prochaine revue</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucune revue de direction enregistrée.</TableCell></TableRow>
            ) : reviews.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                <TableCell>{r.date_revue ? format(new Date(r.date_revue), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate">{r.participants?.replace(/<[^>]*>/g, '') || "—"}</TableCell>
                <TableCell><Badge className={statutColors[r.statut]}>{statutLabels[r.statut]}</Badge></TableCell>
                <TableCell>{r.prochaine_revue ? format(new Date(r.prochaine_revue), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setViewing(r); setViewDialog(true); }}><Eye className="h-4 w-4" /></Button>
                    {canEdit && <>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Revue de direction — {viewing?.reference}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground">Date</Label><p className="text-sm">{viewing.date_revue ? format(new Date(viewing.date_revue), "dd/MM/yyyy") : "—"}</p></div>
                <div><Label className="text-xs text-muted-foreground">Statut</Label><Badge className={statutColors[viewing.statut]}>{statutLabels[viewing.statut]}</Badge></div>
              </div>
              <div><Label className="text-xs text-muted-foreground">Participants</Label><div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: viewing.participants || "—" }} /></div>
              <div><Label className="text-xs text-muted-foreground">Éléments d'entrée</Label><div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: viewing.elements_entree || "—" }} /></div>
              <div><Label className="text-xs text-muted-foreground">Décisions et actions</Label><div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: viewing.decisions || "—" }} /></div>
              <div><Label className="text-xs text-muted-foreground">Actions décidées</Label><div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: viewing.actions_decidees || "—" }} /></div>
              <div><Label className="text-xs text-muted-foreground">Compte rendu</Label><div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: viewing.compte_rendu || "—" }} /></div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouvelle"} revue de direction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Référence</Label><Input value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="RD-2026-01" /></div>
              <div><Label>Date de revue</Label><Input type="date" value={form.date_revue} onChange={e => setForm(f => ({ ...f, date_revue: e.target.value }))} /></div>
              <div><Label>Statut</Label>
                <Select value={form.statut} onValueChange={v => setForm(f => ({ ...f, statut: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planifiee">Planifiée</SelectItem>
                    <SelectItem value="realisee">Réalisée</SelectItem>
                    <SelectItem value="cloturee">Clôturée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Participants</Label>
              <RichTextEditor value={form.participants} onChange={v => setForm(f => ({ ...f, participants: v }))} placeholder="Noms et fonctions des participants..." minHeight="80px" />
            </div>
            <div>
              <Label>Éléments d'entrée</Label>
              <RichTextEditor value={form.elements_entree} onChange={v => setForm(f => ({ ...f, elements_entree: v }))} placeholder="État des actions, modifications des enjeux, performance des processus..." minHeight="120px" />
            </div>
            <div>
              <Label>Décisions</Label>
              <RichTextEditor value={form.decisions} onChange={v => setForm(f => ({ ...f, decisions: v }))} placeholder="Décisions prises lors de la revue..." minHeight="100px" />
            </div>
            <div>
              <Label>Actions décidées</Label>
              <RichTextEditor value={form.actions_decidees} onChange={v => setForm(f => ({ ...f, actions_decidees: v }))} placeholder="Actions à mettre en œuvre..." minHeight="80px" />
            </div>
            <div>
              <Label>Compte rendu</Label>
              <RichTextEditor value={form.compte_rendu} onChange={v => setForm(f => ({ ...f, compte_rendu: v }))} placeholder="Compte rendu de la revue..." minHeight="100px" />
            </div>
            <div><Label>Prochaine revue</Label><Input type="date" value={form.prochaine_revue} onChange={e => setForm(f => ({ ...f, prochaine_revue: e.target.value }))} /></div>
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
