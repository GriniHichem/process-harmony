import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Trash2, Image, MessageSquare, ThumbsUp,
  ToggleLeft, Star, ListChecks, Gauge, Maximize2, Minimize2,
  ChevronUp, ChevronDown, Copy, Users
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question_text: string;
  question_type: "satisfaction" | "text" | "image" | "yes_no" | "rating" | "multiple_choice" | "nps";
  image_url?: string;
  ordre: number;
  options?: string[];
  poids: number;
}

interface SurveyBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSurvey?: any;
  editingQuestions?: any[];
}

// ISO 9001 survey types
const surveyTypes = [
  { value: "satisfaction_globale", label: "Satisfaction globale" },
  { value: "satisfaction_produit", label: "Satisfaction produit" },
  { value: "satisfaction_service", label: "Satisfaction service" },
  { value: "satisfaction_livraison", label: "Satisfaction livraison" },
  { value: "satisfaction_sav", label: "Satisfaction SAV / après-vente" },
  { value: "satisfaction_accueil", label: "Satisfaction accueil / communication" },
  { value: "evaluation_fournisseur", label: "Évaluation fournisseur" },
  { value: "audit_interne", label: "Retour audit interne" },
  { value: "reclamation", label: "Analyse réclamation" },
  { value: "nps", label: "Net Promoter Score (NPS)" },
  { value: "enquete_post_projet", label: "Enquête post-projet" },
  { value: "enquete_perception", label: "Enquête de perception qualité" },
  { value: "autre", label: "Autre" },
];

// ISO 9001 survey objectives
const surveyObjectives = [
  { value: "mesurer_satisfaction", label: "Mesurer la satisfaction client (§9.1.2)" },
  { value: "identifier_ameliorations", label: "Identifier des pistes d'amélioration (§10.1)" },
  { value: "evaluer_conformite", label: "Évaluer la conformité produit/service (§8.2.1)" },
  { value: "suivre_reclamations", label: "Suivre les réclamations clients (§8.2.1)" },
  { value: "evaluer_efficacite_actions", label: "Évaluer l'efficacité des actions correctives (§10.2)" },
  { value: "analyser_tendances", label: "Analyser les tendances de satisfaction (§9.1.3)" },
  { value: "preparer_revue_direction", label: "Préparer la revue de direction (§9.3)" },
  { value: "benchmark_concurrence", label: "Benchmark concurrence" },
  { value: "autre", label: "Autre" },
];

const questionTypes = [
  { type: "satisfaction" as const, icon: ThumbsUp, label: "Échelle de satisfaction", desc: "Likert 5 niveaux" },
  { type: "rating" as const, icon: Star, label: "Notation étoiles", desc: "1 à 5 étoiles" },
  { type: "nps" as const, icon: Gauge, label: "NPS (0-10)", desc: "Net Promoter Score" },
  { type: "text" as const, icon: MessageSquare, label: "Texte libre", desc: "Commentaire ouvert" },
  { type: "multiple_choice" as const, icon: ListChecks, label: "Choix multiples", desc: "Options personnalisées" },
  { type: "yes_no" as const, icon: ToggleLeft, label: "Oui / Non", desc: "Réponse binaire" },
  { type: "image" as const, icon: Image, label: "Question avec image", desc: "Image + commentaire" },
];

const questionTypeLabels: Record<string, string> = {
  satisfaction: "Échelle de satisfaction",
  text: "Texte libre",
  image: "Question avec image",
  yes_no: "Oui / Non",
  rating: "Notation étoiles",
  multiple_choice: "Choix multiples",
  nps: "NPS (0-10)",
};

const questionTypeIcons: Record<string, any> = {
  satisfaction: ThumbsUp, text: MessageSquare, image: Image,
  yes_no: ToggleLeft, rating: Star, multiple_choice: ListChecks, nps: Gauge,
};

function parseOptions(q: any): string[] {
  if (q.question_type === "multiple_choice" && q.image_url) {
    try { return JSON.parse(q.image_url); } catch { return []; }
  }
  return [];
}

export default function SurveyBuilder({ open, onOpenChange, editingSurvey, editingQuestions }: SurveyBuilderProps) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [maximized, setMaximized] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", department: "", product_service: "",
    type_sondage: "satisfaction_globale", objectif: "mesurer_satisfaction",
    type_sondage_autre: "", objectif_autre: "",
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [sharedUserIds, setSharedUserIds] = useState<string[]>([]);

  // Fetch process managers for sharing
  const { data: processManagers = [] } = useQuery({
    queryKey: ["process_managers_for_sharing"],
    queryFn: async () => {
      const { data: userRoles } = await supabase
        .from("user_roles").select("user_id").eq("role", "responsable_processus");
      if (!userRoles?.length) return [];
      const userIds = userRoles.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from("profiles").select("id, nom, prenom, email, fonction")
        .in("id", userIds).eq("actif", true);
      return profiles || [];
    },
  });

  // Fetch existing shares when editing
  useEffect(() => {
    if (open && editingSurvey?.id) {
      supabase.from("client_survey_shares").select("shared_with_user_id")
        .eq("survey_id", editingSurvey.id)
        .then(({ data }) => {
          setSharedUserIds((data || []).map((s: any) => s.shared_with_user_id));
        });
    } else if (open) {
      setSharedUserIds([]);
    }
  }, [open, editingSurvey]);

  useEffect(() => {
    if (open) {
      setForm({
        name: editingSurvey?.name || "",
        description: editingSurvey?.description || "",
        department: editingSurvey?.department || "",
        product_service: editingSurvey?.product_service || "",
        type_sondage: editingSurvey?.type_sondage || "satisfaction_globale",
        objectif: editingSurvey?.objectif || "mesurer_satisfaction",
        type_sondage_autre: surveyTypes.find(t => t.value === editingSurvey?.type_sondage) ? "" : (editingSurvey?.type_sondage || ""),
        objectif_autre: surveyObjectives.find(t => t.value === editingSurvey?.objectif) ? "" : (editingSurvey?.objectif || ""),
      });
      setQuestions(
        editingQuestions?.map((q: any) => ({
          id: q.id, question_text: q.question_text, question_type: q.question_type,
          image_url: q.question_type === "multiple_choice" ? undefined : q.image_url,
          ordre: q.ordre, options: parseOptions(q), poids: q.poids ?? 1,
        })) || []
      );
    }
  }, [open, editingSurvey, editingQuestions]);

  const addQuestion = (type: Question["question_type"]) => {
    const defaults: Record<string, Partial<Question>> = {
      multiple_choice: { options: ["Option 1", "Option 2", "Option 3"] },
    };
    setQuestions((prev) => [...prev, {
      id: crypto.randomUUID(), question_text: "", question_type: type,
      ordre: prev.length, poids: 1, ...(defaults[type] || {}),
    }]);
  };

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id).map((q, i) => ({ ...q, ordre: i })));
  };

  const duplicateQuestion = (q: Question) => {
    setQuestions((prev) => [...prev, { ...q, id: crypto.randomUUID(), ordre: prev.length, poids: q.poids }]);
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= questions.length) return;
    setQuestions((prev) => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr.map((q, i) => ({ ...q, ordre: i }));
    });
  };

  const addOption = (questionId: string) => {
    setQuestions((prev) => prev.map((q) => {
      if (q.id !== questionId) return q;
      return { ...q, options: [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`] };
    }));
  };

  const updateOption = (questionId: string, optIdx: number, value: string) => {
    setQuestions((prev) => prev.map((q) => {
      if (q.id !== questionId) return q;
      const opts = [...(q.options || [])]; opts[optIdx] = value;
      return { ...q, options: opts };
    }));
  };

  const removeOption = (questionId: string, optIdx: number) => {
    setQuestions((prev) => prev.map((q) => {
      if (q.id !== questionId) return q;
      return { ...q, options: (q.options || []).filter((_, i) => i !== optIdx) };
    }));
  };

  const handleImageUpload = async (questionId: string, file: File) => {
    setUploading(questionId);
    const ext = file.name.split(".").pop();
    const path = `questions/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("survey-images").upload(path, file);
    if (error) { toast({ title: "Erreur upload", description: error.message, variant: "destructive" }); setUploading(null); return; }
    const { data: urlData } = supabase.storage.from("survey-images").getPublicUrl(path);
    updateQuestion(questionId, "image_url", urlData.publicUrl);
    setUploading(null);
  };

  const toggleShare = (userId: string) => {
    setSharedUserIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Le nom du sondage est requis");
      if (questions.length === 0) throw new Error("Ajoutez au moins une question");
      const emptyQ = questions.find((q) => !q.question_text.trim());
      if (emptyQ) throw new Error("Toutes les questions doivent avoir un texte");

      const typeSondage = form.type_sondage === "autre" ? (form.type_sondage_autre || "autre") : form.type_sondage;
      const objectif = form.objectif === "autre" ? (form.objectif_autre || "autre") : form.objectif;

      let surveyId = editingSurvey?.id;

      if (surveyId) {
        const { error } = await supabase.from("client_surveys").update({
          name: form.name, description: form.description,
          department: form.department, product_service: form.product_service,
          type_sondage: typeSondage, objectif: objectif,
        }).eq("id", surveyId);
        if (error) throw error;
        await supabase.from("client_survey_questions").delete().eq("survey_id", surveyId);
      } else {
        const { data, error } = await supabase.from("client_surveys").insert({
          name: form.name, description: form.description,
          department: form.department, product_service: form.product_service,
          type_sondage: typeSondage, objectif: objectif,
          created_by: user?.id,
        }).select().single();
        if (error) throw error;
        surveyId = data.id;
      }

      // Save questions
      const questionsToInsert = questions.map((q, i) => ({
        survey_id: surveyId, question_text: q.question_text, question_type: q.question_type,
        image_url: q.question_type === "multiple_choice" ? JSON.stringify(q.options || []) : (q.image_url || null),
        ordre: i, poids: q.poids || 1,
      }));
      const { error: qErr } = await supabase.from("client_survey_questions").insert(questionsToInsert);
      if (qErr) throw qErr;

      // Save shares: delete old, insert new
      await supabase.from("client_survey_shares").delete().eq("survey_id", surveyId);
      if (sharedUserIds.length > 0) {
        const sharesToInsert = sharedUserIds.map(uid => ({ survey_id: surveyId, shared_with_user_id: uid }));
        const { error: sErr } = await supabase.from("client_survey_shares").insert(sharesToInsert);
        if (sErr) throw sErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_surveys"] });
      onOpenChange(false);
      toast({ title: "Sondage enregistré" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const dialogClass = maximized
    ? "!max-w-[95vw] !w-[95vw] !max-h-[95vh] !h-[95vh]"
    : "max-w-4xl max-h-[85vh]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${dialogClass} flex flex-col overflow-hidden transition-all duration-200`}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {editingSurvey ? "Modifier le sondage" : "Créer un sondage client"}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setMaximized(!maximized)} title={maximized ? "Réduire" : "Agrandir"}>
              {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* Survey info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label>Nom du sondage *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Enquête satisfaction Q1 2026" />
            </div>

            {/* Type de sondage ISO 9001 */}
            <div>
              <Label>Type de sondage (ISO 9001)</Label>
              <Select value={form.type_sondage} onValueChange={(v) => setForm(f => ({ ...f, type_sondage: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {surveyTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.type_sondage === "autre" && (
                <Input className="mt-2" value={form.type_sondage_autre} onChange={e => setForm(f => ({ ...f, type_sondage_autre: e.target.value }))} placeholder="Précisez le type..." />
              )}
            </div>

            {/* Objectif du sondage */}
            <div>
              <Label>Objectif du sondage</Label>
              <Select value={form.objectif} onValueChange={(v) => setForm(f => ({ ...f, objectif: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {surveyObjectives.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.objectif === "autre" && (
                <Input className="mt-2" value={form.objectif_autre} onChange={e => setForm(f => ({ ...f, objectif_autre: e.target.value }))} placeholder="Précisez l'objectif..." />
              )}
            </div>

            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Description du sondage..." />
            </div>
            <div>
              <Label>Département concerné</Label>
              <Input value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))} placeholder="Production, Commercial..." />
            </div>
            <div>
              <Label>Produit / Service concerné</Label>
              <Input value={form.product_service} onChange={(e) => setForm((f) => ({ ...f, product_service: e.target.value }))} placeholder="Conserves, Emballage..." />
            </div>
          </div>

          {/* Sharing with process managers */}
          {processManagers.length > 0 && (
            <>
              <Separator />
              <div>
                <Label className="text-base font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Partager avec les responsables de processus
                </Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Les sondages non partagés sont masqués pour les responsables de processus.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {processManagers.map((pm: any) => (
                    <label
                      key={pm.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        checked={sharedUserIds.includes(pm.id)}
                        onCheckedChange={() => toggleShare(pm.id)}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{pm.prenom} {pm.nom}</p>
                        <p className="text-xs text-muted-foreground truncate">{pm.fonction || pm.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Add question buttons */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Ajouter une question ({questions.length})
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {questionTypes.map((qt) => (
                <button
                  key={qt.type} type="button" onClick={() => addQuestion(qt.type)}
                  className="flex items-center gap-2.5 p-3 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <qt.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{qt.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{qt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Question list */}
          <div className="space-y-3">
            {questions.map((q, idx) => {
              const Icon = questionTypeIcons[q.question_type];
              return (
                <Card key={q.id} className="p-4 border border-border/60">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col items-center gap-0.5 pt-1">
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveQuestion(idx, -1)} disabled={idx === 0}>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-xs font-mono text-muted-foreground">{idx + 1}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveQuestion(idx, 1)} disabled={idx === questions.length - 1}>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Icon className="h-4 w-4 text-primary shrink-0" />
                        <Badge variant="secondary" className="text-[10px]">{questionTypeLabels[q.question_type]}</Badge>
                        <div className="flex items-center gap-1.5 ml-auto">
                          <span className="text-[10px] text-muted-foreground">Poids :</span>
                          {[1, 2, 3].map((p) => (
                            <button
                              key={p} type="button"
                              onClick={() => updateQuestion(q.id, "poids", p)}
                              className={`h-6 w-6 rounded text-xs font-semibold border transition-colors ${q.poids === p ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border/60 hover:border-primary/40"}`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Input value={q.question_text} onChange={(e) => updateQuestion(q.id, "question_text", e.target.value)} placeholder="Texte de la question..." className="font-medium" />

                      {q.question_type === "satisfaction" && (
                        <div className="flex gap-1.5 flex-wrap">
                          {[{ emoji: "😄", label: "Très satisfait" }, { emoji: "🙂", label: "Satisfait" }, { emoji: "😐", label: "Neutre" }, { emoji: "😕", label: "Insatisfait" }, { emoji: "😞", label: "Très insatisfait" }].map((o, i) => (
                            <div key={i} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-muted/50 min-w-[56px]">
                              <span className="text-lg">{o.emoji}</span>
                              <span className="text-[9px] text-muted-foreground text-center leading-tight">{o.label}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {q.question_type === "rating" && (
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="h-6 w-6 text-amber-400 fill-amber-400/30" />
                          ))}
                        </div>
                      )}

                      {q.question_type === "nps" && (
                        <div className="space-y-1.5">
                          <div className="flex gap-1">
                            {Array.from({ length: 11 }, (_, i) => (
                              <div key={i} className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-medium border ${i <= 6 ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400" : i <= 8 ? "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"}`}>
                                {i}
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between text-[9px] text-muted-foreground px-1">
                            <span>Pas du tout probable</span>
                            <span>Très probable</span>
                          </div>
                        </div>
                      )}

                      {q.question_type === "multiple_choice" && (
                        <div className="space-y-2">
                          {(q.options || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full border-2 border-primary/40 shrink-0" />
                              <Input value={opt} onChange={(e) => updateOption(q.id, optIdx, e.target.value)} className="h-8 text-sm" placeholder={`Option ${optIdx + 1}`} />
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeOption(q.id, optIdx)}>
                                <Trash2 className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          ))}
                          <Button variant="outline" size="sm" onClick={() => addOption(q.id)} className="gap-1 text-xs">
                            <Plus className="h-3 w-3" /> Ajouter une option
                          </Button>
                        </div>
                      )}

                      {q.question_type === "yes_no" && (
                        <div className="flex gap-2">
                          <span className="text-xs px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">Oui</span>
                          <span className="text-xs px-4 py-1.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">Non</span>
                        </div>
                      )}

                      {q.question_type === "text" && (
                        <div className="h-16 rounded-lg border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground">
                          Zone de texte libre
                        </div>
                      )}

                      {q.question_type === "image" && (
                        <div className="space-y-2">
                          {q.image_url && <img src={q.image_url} alt="" className="h-28 rounded-lg object-cover" />}
                          <Input type="file" accept="image/*" disabled={uploading === q.id} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(q.id, file); }} />
                          <div className="h-12 rounded-lg border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground">
                            Commentaire image
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateQuestion(q)} title="Dupliquer">
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeQuestion(q.id)} title="Supprimer">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
            {questions.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>Ajoutez des questions en utilisant les boutons ci-dessus</p>
                <p className="text-xs mt-1">7 types de questions disponibles</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Enregistrement..." : "Enregistrer le sondage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
