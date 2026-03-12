import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Trash2, GripVertical, Image, MessageSquare, ThumbsUp,
  ToggleLeft, Star, ListChecks, Gauge, Maximize2, Minimize2,
  ChevronUp, ChevronDown, Copy
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question_text: string;
  question_type: "satisfaction" | "text" | "image" | "yes_no" | "rating" | "multiple_choice" | "nps";
  image_url?: string;
  ordre: number;
  options?: string[]; // for multiple_choice, stored as JSON in image_url
}

interface SurveyBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSurvey?: any;
  editingQuestions?: any[];
}

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
  satisfaction: ThumbsUp,
  text: MessageSquare,
  image: Image,
  yes_no: ToggleLeft,
  rating: Star,
  multiple_choice: ListChecks,
  nps: Gauge,
};

function parseOptions(q: any): string[] {
  if (q.question_type === "multiple_choice" && q.image_url) {
    try { return JSON.parse(q.image_url); } catch { return []; }
  }
  return [];
}

export default function SurveyBuilder({ open, onOpenChange, editingSurvey, editingQuestions }: SurveyBuilderProps) {
  const qc = useQueryClient();
  const [maximized, setMaximized] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    department: "",
    product_service: "",
  });
  const [questions, setQuestions] = useState<Question[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        name: editingSurvey?.name || "",
        description: editingSurvey?.description || "",
        department: editingSurvey?.department || "",
        product_service: editingSurvey?.product_service || "",
      });
      setQuestions(
        editingQuestions?.map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          image_url: q.question_type === "multiple_choice" ? undefined : q.image_url,
          ordre: q.ordre,
          options: parseOptions(q),
        })) || []
      );
    }
  }, [open, editingSurvey, editingQuestions]);

  const addQuestion = (type: Question["question_type"]) => {
    const defaults: Record<string, Partial<Question>> = {
      multiple_choice: { options: ["Option 1", "Option 2", "Option 3"] },
    };
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        question_text: "",
        question_type: type,
        ordre: prev.length,
        ...(defaults[type] || {}),
      },
    ]);
  };

  const updateQuestion = (id: string, field: string, value: any) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id).map((q, i) => ({ ...q, ordre: i })));
  };

  const duplicateQuestion = (q: Question) => {
    const newQ = { ...q, id: crypto.randomUUID(), ordre: questions.length };
    setQuestions((prev) => [...prev, newQ]);
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
      const opts = [...(q.options || []), `Option ${(q.options?.length || 0) + 1}`];
      return { ...q, options: opts };
    }));
  };

  const updateOption = (questionId: string, optIdx: number, value: string) => {
    setQuestions((prev) => prev.map((q) => {
      if (q.id !== questionId) return q;
      const opts = [...(q.options || [])];
      opts[optIdx] = value;
      return { ...q, options: opts };
    }));
  };

  const removeOption = (questionId: string, optIdx: number) => {
    setQuestions((prev) => prev.map((q) => {
      if (q.id !== questionId) return q;
      const opts = (q.options || []).filter((_, i) => i !== optIdx);
      return { ...q, options: opts };
    }));
  };

  const handleImageUpload = async (questionId: string, file: File) => {
    setUploading(questionId);
    const ext = file.name.split(".").pop();
    const path = `questions/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("survey-images").upload(path, file);
    if (error) {
      toast({ title: "Erreur upload", description: error.message, variant: "destructive" });
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from("survey-images").getPublicUrl(path);
    updateQuestion(questionId, "image_url", urlData.publicUrl);
    setUploading(null);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Le nom du sondage est requis");
      if (questions.length === 0) throw new Error("Ajoutez au moins une question");
      const emptyQ = questions.find((q) => !q.question_text.trim());
      if (emptyQ) throw new Error("Toutes les questions doivent avoir un texte");

      let surveyId = editingSurvey?.id;

      if (surveyId) {
        const { error } = await supabase.from("client_surveys").update({
          name: form.name, description: form.description,
          department: form.department, product_service: form.product_service,
        }).eq("id", surveyId);
        if (error) throw error;
        await supabase.from("client_survey_questions").delete().eq("survey_id", surveyId);
      } else {
        const { data, error } = await supabase.from("client_surveys").insert({
          name: form.name, description: form.description,
          department: form.department, product_service: form.product_service,
        }).select().single();
        if (error) throw error;
        surveyId = data.id;
      }

      const questionsToInsert = questions.map((q, i) => ({
        survey_id: surveyId,
        question_text: q.question_text,
        question_type: q.question_type,
        image_url: q.question_type === "multiple_choice" ? JSON.stringify(q.options || []) : (q.image_url || null),
        ordre: i,
      }));
      const { error: qErr } = await supabase.from("client_survey_questions").insert(questionsToInsert);
      if (qErr) throw qErr;
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
            <Button
              variant="ghost" size="icon"
              onClick={() => setMaximized(!maximized)}
              title={maximized ? "Réduire" : "Agrandir"}
            >
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

          <Separator />

          {/* Add question buttons */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Ajouter une question ({questions.length})
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {questionTypes.map((qt) => (
                <button
                  key={qt.type}
                  type="button"
                  onClick={() => addQuestion(qt.type)}
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
                    {/* Left: ordering */}
                    <div className="flex flex-col items-center gap-0.5 pt-1">
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveQuestion(idx, -1)} disabled={idx === 0}>
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-xs font-mono text-muted-foreground">{idx + 1}</span>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveQuestion(idx, 1)} disabled={idx === questions.length - 1}>
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary shrink-0" />
                        <Badge variant="secondary" className="text-[10px]">{questionTypeLabels[q.question_type]}</Badge>
                      </div>
                      <Input
                        value={q.question_text}
                        onChange={(e) => updateQuestion(q.id, "question_text", e.target.value)}
                        placeholder="Texte de la question..."
                        className="font-medium"
                      />

                      {/* Satisfaction preview */}
                      {q.question_type === "satisfaction" && (
                        <div className="flex gap-1.5 flex-wrap">
                          {[
                            { emoji: "😄", label: "Très satisfait" },
                            { emoji: "🙂", label: "Satisfait" },
                            { emoji: "😐", label: "Neutre" },
                            { emoji: "😕", label: "Insatisfait" },
                            { emoji: "😞", label: "Très insatisfait" },
                          ].map((o, i) => (
                            <div key={i} className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-muted/50 min-w-[56px]">
                              <span className="text-lg">{o.emoji}</span>
                              <span className="text-[9px] text-muted-foreground text-center leading-tight">{o.label}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Rating preview */}
                      {q.question_type === "rating" && (
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className="h-6 w-6 text-amber-400 fill-amber-400/30" />
                          ))}
                        </div>
                      )}

                      {/* NPS preview */}
                      {q.question_type === "nps" && (
                        <div className="space-y-1.5">
                          <div className="flex gap-1">
                            {Array.from({ length: 11 }, (_, i) => (
                              <div
                                key={i}
                                className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-medium border
                                  ${i <= 6 ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
                                    : i <= 8 ? "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"}`}
                              >
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

                      {/* Multiple choice editor */}
                      {q.question_type === "multiple_choice" && (
                        <div className="space-y-2">
                          {(q.options || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <div className="h-4 w-4 rounded-full border-2 border-primary/40 shrink-0" />
                              <Input
                                value={opt}
                                onChange={(e) => updateOption(q.id, optIdx, e.target.value)}
                                className="h-8 text-sm"
                                placeholder={`Option ${optIdx + 1}`}
                              />
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

                      {/* Yes/No preview */}
                      {q.question_type === "yes_no" && (
                        <div className="flex gap-2">
                          <span className="text-xs px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-medium">Oui</span>
                          <span className="text-xs px-4 py-1.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">Non</span>
                        </div>
                      )}

                      {/* Text preview */}
                      {q.question_type === "text" && (
                        <div className="h-16 rounded-lg border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground">
                          Zone de texte libre
                        </div>
                      )}

                      {/* Image */}
                      {q.question_type === "image" && (
                        <div className="space-y-2">
                          {q.image_url && <img src={q.image_url} alt="" className="h-28 rounded-lg object-cover" />}
                          <Input
                            type="file"
                            accept="image/*"
                            disabled={uploading === q.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(q.id, file);
                            }}
                          />
                          <div className="h-12 rounded-lg border border-dashed border-border/60 flex items-center justify-center text-xs text-muted-foreground">
                            Commentaire image
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: actions */}
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
