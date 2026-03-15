import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Search, LayoutGrid, List } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const niveauColors: Record<string, string> = {
  debutant: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  intermediaire: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  avance: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  expert: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};
const niveauLabels: Record<string, string> = { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé", expert: "Expert" };

interface Props {
  competences: any[];
  acteurs: any[];
  canEdit: boolean;
}

export function CompetencesTab({ competences, acteurs, canEdit }: Props) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ acteur_id: "", profile_id: "", competence: "", niveau: "debutant", date_evaluation: "", prochaine_evaluation: "", commentaire: "" });
  const [search, setSearch] = useState("");
  const [filterNiveau, setFilterNiveau] = useState("all");
  const [filterActeur, setFilterActeur] = useState("all");
  const [viewMode, setViewMode] = useState<"list" | "matrix">("list");

  // Profiles for selected acteur
  const { data: profilesForActeur = [] } = useQuery({
    queryKey: ["profiles_for_acteur", form.acteur_id],
    queryFn: async () => {
      if (!form.acteur_id) return [];
      const { data } = await supabase.from("profiles").select("id, nom, prenom, fonction").eq("acteur_id", form.acteur_id).eq("actif", true);
      return data || [];
    },
    enabled: !!form.acteur_id,
  });

  // Auto-select if single profile
  const handleActeurChange = (v: string) => {
    setForm(f => ({ ...f, acteur_id: v, profile_id: "" }));
  };

  // When profiles load and there's only one, auto-select
  useMemo(() => {
    if (profilesForActeur.length === 1 && form.acteur_id) {
      setForm(f => ({ ...f, profile_id: profilesForActeur[0].id }));
    }
  }, [profilesForActeur, form.acteur_id]);

  const saveMut = useMutation({
    mutationFn: async (f: typeof form & { id?: string }) => {
      const payload = { acteur_id: f.acteur_id, profile_id: f.profile_id || null, competence: f.competence, niveau: f.niveau, date_evaluation: f.date_evaluation || new Date().toISOString().split("T")[0], prochaine_evaluation: f.prochaine_evaluation || null, commentaire: f.commentaire };
      if (f.id) { const { error } = await supabase.from("competences").update(payload).eq("id", f.id); if (error) throw error; }
      else { const { error } = await supabase.from("competences").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["competences"] }); setDialog(false); toast({ title: "Compétence enregistrée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("competences").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["competences"] }); toast({ title: "Compétence supprimée" }); },
  });

  const filtered = useMemo(() => {
    return competences.filter((c: any) => {
      if (search) {
        const s = search.toLowerCase();
        const name = `${c.profiles?.prenom || ""} ${c.profiles?.nom || ""} ${c.acteurs?.fonction || ""} ${c.competence}`.toLowerCase();
        if (!name.includes(s)) return false;
      }
      if (filterNiveau !== "all" && c.niveau !== filterNiveau) return false;
      if (filterActeur !== "all" && c.acteur_id !== filterActeur) return false;
      return true;
    });
  }, [competences, search, filterNiveau, filterActeur]);

  // Matrix data
  const matrixData = useMemo(() => {
    const compNames = [...new Set(competences.map((c: any) => c.competence))].sort();
    const users = new Map<string, { label: string; niveaux: Record<string, string> }>();
    competences.forEach((c: any) => {
      const key = c.profile_id || c.acteur_id;
      const label = c.profiles ? `${c.profiles.prenom} ${c.profiles.nom}` : c.acteurs?.fonction || "—";
      if (!users.has(key)) users.set(key, { label, niveaux: {} });
      users.get(key)!.niveaux[c.competence] = c.niveau;
    });
    return { compNames, users: [...users.entries()] };
  }, [competences]);

  const getDisplayName = (c: any) => {
    if (c.profiles) return `${c.profiles.prenom} ${c.profiles.nom}`;
    return c.acteurs?.fonction || "—";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-lg font-semibold">Matrice des compétences</h2>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "list" ? "default" : "outline"} size="sm" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
          <Button variant={viewMode === "matrix" ? "default" : "outline"} size="sm" onClick={() => setViewMode("matrix")}><LayoutGrid className="h-4 w-4" /></Button>
          {canEdit && <Button onClick={() => { setEditing(null); setForm({ acteur_id: "", profile_id: "", competence: "", niveau: "debutant", date_evaluation: "", prochaine_evaluation: "", commentaire: "" }); setDialog(true); }}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
          </div>
        </div>
        <Select value={filterNiveau} onValueChange={setFilterNiveau}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Niveau" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous niveaux</SelectItem>
            {Object.entries(niveauLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterActeur} onValueChange={setFilterActeur}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Acteur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous acteurs</SelectItem>
            {acteurs.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.fonction} — {a.organisation}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {viewMode === "list" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Fonction</TableHead>
                <TableHead>Compétence</TableHead>
                <TableHead>Niveau</TableHead>
                <TableHead>Évaluation</TableHead>
                <TableHead>Prochaine</TableHead>
                {canEdit && <TableHead className="w-20">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-8">Aucune compétence enregistrée.</TableCell></TableRow>
              ) : filtered.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm font-medium">{c.profiles ? `${c.profiles.prenom} ${c.profiles.nom}` : "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.acteurs?.fonction || "—"}</TableCell>
                  <TableCell>{c.competence}</TableCell>
                  <TableCell><Badge className={niveauColors[c.niveau]}>{niveauLabels[c.niveau]}</Badge></TableCell>
                  <TableCell>{format(new Date(c.date_evaluation), "dd/MM/yyyy")}</TableCell>
                  <TableCell>{c.prochaine_evaluation ? format(new Date(c.prochaine_evaluation), "dd/MM/yyyy") : "—"}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setForm({ acteur_id: c.acteur_id, profile_id: c.profile_id || "", competence: c.competence, niveau: c.niveau, date_evaluation: c.date_evaluation, prochaine_evaluation: c.prochaine_evaluation || "", commentaire: c.commentaire }); setDialog(true); }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* Matrix View */
        <Card className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10 min-w-[180px]">Utilisateur</TableHead>
                {matrixData.compNames.map(cn => <TableHead key={cn} className="text-center min-w-[120px]">{cn}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrixData.users.length === 0 ? (
                <TableRow><TableCell colSpan={matrixData.compNames.length + 1} className="text-center text-muted-foreground py-8">Aucune donnée.</TableCell></TableRow>
              ) : matrixData.users.map(([key, u]) => (
                <TableRow key={key}>
                  <TableCell className="sticky left-0 bg-card z-10 font-medium">{u.label}</TableCell>
                  {matrixData.compNames.map(cn => (
                    <TableCell key={cn} className="text-center">
                      {u.niveaux[cn] ? <Badge className={niveauColors[u.niveaux[cn]]}>{niveauLabels[u.niveaux[cn]]}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Modifier" : "Nouvelle"} compétence</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Acteur (fonction)</Label>
              <Select value={form.acteur_id} onValueChange={handleActeurChange}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un acteur" /></SelectTrigger>
                <SelectContent>{acteurs.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.fonction} — {a.organisation}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.acteur_id && profilesForActeur.length > 0 && (
              <div><Label>Utilisateur</Label>
                <Select value={form.profile_id} onValueChange={v => setForm(f => ({ ...f, profile_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un utilisateur" /></SelectTrigger>
                  <SelectContent>
                    {profilesForActeur.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.prenom} {p.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
                {profilesForActeur.length === 0 && <p className="text-xs text-muted-foreground mt-1">Aucun utilisateur rattaché à cet acteur</p>}
              </div>
            )}
            <div><Label>Compétence</Label><Input value={form.competence} onChange={e => setForm(f => ({ ...f, competence: e.target.value }))} /></div>
            <div><Label>Niveau</Label>
              <Select value={form.niveau} onValueChange={v => setForm(f => ({ ...f, niveau: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(niveauLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date d'évaluation</Label><Input type="date" value={form.date_evaluation} onChange={e => setForm(f => ({ ...f, date_evaluation: e.target.value }))} /></div>
              <div><Label>Prochaine évaluation</Label><Input type="date" value={form.prochaine_evaluation} onChange={e => setForm(f => ({ ...f, prochaine_evaluation: e.target.value }))} /></div>
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
