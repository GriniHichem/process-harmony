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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash2, Eye, Copy, Play, Square, ClipboardList, BarChart3, History, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import SurveyBuilder from "@/components/SurveyBuilder";
import SurveyResults from "@/components/SurveyResults";

// --- Historique (ancien module) ---
const statutColors: Record<string, string> = {
  planifiee: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  en_cours: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  terminee: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  analysee: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};
const statutLabels: Record<string, string> = { planifiee: "Planifiée", en_cours: "En cours", terminee: "Terminée", analysee: "Analysée" };
const typeLabels: Record<string, string> = { questionnaire: "Questionnaire", entretien: "Entretien", reclamation: "Réclamation", retour_client: "Retour client" };
const emptyForm = { reference: "", titre: "", date_enquete: "", type_enquete: "questionnaire", score_global: "", nombre_reponses: 0, analyse_resultats: "", actions_prevues: "", statut: "planifiee" };

const surveyStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "bg-muted text-muted-foreground" },
  active: { label: "Actif", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
  closed: { label: "Clôturé", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

const surveyTypeLabels: Record<string, string> = {
  satisfaction_globale: "Satisfaction globale",
  satisfaction_produit: "Satisfaction produit",
  satisfaction_service: "Satisfaction service",
  satisfaction_livraison: "Satisfaction livraison",
  satisfaction_sav: "Satisfaction SAV",
  satisfaction_accueil: "Satisfaction accueil",
  evaluation_fournisseur: "Évaluation fournisseur",
  audit_interne: "Retour audit interne",
  reclamation: "Analyse réclamation",
  nps: "NPS",
  enquete_post_projet: "Enquête post-projet",
  enquete_perception: "Perception qualité",
  autre: "Autre",
};

const objectifLabels: Record<string, string> = {
  mesurer_satisfaction: "Mesurer satisfaction (§9.1.2)",
  identifier_ameliorations: "Identifier améliorations (§10.1)",
  evaluer_conformite: "Évaluer conformité (§8.2.1)",
  suivre_reclamations: "Suivre réclamations (§8.2.1)",
  evaluer_efficacite_actions: "Efficacité actions (§10.2)",
  analyser_tendances: "Tendances satisfaction (§9.1.3)",
  preparer_revue_direction: "Revue direction (§9.3)",
  benchmark_concurrence: "Benchmark",
  autre: "Autre",
};

export default function SatisfactionClient() {
  const { hasPermission, hasRole, user } = useAuth();
  const canEdit = hasPermission("satisfaction_client", "can_edit");
  const isResponsableProcessus = hasRole("responsable_processus");
  const isAdminOrRmq = hasRole("admin") || hasRole("rmq");
  const qc = useQueryClient();

  // Historique state
  const [dialog, setDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  // Sondages state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<any>(null);
  const [editingQuestions, setEditingQuestions] = useState<any[]>([]);

  // Fetch shares for current user
  const { data: myShares = [] } = useQuery({
    queryKey: ["my_survey_shares", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("client_survey_shares").select("survey_id").eq("shared_with_user_id", user!.id);
      return (data || []).map((s: any) => s.survey_id);
    },
  });

  // Fetch all shares for display
  const { data: allShares = [] } = useQuery({
    queryKey: ["all_survey_shares"],
    enabled: isAdminOrRmq,
    queryFn: async () => {
      const { data } = await supabase.from("client_survey_shares").select("survey_id, shared_with_user_id, profiles:shared_with_user_id(nom, prenom)");
      return data || [];
    },
  });

  // Fetch client_surveys
  const { data: clientSurveys = [] } = useQuery({
    queryKey: ["client_surveys"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_surveys").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Filter surveys for responsable_processus
  const visibleSurveys = isAdminOrRmq
    ? clientSurveys
    : clientSurveys.filter((s: any) => myShares.includes(s.id));

  // Fetch old surveys (historique)
  const { data: surveys = [] } = useQuery({
    queryKey: ["satisfaction_surveys"],
    queryFn: async () => {
      const { data, error } = await supabase.from("satisfaction_surveys").select("*").order("date_enquete", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Response counts per survey
  const { data: responseCounts = {} } = useQuery({
    queryKey: ["survey_response_counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_survey_responses").select("survey_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => { counts[r.survey_id] = (counts[r.survey_id] || 0) + 1; });
      return counts;
    },
  });

  // Survey CRUD
  const toggleStatus = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase.from("client_surveys").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["client_surveys"] }); toast({ title: "Statut mis à jour" }); },
  });

  const deleteSurvey = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_surveys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["client_surveys"] }); toast({ title: "Sondage supprimé" }); },
  });

  const openEditSurvey = async (s: any) => {
    const { data: questions } = await supabase.from("client_survey_questions").select("*").eq("survey_id", s.id).order("ordre");
    setEditingSurvey(s);
    setEditingQuestions(questions || []);
    setBuilderOpen(true);
  };

  const openNewSurvey = () => { setEditingSurvey(null); setEditingQuestions([]); setBuilderOpen(true); };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/survey/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Lien copié !", description: url });
  };

  // Get shared users for a survey
  const getSharedUsers = (surveyId: string) => {
    return allShares.filter((s: any) => s.survey_id === surveyId);
  };

  // Historique CRUD
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Satisfaction client</h1>
        <p className="text-muted-foreground mt-1">Sondages, résultats et historique des enquêtes</p>
      </div>

      <Tabs defaultValue="sondages">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
          <TabsTrigger value="sondages" className="gap-1.5"><ClipboardList className="h-4 w-4" />Sondages</TabsTrigger>
          <TabsTrigger value="resultats" className="gap-1.5"><BarChart3 className="h-4 w-4" />Résultats</TabsTrigger>
          <TabsTrigger value="historique" className="gap-1.5"><History className="h-4 w-4" />Historique</TabsTrigger>
        </TabsList>

        {/* ===== SONDAGES TAB ===== */}
        <TabsContent value="sondages" className="space-y-4 mt-4">
          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={openNewSurvey} className="gap-1.5"><Plus className="h-4 w-4" />Nouveau sondage</Button>
            </div>
          )}

          {visibleSurveys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{isResponsableProcessus && !isAdminOrRmq ? "Aucun sondage partagé avec vous." : "Aucun sondage créé."}</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {visibleSurveys.map((s: any) => {
                const stCfg = surveyStatusConfig[s.status] || surveyStatusConfig.draft;
                const typeLabel = surveyTypeLabels[s.type_sondage] || s.type_sondage;
                const objLabel = objectifLabels[s.objectif] || s.objectif;
                const shared = isAdminOrRmq ? getSharedUsers(s.id) : [];
                return (
                  <Card key={s.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold truncate">{s.name}</h3>
                          <Badge className={stCfg.color}>{stCfg.label}</Badge>
                          <Badge variant="outline" className="text-[10px]">{typeLabel}</Badge>
                        </div>
                        {s.description && <p className="text-sm text-muted-foreground line-clamp-1">{s.description}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          {objLabel && <span className="font-medium text-primary/80">🎯 {objLabel}</span>}
                          {s.department && <span>Département : {s.department}</span>}
                          {s.product_service && <span>Produit : {s.product_service}</span>}
                          <span>{(responseCounts as any)[s.id] || 0} réponse(s)</span>
                          <span>Créé le {format(new Date(s.created_at), "dd/MM/yyyy")}</span>
                        </div>
                        {isAdminOrRmq && shared.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] text-muted-foreground">Partagé avec :</span>
                            {shared.map((sh: any, i: number) => (
                              <Badge key={i} variant="secondary" className="text-[10px] py-0">
                                {sh.profiles?.prenom} {sh.profiles?.nom}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {s.status === "active" && (
                          <Button variant="outline" size="sm" onClick={() => copyLink(s.public_token)} className="gap-1 text-xs">
                            <Copy className="h-3 w-3" />Copier lien
                          </Button>
                        )}
                        {canEdit && (
                          <>
                            {s.status === "draft" && (
                              <Button variant="outline" size="icon" onClick={() => toggleStatus.mutate({ id: s.id, newStatus: "active" })} title="Activer">
                                <Play className="h-4 w-4 text-emerald-600" />
                              </Button>
                            )}
                            {s.status === "active" && (
                              <Button variant="outline" size="icon" onClick={() => toggleStatus.mutate({ id: s.id, newStatus: "closed" })} title="Clôturer">
                                <Square className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => openEditSurvey(s)}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteSurvey.mutate(s.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===== RÉSULTATS TAB ===== */}
        <TabsContent value="resultats" className="mt-4">
          <SurveyResults />
        </TabsContent>

        {/* ===== HISTORIQUE TAB ===== */}
        <TabsContent value="historique" className="space-y-4 mt-4">
          {canEdit && (
            <div className="flex justify-end">
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nouvelle enquête</Button>
            </div>
          )}
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
        </TabsContent>
      </Tabs>

      {/* Survey Builder */}
      <SurveyBuilder open={builderOpen} onOpenChange={setBuilderOpen} editingSurvey={editingSurvey} editingQuestions={editingQuestions} />

      {/* View historique */}
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

      {/* Edit historique */}
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
