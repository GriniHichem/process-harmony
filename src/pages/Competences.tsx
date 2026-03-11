import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, GraduationCap, Award } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

const niveauColors: Record<string, string> = {
  debutant: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  intermediaire: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  avance: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  expert: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};
const niveauLabels: Record<string, string> = { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé", expert: "Expert" };
const efficaciteColors: Record<string, string> = {
  non_evaluee: "bg-muted text-muted-foreground",
  efficace: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  non_efficace: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};
const efficaciteLabels: Record<string, string> = { non_evaluee: "Non évaluée", efficace: "Efficace", non_efficace: "Non efficace" };

export default function Competences() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("admin") || hasRole("rmq");
  const qc = useQueryClient();

  const [compDialog, setCompDialog] = useState(false);
  const [editingComp, setEditingComp] = useState<any>(null);
  const [compForm, setCompForm] = useState({ acteur_id: "", competence: "", niveau: "debutant", date_evaluation: "", prochaine_evaluation: "", commentaire: "" });

  const [formDialog, setFormDialog] = useState(false);
  const [editingForm, setEditingForm] = useState<any>(null);
  const [formForm, setFormForm] = useState({ acteur_id: "", titre: "", description: "", date_formation: "", formateur: "", duree_heures: 0, efficacite: "non_evaluee", preuve: "", commentaire: "" });

  const { data: acteurs = [] } = useQuery({
    queryKey: ["acteurs_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("acteurs").select("id, fonction, organisation, type_acteur").eq("actif", true).order("fonction");
      if (error) throw error;
      return data;
    },
  });

  const { data: competences = [] } = useQuery({
    queryKey: ["competences"],
    queryFn: async () => {
      const { data, error } = await supabase.from("competences").select("*, acteurs(fonction, organisation)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: formations = [] } = useQuery({
    queryKey: ["formations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("formations").select("*, acteurs(fonction, organisation)").order("date_formation", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveCompMut = useMutation({
    mutationFn: async (f: typeof compForm & { id?: string }) => {
      const payload = { acteur_id: f.acteur_id, competence: f.competence, niveau: f.niveau, date_evaluation: f.date_evaluation || new Date().toISOString().split("T")[0], prochaine_evaluation: f.prochaine_evaluation || null, commentaire: f.commentaire };
      if (f.id) { const { error } = await supabase.from("competences").update(payload).eq("id", f.id); if (error) throw error; }
      else { const { error } = await supabase.from("competences").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["competences"] }); setCompDialog(false); toast({ title: "Compétence enregistrée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteCompMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("competences").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["competences"] }); toast({ title: "Compétence supprimée" }); },
  });

  const saveFormMut = useMutation({
    mutationFn: async (f: typeof formForm & { id?: string }) => {
      const payload = { acteur_id: f.acteur_id, titre: f.titre, description: f.description, date_formation: f.date_formation || new Date().toISOString().split("T")[0], formateur: f.formateur, duree_heures: f.duree_heures, efficacite: f.efficacite, preuve: f.preuve || null, commentaire: f.commentaire };
      if (f.id) { const { error } = await supabase.from("formations").update(payload).eq("id", f.id); if (error) throw error; }
      else { const { error } = await supabase.from("formations").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["formations"] }); setFormDialog(false); toast({ title: "Formation enregistrée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteFormMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("formations").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["formations"] }); toast({ title: "Formation supprimée" }); },
  });

  const getActeurLabel = (id: string) => { const a = acteurs.find((x: any) => x.id === id); return a ? `${a.fonction || ""} — ${a.organisation || ""}` : id; };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compétences & Formations</h1>
        <p className="text-muted-foreground">Clause 7.2 — Gestion des compétences, formations et évaluation de l'efficacité</p>
      </div>

      <Tabs defaultValue="competences">
        <TabsList>
          <TabsTrigger value="competences"><Award className="h-4 w-4 mr-1" />Compétences</TabsTrigger>
          <TabsTrigger value="formations"><GraduationCap className="h-4 w-4 mr-1" />Formations</TabsTrigger>
        </TabsList>

        <TabsContent value="competences" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Matrice des compétences</h2>
            {canEdit && <Button onClick={() => { setEditingComp(null); setCompForm({ acteur_id: "", competence: "", niveau: "debutant", date_evaluation: "", prochaine_evaluation: "", commentaire: "" }); setCompDialog(true); }}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>}
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acteur</TableHead>
                  <TableHead>Compétence</TableHead>
                  <TableHead>Niveau</TableHead>
                  <TableHead>Évaluation</TableHead>
                  <TableHead>Prochaine</TableHead>
                  {canEdit && <TableHead className="w-20">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {competences.length === 0 ? (
                  <TableRow><TableCell colSpan={canEdit ? 6 : 5} className="text-center text-muted-foreground py-8">Aucune compétence enregistrée.</TableCell></TableRow>
                ) : competences.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{c.acteurs?.fonction || "—"}</TableCell>
                    <TableCell>{c.competence}</TableCell>
                    <TableCell><Badge className={niveauColors[c.niveau]}>{niveauLabels[c.niveau]}</Badge></TableCell>
                    <TableCell>{format(new Date(c.date_evaluation), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{c.prochaine_evaluation ? format(new Date(c.prochaine_evaluation), "dd/MM/yyyy") : "—"}</TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingComp(c); setCompForm({ acteur_id: c.acteur_id, competence: c.competence, niveau: c.niveau, date_evaluation: c.date_evaluation, prochaine_evaluation: c.prochaine_evaluation || "", commentaire: c.commentaire }); setCompDialog(true); }}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteCompMut.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="formations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Registre des formations</h2>
            {canEdit && <Button onClick={() => { setEditingForm(null); setFormForm({ acteur_id: "", titre: "", description: "", date_formation: "", formateur: "", duree_heures: 0, efficacite: "non_evaluee", preuve: "", commentaire: "" }); setFormDialog(true); }}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>}
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Acteur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Formateur</TableHead>
                  <TableHead>Durée (h)</TableHead>
                  <TableHead>Efficacité</TableHead>
                  {canEdit && <TableHead className="w-20">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {formations.length === 0 ? (
                  <TableRow><TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-8">Aucune formation enregistrée.</TableCell></TableRow>
                ) : formations.map((f: any) => (
                  <TableRow key={f.id}>
                    <TableCell>{f.titre}</TableCell>
                    <TableCell className="text-sm">{f.acteurs?.fonction || "—"}</TableCell>
                    <TableCell>{format(new Date(f.date_formation), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{f.formateur}</TableCell>
                    <TableCell>{f.duree_heures}</TableCell>
                    <TableCell><Badge className={efficaciteColors[f.efficacite]}>{efficaciteLabels[f.efficacite]}</Badge></TableCell>
                    {canEdit && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setEditingForm(f); setFormForm({ acteur_id: f.acteur_id, titre: f.titre, description: f.description, date_formation: f.date_formation, formateur: f.formateur, duree_heures: f.duree_heures, efficacite: f.efficacite, preuve: f.preuve || "", commentaire: f.commentaire }); setFormDialog(true); }}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteFormMut.mutate(f.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Competence Dialog */}
      <Dialog open={compDialog} onOpenChange={setCompDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingComp ? "Modifier" : "Nouvelle"} compétence</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Acteur</Label>
              <Select value={compForm.acteur_id} onValueChange={v => setCompForm(f => ({ ...f, acteur_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un acteur" /></SelectTrigger>
                <SelectContent>{acteurs.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.fonction} — {a.organisation}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Compétence</Label><Input value={compForm.competence} onChange={e => setCompForm(f => ({ ...f, competence: e.target.value }))} /></div>
            <div><Label>Niveau</Label>
              <Select value={compForm.niveau} onValueChange={v => setCompForm(f => ({ ...f, niveau: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="debutant">Débutant</SelectItem>
                  <SelectItem value="intermediaire">Intermédiaire</SelectItem>
                  <SelectItem value="avance">Avancé</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date d'évaluation</Label><Input type="date" value={compForm.date_evaluation} onChange={e => setCompForm(f => ({ ...f, date_evaluation: e.target.value }))} /></div>
              <div><Label>Prochaine évaluation</Label><Input type="date" value={compForm.prochaine_evaluation} onChange={e => setCompForm(f => ({ ...f, prochaine_evaluation: e.target.value }))} /></div>
            </div>
            <div><Label>Commentaire</Label><Textarea value={compForm.commentaire} onChange={e => setCompForm(f => ({ ...f, commentaire: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompDialog(false)}>Annuler</Button>
            <Button onClick={() => saveCompMut.mutate({ ...compForm, id: editingComp?.id })} disabled={saveCompMut.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Formation Dialog */}
      <Dialog open={formDialog} onOpenChange={setFormDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingForm ? "Modifier" : "Nouvelle"} formation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Acteur</Label>
              <Select value={formForm.acteur_id} onValueChange={v => setFormForm(f => ({ ...f, acteur_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un acteur" /></SelectTrigger>
                <SelectContent>{acteurs.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.fonction} — {a.organisation}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Titre</Label><Input value={formForm.titre} onChange={e => setFormForm(f => ({ ...f, titre: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={formForm.description} onChange={e => setFormForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Date</Label><Input type="date" value={formForm.date_formation} onChange={e => setFormForm(f => ({ ...f, date_formation: e.target.value }))} /></div>
              <div><Label>Formateur</Label><Input value={formForm.formateur} onChange={e => setFormForm(f => ({ ...f, formateur: e.target.value }))} /></div>
              <div><Label>Durée (heures)</Label><Input type="number" value={formForm.duree_heures} onChange={e => setFormForm(f => ({ ...f, duree_heures: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <div><Label>Efficacité</Label>
              <Select value={formForm.efficacite} onValueChange={v => setFormForm(f => ({ ...f, efficacite: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="non_evaluee">Non évaluée</SelectItem>
                  <SelectItem value="efficace">Efficace</SelectItem>
                  <SelectItem value="non_efficace">Non efficace</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Commentaire</Label><Textarea value={formForm.commentaire} onChange={e => setFormForm(f => ({ ...f, commentaire: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormDialog(false)}>Annuler</Button>
            <Button onClick={() => saveFormMut.mutate({ ...formForm, id: editingForm?.id })} disabled={saveFormMut.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
