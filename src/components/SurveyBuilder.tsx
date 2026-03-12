import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, Image, MessageSquare, ThumbsUp, ToggleLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Question {
  id: string;
  question_text: string;
  question_type: "satisfaction" | "text" | "image" | "yes_no";
  image_url?: string;
  ordre: number;
}

interface SurveyBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSurvey?: any;
  editingQuestions?: any[];
}

const questionTypeIcons: Record<string, any> = {
  satisfaction: ThumbsUp,
  text: MessageSquare,
  image: Image,
  yes_no: ToggleLeft,
};

const questionTypeLabels: Record<string, string> = {
  satisfaction: "Échelle de satisfaction",
  text: "Texte libre",
  image: "Question avec image",
  yes_no: "Oui / Non",
};

export default function SurveyBuilder({ open, onOpenChange, editingSurvey, editingQuestions }: SurveyBuilderProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: editingSurvey?.name || "",
    description: editingSurvey?.description || "",
    department: editingSurvey?.department || "",
    product_service: editingSurvey?.product_service || "",
  });
  const [questions, setQuestions] = useState<Question[]>(
    editingQuestions?.map((q: any) => ({
      id: q.id,
      question_text: q.question_text,
      question_type: q.question_type,
      image_url: q.image_url,
      ordre: q.ordre,
    })) || []
  );
  const [uploading, setUploading] = useState<string | null>(null);

  // Reset form when dialog opens
  const handleOpenChange = (o: boolean) => {
    if (o) {
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
          image_url: q.image_url,
          ordre: q.ordre,
        })) || []
      );
    }
    onOpenChange(o);
  };

  const addQuestion = (type: Question["question_type"]) => {
    setQuestions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        question_text: "",
        question_type: type,
        ordre: prev.length,
      },
    ]);
  };

  const updateQuestion = (id: string, field: string, value: string) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id).map((q, i) => ({ ...q, ordre: i })));
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

      let surveyId = editingSurvey?.id;

      if (surveyId) {
        const { error } = await supabase.from("client_surveys").update({
          name: form.name,
          description: form.description,
          department: form.department,
          product_service: form.product_service,
        }).eq("id", surveyId);
        if (error) throw error;

        // Delete existing questions and re-insert
        await supabase.from("client_survey_questions").delete().eq("survey_id", surveyId);
      } else {
        const { data, error } = await supabase.from("client_surveys").insert({
          name: form.name,
          description: form.description,
          department: form.department,
          product_service: form.product_service,
        }).select().single();
        if (error) throw error;
        surveyId = data.id;
      }

      // Insert questions
      const questionsToInsert = questions.map((q, i) => ({
        survey_id: surveyId,
        question_text: q.question_text,
        question_type: q.question_type,
        image_url: q.image_url || null,
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{editingSurvey ? "Modifier le sondage" : "Créer un sondage client"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Survey info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nom du sondage *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Enquête satisfaction Q1 2026" />
            </div>
            <div className="col-span-2">
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

          {/* Questions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Questions ({questions.length})</Label>
            </div>

            {/* Add question buttons */}
            <div className="flex flex-wrap gap-2">
              {(["satisfaction", "text", "yes_no", "image"] as const).map((type) => {
                const Icon = questionTypeIcons[type];
                return (
                  <Button key={type} variant="outline" size="sm" onClick={() => addQuestion(type)} className="gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {questionTypeLabels[type]}
                  </Button>
                );
              })}
            </div>

            {/* Question list */}
            <div className="space-y-3">
              {questions.map((q, idx) => {
                const Icon = questionTypeIcons[q.question_type];
                return (
                  <Card key={q.id} className="p-4 border border-border/60">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-1 text-muted-foreground pt-1">
                        <GripVertical className="h-4 w-4" />
                        <span className="text-xs font-mono">{idx + 1}</span>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="text-xs font-medium text-muted-foreground">{questionTypeLabels[q.question_type]}</span>
                        </div>
                        <Input
                          value={q.question_text}
                          onChange={(e) => updateQuestion(q.id, "question_text", e.target.value)}
                          placeholder="Texte de la question..."
                        />
                        {q.question_type === "image" && (
                          <div className="space-y-2">
                            {q.image_url && <img src={q.image_url} alt="" className="h-24 rounded-lg object-cover" />}
                            <Input
                              type="file"
                              accept="image/*"
                              disabled={uploading === q.id}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(q.id, file);
                              }}
                            />
                          </div>
                        )}
                        {q.question_type === "satisfaction" && (
                          <div className="flex gap-1 flex-wrap">
                            {["Très satisfait", "Satisfait", "Neutre", "Insatisfait", "Très insatisfait"].map((l, i) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{l}</span>
                            ))}
                          </div>
                        )}
                        {q.question_type === "yes_no" && (
                          <div className="flex gap-2">
                            <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Oui</span>
                            <span className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Non</span>
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeQuestion(q.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
              {questions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                  Ajoutez des questions en utilisant les boutons ci-dessus
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
