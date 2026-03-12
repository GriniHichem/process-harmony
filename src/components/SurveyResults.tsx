import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BarChart3, MessageCircle, TrendingUp, Users, Lightbulb, AlertTriangle, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const satisfactionLabels = ["", "Très insatisfait", "Insatisfait", "Neutre", "Satisfait", "Très satisfait"];
const satisfactionColors = [
  "",
  "bg-red-500",
  "bg-orange-400",
  "bg-yellow-400",
  "bg-emerald-400",
  "bg-emerald-600",
];

const categoryConfig: Record<string, { label: string; icon: any; color: string }> = {
  amelioration: { label: "Amélioration", icon: Lightbulb, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  plainte: { label: "Plainte", icon: AlertTriangle, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  suggestion: { label: "Suggestion", icon: Sparkles, color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
};

export default function SurveyResults() {
  const qc = useQueryClient();
  const [selectedSurveyId, setSelectedSurveyId] = useState<string>("");

  const { data: surveys = [] } = useQuery({
    queryKey: ["client_surveys"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_surveys").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: results } = useQuery({
    queryKey: ["survey_results", selectedSurveyId],
    enabled: !!selectedSurveyId,
    queryFn: async () => {
      const [{ data: questions }, { data: responses }, { data: comments }] = await Promise.all([
        supabase.from("client_survey_questions").select("*").eq("survey_id", selectedSurveyId).order("ordre"),
        supabase.from("client_survey_responses").select("*, client_survey_answers(*)").eq("survey_id", selectedSurveyId),
        supabase.from("client_survey_comments").select("*").eq("response_id", selectedSurveyId), // will re-filter below
      ]);

      // Get all response IDs for this survey
      const responseIds = (responses || []).map((r: any) => r.id);
      let allComments: any[] = [];
      if (responseIds.length > 0) {
        const { data: c } = await supabase.from("client_survey_comments").select("*").in("response_id", responseIds);
        allComments = c || [];
      }

      // Calculate satisfaction distribution
      const allAnswers = (responses || []).flatMap((r: any) => r.client_survey_answers || []);
      const satisfactionAnswers = allAnswers.filter((a: any) => a.answer_value != null);
      const distribution = [0, 0, 0, 0, 0, 0]; // index 1-5
      satisfactionAnswers.forEach((a: any) => {
        if (a.answer_value >= 1 && a.answer_value <= 5) distribution[a.answer_value]++;
      });
      const totalSat = satisfactionAnswers.length || 1;
      const satisfiedCount = distribution[4] + distribution[5];
      const satisfactionRate = Math.round((satisfiedCount / totalSat) * 100);

      // Text comments from text-type answers
      const textAnswers = allAnswers.filter((a: any) => a.answer_text && a.answer_text.trim() && a.answer_value == null);

      return {
        questions: questions || [],
        responses: responses || [],
        totalResponses: (responses || []).length,
        distribution,
        totalSat,
        satisfactionRate,
        textAnswers,
        comments: allComments,
      };
    },
  });

  const categorizeComment = useMutation({
    mutationFn: async ({ responseId, questionId, commentText, category }: any) => {
      // Check if comment entry exists
      const { data: existing } = await supabase
        .from("client_survey_comments")
        .select("id")
        .eq("response_id", responseId)
        .eq("comment_text", commentText)
        .maybeSingle();

      if (existing) {
        await supabase.from("client_survey_comments").update({ category }).eq("id", existing.id);
      } else {
        await supabase.from("client_survey_comments").insert({
          response_id: responseId,
          question_id: questionId,
          comment_text: commentText,
          category,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["survey_results", selectedSurveyId] });
      toast({ title: "Commentaire catégorisé" });
    },
  });

  const createAction = useMutation({
    mutationFn: async ({ commentText, commentId }: any) => {
      const { data, error } = await supabase.from("actions").insert({
        description: `Action d'amélioration suite au retour client : "${commentText}"`,
        source_type: "satisfaction_client",
        type_action: "amelioration",
        statut: "planifiee",
      }).select().single();
      if (error) throw error;
      if (commentId) {
        await supabase.from("client_survey_comments").update({ action_id: data.id }).eq("id", commentId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["survey_results"] });
      toast({ title: "Action d'amélioration créée" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      {/* Survey selector */}
      <div className="max-w-md">
        <Label>Sélectionner un sondage</Label>
        <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
          <SelectTrigger><SelectValue placeholder="Choisir un sondage..." /></SelectTrigger>
          <SelectContent>
            {surveys.map((s: any) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedSurveyId && (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Sélectionnez un sondage pour voir les résultats</p>
        </div>
      )}

      {results && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Réponses</p>
                <p className="text-2xl font-bold">{results.totalResponses}</p>
              </div>
            </Card>
            <Card className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taux de satisfaction</p>
                <p className="text-2xl font-bold">{results.satisfactionRate}%</p>
              </div>
            </Card>
            <Card className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commentaires</p>
                <p className="text-2xl font-bold">{results.textAnswers.length}</p>
              </div>
            </Card>
          </div>

          {/* Satisfaction distribution */}
          {results.totalSat > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Répartition de la satisfaction</h3>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((level) => {
                  const count = results.distribution[level];
                  const pct = Math.round((count / results.totalSat) * 100);
                  return (
                    <div key={level} className="flex items-center gap-3">
                      <span className="text-sm w-32 text-muted-foreground">{satisfactionLabels[level]}</span>
                      <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${satisfactionColors[level]} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-12 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Comments */}
          {results.textAnswers.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Commentaires clients</h3>
              <div className="space-y-3">
                {results.textAnswers.map((a: any, idx: number) => {
                  const existingComment = results.comments.find((c: any) => c.comment_text === a.answer_text);
                  const cat = existingComment?.category;
                  const CatConfig = cat ? categoryConfig[cat] : null;

                  return (
                    <div key={idx} className="p-4 border border-border/50 rounded-xl space-y-2">
                      <p className="text-sm">{a.answer_text}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {CatConfig && (
                          <Badge className={CatConfig.color}>
                            <CatConfig.icon className="h-3 w-3 mr-1" />
                            {CatConfig.label}
                          </Badge>
                        )}
                        <Select
                          value={cat || ""}
                          onValueChange={(v) =>
                            categorizeComment.mutate({
                              responseId: a.response_id,
                              questionId: a.question_id,
                              commentText: a.answer_text,
                              category: v,
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-36 text-xs">
                            <SelectValue placeholder="Catégoriser" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amelioration">Amélioration</SelectItem>
                            <SelectItem value="plainte">Plainte</SelectItem>
                            <SelectItem value="suggestion">Suggestion</SelectItem>
                          </SelectContent>
                        </Select>
                        {!existingComment?.action_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() =>
                              createAction.mutate({
                                commentText: a.answer_text,
                                commentId: existingComment?.id,
                              })
                            }
                          >
                            <Lightbulb className="h-3 w-3" />
                            Créer action
                          </Button>
                        )}
                        {existingComment?.action_id && (
                          <Badge variant="outline" className="text-xs">Action liée ✓</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
