import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FormationDialog } from "./FormationDialog";

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

  // All formation participants
  const { data: allParticipants = [] } = useQuery({
    queryKey: ["formation_participants"],
    queryFn: async () => {
      const { data } = await supabase.from("formation_participants").select("*, acteurs(fonction, organisation), profiles(nom, prenom)");
      return data || [];
    },
  });

  const getParticipantsForFormation = (formationId: string) => {
    return allParticipants.filter((p: any) => p.formation_id === formationId);
  };

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("formations").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["formations"] }); qc.invalidateQueries({ queryKey: ["formation_participants"] }); toast({ title: "Formation supprimée" }); },
  });

  const filtered = useMemo(() => {
    return formations.filter((f: any) => {
      if (search) {
        const s = search.toLowerCase();
        const participants = getParticipantsForFormation(f.id);
        const participantNames = participants.map((p: any) => `${p.profiles?.prenom || ""} ${p.profiles?.nom || ""} ${p.acteurs?.fonction || ""}`).join(" ");
        const txt = `${f.titre} ${f.profiles?.prenom || ""} ${f.profiles?.nom || ""} ${f.acteurs?.fonction || ""} ${f.formateur} ${participantNames}`.toLowerCase();
        if (!txt.includes(s)) return false;
      }
      if (filterEfficacite !== "all" && f.efficacite !== filterEfficacite) return false;
      if (filterType !== "all" && f.type_formation !== filterType) return false;
      if (filterActeur !== "all") {
        if (f.type_formation === "collective") {
          const participants = getParticipantsForFormation(f.id);
          if (!participants.some((p: any) => p.acteur_id === filterActeur)) return false;
        } else {
          if (f.acteur_id !== filterActeur) return false;
        }
      }
      if (filterUser !== "all") {
        if (f.type_formation === "collective") {
          const participants = getParticipantsForFormation(f.id);
          if (!participants.some((p: any) => p.profile_id === filterUser)) return false;
        } else {
          if (f.profile_id !== filterUser) return false;
        }
      }
      return true;
    });
  }, [formations, search, filterEfficacite, filterActeur, filterUser, filterType, allParticipants]);

  const getDisplayName = (f: any) => {
    if (f.type_formation === "collective") {
      const participants = getParticipantsForFormation(f.id);
      if (participants.length === 0) return "Formation collective";
      const names = participants.slice(0, 3).map((p: any) =>
        p.profiles ? `${p.profiles.prenom} ${p.profiles.nom}` : p.acteurs?.fonction || "—"
      );
      return names.join(", ") + (participants.length > 3 ? ` (+${participants.length - 3})` : "");
    }
    if (f.profiles) return `${f.profiles.prenom} ${f.profiles.nom}`;
    return f.acteurs?.fonction || "—";
  };

  const getCompetencesDisplay = (f: any) => {
    const comps = f.competences_liees?.length > 0
      ? f.competences_liees
      : f.competence_liee ? [f.competence_liee] : [];
    if (comps.length === 0) return "—";
    return comps.join(", ");
  };

  const handleEdit = (f: any) => {
    const participants = f.type_formation === "collective"
      ? getParticipantsForFormation(f.id).map((p: any) => ({ acteur_id: p.acteur_id, profile_id: p.profile_id || "" }))
      : [];
    setEditing({ ...f, _participants: participants });
    setDialog(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-lg font-semibold">Registre des formations</h2>
        {canEdit && <Button onClick={() => { setEditing(null); setDialog(true); }}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>}
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
              <TableHead>Participants</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Formateur</TableHead>
              <TableHead>Durée (h)</TableHead>
              <TableHead>Coût (DA)</TableHead>
              <TableHead>Compétences liées</TableHead>
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
                <TableCell className="text-sm max-w-[200px] truncate" title={getDisplayName(f)}>{getDisplayName(f)}</TableCell>
                <TableCell>{format(new Date(f.date_formation), "dd/MM/yyyy")}</TableCell>
                <TableCell>{f.formateur}</TableCell>
                <TableCell>{f.duree_heures}</TableCell>
                <TableCell>{(Number(f.cout) || 0).toLocaleString("fr-FR")} DA</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate" title={getCompetencesDisplay(f)}>{getCompetencesDisplay(f)}</TableCell>
                <TableCell><Badge className={efficaciteColors[f.efficacite]}>{efficaciteLabels[f.efficacite]}</Badge></TableCell>
                {canEdit && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(f)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(f.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <FormationDialog
        open={dialog}
        onOpenChange={setDialog}
        editing={editing}
        acteurs={acteurs}
        existingParticipants={editing?._participants}
      />
    </div>
  );
}
