import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const efficaciteColors: Record<string, string> = {
  non_evaluee: "bg-muted text-muted-foreground",
  efficace: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  non_efficace: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};
const efficaciteLabels: Record<string, string> = { non_evaluee: "Non évaluée", efficace: "Efficace", non_efficace: "Non efficace" };
const typeFormationLabels: Record<string, string> = { individuelle: "Individuelle", collective: "Collective" };

interface Props {
  formations: any[];
  acteurs: any[];
  canEdit: boolean;
}

export function FormationsTab({ formations, acteurs, canEdit }: Props) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ acteur_id: "", profile_id: "", titre: "", description: "", date_formation: "", formateur: "", duree_heures: 0, cout: 0, efficacite: "non_evaluee", preuve: "", commentaire: "", type_formation: "individuelle", competence_liee: "", lier_competence: false });
  const [search, setSearch] = useState("");
  const [filterEfficacite, setFilterEfficacite] = useState("all");
  const [filterActeur, setFilterActeur] = useState("all");
  const [filterUser, setFilterUser] = useState("all");
  const [filterType, setFilterType] = useState("all");

  // All profiles for user filter
  const { data: allProfiles = [] } = useQuery({
    queryKey: ["all_profiles_active"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nom, prenom, acteur_id").eq("actif", true).order("nom");
      return data || [];
    },
  });

  // Profiles for selected acteur (in dialog)
  const { data: profilesForActeur = [] } = useQuery({
    queryKey: ["profiles_for_acteur", form.acteur_id],
    queryFn: async () => {
      if (!form.acteur_id) return [];
      const { data } = await supabase.from("profiles").select("id, nom, prenom, fonction").eq("acteur_id", form.acteur_id).eq("actif", true);
      return data || [];
    },
    enabled: !!form.acteur_id,
  });

  // Existing competences for autocomplete
  const { data: existingCompetences = [] } = useQuery({
    queryKey: ["competences_names"],
    queryFn: async () => {
      const { data } = await supabase.from("competences").select("competence");
      const unique = [...new Set((data || []).map((c: any) => c.competence).filter(Boolean))];
      return unique.sort();
    },
  });

  const handleActeurChange = (v: string) => {
    setForm(f => ({ ...f, acteur_id: v, profile_id: "" }));
  };

  useMemo(() => {
    if (profilesForActeur.length === 1 && form.acteur_id) {
      setForm(f => ({ ...f, profile_id: profilesForActeur[0].id }));
    }
  }, [profilesForActeur, form.acteur_id]);

  const saveMut = useMutation({
    mutationFn: async (f: typeof form & { id?: string }) => {
      const payload: any = { acteur_id: f.acteur_id, profile_id: f.profile_id || null, titre: f.titre, description: f.description, date_formation: f.date_formation || new Date().toISOString().split("T")[0], formateur: f.formateur, duree_heures: f.duree_heures, cout: f.cout, efficacite: f.efficacite, preuve: f.preuve || null, commentaire: f.commentaire, type_formation: f.type_formation, competence_liee: f.competence_liee || null };
      if (f.id) { const { error } = await supabase.from("formations").update(payload).eq("id", f.id); if (error) throw error; }
      else { const { error } = await supabase.from("formations").insert(payload); if (error) throw error; }

      // Auto-create/update competence if linked
      if (f.lier_competence && f.competence_liee && f.acteur_id) {
        const competencePayload = {
          acteur_id: f.acteur_id,
          profile_id: f.profile_id || null,
          competence: f.competence_liee,
          niveau: f.efficacite === "efficace" ? "intermediaire" : "debutant",
          date_evaluation: f.date_formation || new Date().toISOString().split("T")[0],
          commentaire: `Acquise via formation: ${f.titre}`,
        };

        // Check if competence already exists for this acteur+profile+competence
        let query = supabase.from("competences").select("id").eq("acteur_id", f.acteur_id).eq("competence", f.competence_liee);
        if (f.profile_id) query = query.eq("profile_id", f.profile_id);
        else query = query.is("profile_id", null);
        const { data: existing } = await query.maybeSingle();

        if (existing) {
          await supabase.from("competences").update({ niveau: competencePayload.niveau, date_evaluation: competencePayload.date_evaluation, commentaire: competencePayload.commentaire }).eq("id", existing.id);
        } else {
          await supabase.from("competences").insert(competencePayload);
        }
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["formations"] }); qc.invalidateQueries({ queryKey: ["competences"] }); setDialog(false); toast({ title: "Formation enregistrée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("formations").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["formations"] }); toast({ title: "Formation supprimée" }); },
  });

  const filtered = useMemo(() => {
    return formations.filter((f: any) => {
      if (search) {
        const s = search.toLowerCase();
        const txt = `${f.titre} ${f.profiles?.prenom || ""} ${f.profiles?.nom || ""} ${f.acteurs?.fonction || ""} ${f.formateur}`.toLowerCase();
        if (!txt.includes(s)) return false;
      }
      if (filterEfficacite !== "all" && f.efficacite !== filterEfficacite) return false;
      if (filterActeur !== "all" && f.acteur_id !== filterActeur) return false;
      if (filterUser !== "all" && f.profile_id !== filterUser) return false;
      if (filterType !== "all" && f.type_formation !== filterType) return false;
      return true;
    });
  }, [formations, search, filterEfficacite, filterActeur, filterUser, filterType]);

  const getDisplayName = (f: any) => {
    if (f.profiles) return `${f.profiles.prenom} ${f.profiles.nom}`;
    return f.acteurs?.fonction || "—";
  };

  const emptyForm = { acteur_id: "", profile_id: "", titre: "", description: "", date_formation: "", formateur: "", duree_heures: 0, cout: 0, efficacite: "non_evaluee", preuve: "", commentaire: "", type_formation: "individuelle", competence_liee: "", lier_competence: false };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-lg font-semibold">Registre des formations</h2>
        {canEdit && <Button onClick={() => { setEditing(null); setForm(emptyForm); setDialog(true); }}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
          </div>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            {Object.entries(typeFormationLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterEfficacite} onValueChange={setFilterEfficacite}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Efficacité" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {Object.entries(efficaciteLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterActeur} onValueChange={setFilterActeur}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Acteur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous acteurs</SelectItem>
            {acteurs.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.fonction} — {a.organisation}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterUser} onValueChange={setFilterUser}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Utilisateur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous utilisateurs</SelectItem>
            {allProfiles.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.prenom} {p.nom}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Formateur</TableHead>
              <TableHead>Durée (h)</TableHead>
              <TableHead>Coût (DA)</TableHead>
              <TableHead>Compétence liée</TableHead>
              <TableHead>Efficacité</TableHead>
              {canEdit && <TableHead className="w-20">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={canEdit ? 10 : 9} className="text-center text-muted-foreground py-8">Aucune formation enregistrée.</TableCell></TableRow>
            ) : filtered.map((f: any) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{f.titre}</TableCell>
                <TableCell><Badge variant="outline">{typeFormationLabels[f.type_formation] || "Individuelle"}</Badge></TableCell>
                <TableCell className="text-sm">{getDisplayName(f)}</TableCell>
                <TableCell>{format(new Date(f.date_formation), "dd/MM/yyyy")}</TableCell>
                <TableCell>{f.formateur}</TableCell>
                <TableCell>{f.duree_heures}</TableCell>
                <TableCell>{(Number(f.cout) || 0).toLocaleString("fr-FR")} DA</TableCell>
                <TableCell className="text-sm text-muted-foreground">{f.competence_liee || "—"}</TableCell>
                <TableCell><Badge className={efficaciteColors[f.efficacite]}>{efficaciteLabels[f.efficacite]}</Badge></TableCell>
                {canEdit && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(f); setForm({ acteur_id: f.acteur_id, profile_id: f.profile_id || "", titre: f.titre, description: f.description, date_formation: f.date_formation, formateur: f.formateur, duree_heures: f.duree_heures, cout: Number(f.cout) || 0, efficacite: f.efficacite, preuve: f.preuve || "", commentaire: f.commentaire, type_formation: f.type_formation || "individuelle", competence_liee: f.competence_liee || "", lier_competence: false }); setDialog(true); }}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(f.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouvelle"} formation</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Type de formation</Label>
                <Select value={form.type_formation} onValueChange={v => setForm(f => ({ ...f, type_formation: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeFormationLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Acteur (fonction)</Label>
                <Select value={form.acteur_id} onValueChange={handleActeurChange}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un acteur" /></SelectTrigger>
                  <SelectContent>{acteurs.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.fonction} — {a.organisation}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {form.acteur_id && profilesForActeur.length > 0 && (
              <div><Label>Utilisateur</Label>
                <Select value={form.profile_id} onValueChange={v => setForm(f => ({ ...f, profile_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un utilisateur" /></SelectTrigger>
                  <SelectContent>
                    {profilesForActeur.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.prenom} {p.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div><Label>Titre</Label><Input value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Date</Label><Input type="date" value={form.date_formation} onChange={e => setForm(f => ({ ...f, date_formation: e.target.value }))} /></div>
              <div><Label>Formateur</Label><Input value={form.formateur} onChange={e => setForm(f => ({ ...f, formateur: e.target.value }))} /></div>
              <div><Label>Durée (heures)</Label><Input type="number" value={form.duree_heures} onChange={e => setForm(f => ({ ...f, duree_heures: parseFloat(e.target.value) || 0 }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Coût (DA)</Label><Input type="number" value={form.cout} onChange={e => setForm(f => ({ ...f, cout: parseFloat(e.target.value) || 0 }))} /></div>
              <div><Label>Efficacité</Label>
                <Select value={form.efficacite} onValueChange={v => setForm(f => ({ ...f, efficacite: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(efficaciteLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Competence link */}
            <div className="border rounded-md p-3 space-y-3 bg-muted/30">
              <div><Label>Compétence liée</Label>
                <Input 
                  value={form.competence_liee} 
                  onChange={e => setForm(f => ({ ...f, competence_liee: e.target.value }))} 
                  placeholder="Nom de la compétence à associer"
                  list="competences-list"
                />
                <datalist id="competences-list">
                  {existingCompetences.map((c: string) => <option key={c} value={c} />)}
                </datalist>
              </div>
              {form.competence_liee && (
                <div className="flex items-center gap-2">
                  <Checkbox 
                    id="lier-comp" 
                    checked={form.lier_competence} 
                    onCheckedChange={(v) => setForm(f => ({ ...f, lier_competence: !!v }))} 
                  />
                  <Label htmlFor="lier-comp" className="text-sm font-normal cursor-pointer">
                    Créer/mettre à jour automatiquement la compétence pour cet acteur
                  </Label>
                </div>
              )}
            </div>

            <div><Label>Commentaire</Label><Textarea value={form.commentaire} onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))} /></div>
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
