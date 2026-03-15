import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { X, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

const efficaciteLabels: Record<string, string> = { non_evaluee: "Non évaluée", efficace: "Efficace", non_efficace: "Non efficace" };
const typeFormationLabels: Record<string, string> = { individuelle: "Individuelle", collective: "Collective" };

interface Participant {
  acteur_id: string;
  profile_id: string;
}

interface FormData {
  type_formation: string;
  // Individual mode
  acteur_id: string;
  profile_id: string;
  // Collective mode
  participants: Participant[];
  titre: string;
  description: string;
  date_formation: string;
  formateur: string;
  duree_heures: number;
  cout: number;
  efficacite: string;
  preuve: string;
  commentaire: string;
  competences_liees: string[];
  lier_competence: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: any | null;
  acteurs: any[];
  existingParticipants?: Participant[];
}

const emptyForm: FormData = {
  type_formation: "individuelle",
  acteur_id: "", profile_id: "",
  participants: [],
  titre: "", description: "", date_formation: "", formateur: "",
  duree_heures: 0, cout: 0, efficacite: "non_evaluee",
  preuve: "", commentaire: "",
  competences_liees: [], lier_competence: false,
};

export function FormationDialog({ open, onOpenChange, editing, acteurs, existingParticipants }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [newCompetence, setNewCompetence] = useState("");

  // Reset form when dialog opens
  useEffect(() => {
    if (!open) return;
    if (editing) {
      const compLiees = editing.competences_liees?.length > 0
        ? editing.competences_liees
        : editing.competence_liee ? [editing.competence_liee] : [];
      setForm({
        type_formation: editing.type_formation || "individuelle",
        acteur_id: editing.acteur_id,
        profile_id: editing.profile_id || "",
        participants: existingParticipants || [],
        titre: editing.titre,
        description: editing.description,
        date_formation: editing.date_formation,
        formateur: editing.formateur,
        duree_heures: editing.duree_heures,
        cout: Number(editing.cout) || 0,
        efficacite: editing.efficacite,
        preuve: editing.preuve || "",
        commentaire: editing.commentaire,
        competences_liees: compLiees,
        lier_competence: false,
      });
    } else {
      setForm(emptyForm);
    }
    setNewCompetence("");
  }, [open, editing, existingParticipants]);

  const isCollective = form.type_formation === "collective";

  // Profiles for individual mode acteur
  const { data: profilesForActeur = [] } = useQuery({
    queryKey: ["profiles_for_acteur", form.acteur_id],
    queryFn: async () => {
      if (!form.acteur_id) return [];
      const { data } = await supabase.from("profiles").select("id, nom, prenom, fonction").eq("acteur_id", form.acteur_id).eq("actif", true);
      return data || [];
    },
    enabled: !!form.acteur_id && !isCollective,
  });

  // All profiles grouped by acteur for collective mode
  const { data: allProfilesByActeur = {} } = useQuery({
    queryKey: ["all_profiles_by_acteur"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, nom, prenom, acteur_id").eq("actif", true);
      const map: Record<string, any[]> = {};
      (data || []).forEach((p: any) => {
        if (p.acteur_id) {
          if (!map[p.acteur_id]) map[p.acteur_id] = [];
          map[p.acteur_id].push(p);
        }
      });
      return map;
    },
    enabled: isCollective,
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

  // Auto-select profile if only one exists for individual mode
  useMemo(() => {
    if (!isCollective && profilesForActeur.length === 1 && form.acteur_id) {
      setForm(f => ({ ...f, profile_id: profilesForActeur[0].id }));
    }
  }, [profilesForActeur, form.acteur_id, isCollective]);

  // --- Collective participant management ---
  const toggleActeurInParticipants = (acteurId: string) => {
    setForm(f => {
      const has = f.participants.some(p => p.acteur_id === acteurId);
      if (has) {
        return { ...f, participants: f.participants.filter(p => p.acteur_id !== acteurId) };
      }
      // Add acteur, auto-add all their profiles
      const profiles = allProfilesByActeur[acteurId] || [];
      const newEntries: Participant[] = profiles.length > 0
        ? profiles.map((p: any) => ({ acteur_id: acteurId, profile_id: p.id }))
        : [{ acteur_id: acteurId, profile_id: "" }];
      return { ...f, participants: [...f.participants, ...newEntries] };
    });
  };

  const toggleProfileInParticipants = (acteurId: string, profileId: string) => {
    setForm(f => {
      const has = f.participants.some(p => p.acteur_id === acteurId && p.profile_id === profileId);
      if (has) {
        const remaining = f.participants.filter(p => !(p.acteur_id === acteurId && p.profile_id === profileId));
        return { ...f, participants: remaining };
      }
      return { ...f, participants: [...f.participants, { acteur_id: acteurId, profile_id: profileId }] };
    });
  };

  const isActeurSelected = (acteurId: string) => form.participants.some(p => p.acteur_id === acteurId);
  const isProfileSelected = (acteurId: string, profileId: string) => form.participants.some(p => p.acteur_id === acteurId && p.profile_id === profileId);

  // --- Multi-competence management ---
  const addCompetence = () => {
    const trimmed = newCompetence.trim();
    if (!trimmed || form.competences_liees.includes(trimmed)) return;
    setForm(f => ({ ...f, competences_liees: [...f.competences_liees, trimmed] }));
    setNewCompetence("");
  };

  const removeCompetence = (c: string) => {
    setForm(f => ({ ...f, competences_liees: f.competences_liees.filter(x => x !== c) }));
  };

  // --- Save ---
  const saveMut = useMutation({
    mutationFn: async () => {
      const mainActeurId = isCollective
        ? (form.participants[0]?.acteur_id || acteurs[0]?.id)
        : form.acteur_id;

      const payload: any = {
        acteur_id: mainActeurId,
        profile_id: isCollective ? null : (form.profile_id || null),
        titre: form.titre,
        description: form.description,
        date_formation: form.date_formation || new Date().toISOString().split("T")[0],
        formateur: form.formateur,
        duree_heures: form.duree_heures,
        cout: form.cout,
        efficacite: form.efficacite,
        preuve: form.preuve || null,
        commentaire: form.commentaire,
        type_formation: form.type_formation,
        competence_liee: form.competences_liees[0] || null,
        competences_liees: form.competences_liees,
      };

      let formationId: string;
      if (editing?.id) {
        const { error } = await supabase.from("formations").update(payload).eq("id", editing.id);
        if (error) throw error;
        formationId = editing.id;
      } else {
        const { data, error } = await supabase.from("formations").insert(payload).select("id").single();
        if (error) throw error;
        formationId = data.id;
      }

      // Handle participants for collective
      if (isCollective) {
        // Delete existing participants
        await supabase.from("formation_participants").delete().eq("formation_id", formationId);
        // Insert new ones
        if (form.participants.length > 0) {
          const rows = form.participants.map(p => ({
            formation_id: formationId,
            acteur_id: p.acteur_id,
            profile_id: p.profile_id || null,
          }));
          const { error } = await supabase.from("formation_participants").insert(rows);
          if (error) throw error;
        }
      }

      // Auto-create/update competences if linked
      if (form.lier_competence && form.competences_liees.length > 0) {
        const participants = isCollective
          ? form.participants
          : [{ acteur_id: form.acteur_id, profile_id: form.profile_id }];

        for (const participant of participants) {
          for (const compName of form.competences_liees) {
            const compPayload = {
              acteur_id: participant.acteur_id,
              profile_id: participant.profile_id || null,
              competence: compName,
              niveau: form.efficacite === "efficace" ? "intermediaire" : "debutant",
              date_evaluation: form.date_formation || new Date().toISOString().split("T")[0],
              commentaire: `Acquise via formation: ${form.titre}`,
            };

            let query = supabase.from("competences").select("id")
              .eq("acteur_id", participant.acteur_id)
              .eq("competence", compName);
            if (participant.profile_id) query = query.eq("profile_id", participant.profile_id);
            else query = query.is("profile_id", null);
            const { data: existing } = await query.maybeSingle();

            if (existing) {
              await supabase.from("competences").update({
                niveau: compPayload.niveau,
                date_evaluation: compPayload.date_evaluation,
                commentaire: compPayload.commentaire,
              }).eq("id", existing.id);
            } else {
              await supabase.from("competences").insert(compPayload);
            }
          }
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["formations"] });
      qc.invalidateQueries({ queryKey: ["competences"] });
      qc.invalidateQueries({ queryKey: ["formation_participants"] });
      onOpenChange(false);
      toast({ title: "Formation enregistrée" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier" : "Nouvelle"} formation</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Type */}
          <div>
            <Label>Type de formation</Label>
            <Select value={form.type_formation} onValueChange={v => setForm(f => ({ ...f, type_formation: v, participants: [], acteur_id: "", profile_id: "" }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(typeFormationLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Individual: single acteur/profile */}
          {!isCollective && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Acteur (fonction)</Label>
                <Select value={form.acteur_id} onValueChange={v => setForm(f => ({ ...f, acteur_id: v, profile_id: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un acteur" /></SelectTrigger>
                  <SelectContent>
                    {acteurs.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.fonction} — {a.organisation}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.acteur_id && profilesForActeur.length > 0 && (
                <div>
                  <Label>Utilisateur</Label>
                  <Select value={form.profile_id} onValueChange={v => setForm(f => ({ ...f, profile_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {profilesForActeur.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.prenom} {p.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Collective: multi-select acteurs & profiles */}
          {isCollective && (
            <div className="border rounded-md p-3 space-y-3 bg-muted/30">
              <Label>Participants (acteurs & utilisateurs)</Label>
              <div className="max-h-[200px] overflow-y-auto space-y-2">
                {acteurs.map((a: any) => {
                  const profiles = allProfilesByActeur[a.id] || [];
                  const acteurChecked = isActeurSelected(a.id);
                  return (
                    <div key={a.id} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={acteurChecked}
                          onCheckedChange={() => toggleActeurInParticipants(a.id)}
                        />
                        <span className="text-sm font-medium">{a.fonction} — {a.organisation}</span>
                      </div>
                      {acteurChecked && profiles.length > 0 && (
                        <div className="ml-6 space-y-1">
                          {profiles.map((p: any) => (
                            <div key={p.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={isProfileSelected(a.id, p.id)}
                                onCheckedChange={() => toggleProfileInParticipants(a.id, p.id)}
                              />
                              <span className="text-sm">{p.prenom} {p.nom}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {form.participants.length > 0 && (
                <p className="text-xs text-muted-foreground">{form.participants.length} participant(s) sélectionné(s)</p>
              )}
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

          {/* Multi-competence */}
          <div className="border rounded-md p-3 space-y-3 bg-muted/30">
            <Label>Compétences liées</Label>
            {form.competences_liees.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {form.competences_liees.map(c => (
                  <Badge key={c} variant="secondary" className="gap-1">
                    {c}
                    <button onClick={() => removeCompetence(c)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={newCompetence}
                onChange={e => setNewCompetence(e.target.value)}
                placeholder="Ajouter une compétence..."
                list="competences-list-dialog"
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCompetence(); } }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addCompetence}><Plus className="h-4 w-4" /></Button>
            </div>
            <datalist id="competences-list-dialog">
              {existingCompetences.map((c: string) => <option key={c} value={c} />)}
            </datalist>
            {form.competences_liees.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="lier-comp-dialog"
                  checked={form.lier_competence}
                  onCheckedChange={(v) => setForm(f => ({ ...f, lier_competence: !!v }))}
                />
                <Label htmlFor="lier-comp-dialog" className="text-sm font-normal cursor-pointer">
                  Créer/mettre à jour automatiquement les compétences {isCollective ? "pour tous les participants" : "pour cet acteur"}
                </Label>
              </div>
            )}
          </div>

          <div><Label>Commentaire</Label><Textarea value={form.commentaire} onChange={e => setForm(f => ({ ...f, commentaire: e.target.value }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || (!isCollective && !form.acteur_id) || (isCollective && form.participants.length === 0) || !form.titre}
          >
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
