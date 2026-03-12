import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { BarChart3, MessageCircle, TrendingUp, Users, Lightbulb, AlertTriangle, Sparkles, Star, Gauge } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const satisfactionLabels = ["", "Très insatisfait", "Insatisfait", "Neutre", "Satisfait", "Très satisfait"];
const satisfactionColors = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-400", "bg-emerald-600"];

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
      const [{ data: questions }, { data: responses }] = await Promise.all([
        supabase.from("client_survey_questions").select("*").eq("survey_id", selectedSurveyId).order("ordre"),
        supabase.from("client_survey_responses").select("*, client_survey_answers(*)").eq("survey_id", selectedSurveyId),
      ]);

      const responseIds = (responses || []).map((r: any) => r.id);
      let allComments: any[] = [];
      if (responseIds.length > 0) {
        const { data: c } = await supabase.from("client_survey_comments").select("*").in("response_id", responseIds);
        allComments = c || [];
      }

      const allAnswers = (responses || []).flatMap((r: any) => r.client_survey_answers || []);
      const qMap = new Map((questions || []).map((q: any) => [q.id, q]));

      // Weighted satisfaction distribution
      const satAnswers = allAnswers.filter((a: any) => {
        const q = qMap.get(a.question_id);
        return q?.question_type === "satisfaction" && a.answer_value != null;
      });
      const distribution = [0, 0, 0, 0, 0, 0];
      satAnswers.forEach((a: any) => { if (a.answer_value >= 1 && a.answer_value <= 5) distribution[a.answer_value]++; });

      // Weighted satisfaction rate: sum(value * poids) / sum(max_value * poids)
      let weightedSatSum = 0;
      let weightedSatMax = 0;
      satAnswers.forEach((a: any) => {
        const q = qMap.get(a.question_id);
        const poids = q?.poids ?? 1;
        weightedSatSum += a.answer_value * poids;
        weightedSatMax += 5 * poids;
      });
      const satisfactionRate = weightedSatMax > 0 ? Math.round((weightedSatSum / weightedSatMax) * 100) : 0;
      const totalSat = satAnswers.length || 1;

      // Weighted rating average: sum(value * poids) / sum(poids)
      const ratingAnswers = allAnswers.filter((a: any) => {
        const q = qMap.get(a.question_id);
        return q?.question_type === "rating" && a.answer_value != null;
      });
      let avgRating: string | null = null;
      if (ratingAnswers.length > 0) {
        let wSum = 0, wTotal = 0;
        ratingAnswers.forEach((a: any) => {
          const poids = qMap.get(a.question_id)?.poids ?? 1;
          wSum += a.answer_value * poids;
          wTotal += poids;
        });
        avgRating = (wSum / wTotal).toFixed(1);
      }

      // Weighted NPS calculation
      const npsAnswers = allAnswers.filter((a: any) => {
        const q = qMap.get(a.question_id);
        return q?.question_type === "nps" && a.answer_value != null;
      });
      let npsScore: number | null = null;
      if (npsAnswers.length > 0) {
        let wPromoters = 0, wDetractors = 0, wTotal = 0;
        npsAnswers.forEach((a: any) => {
          const poids = qMap.get(a.question_id)?.poids ?? 1;
          if (a.answer_value >= 9) wPromoters += poids;
          if (a.answer_value <= 6) wDetractors += poids;
          wTotal += poids;
        });
        npsScore = wTotal > 0 ? Math.round(((wPromoters - wDetractors) / wTotal) * 100) : 0;
      }

      const textAnswers = allAnswers.filter((a: any) => a.answer_text && a.answer_text.trim() && a.answer_value == null);

      return {
        questions: questions || [],
        responses: responses || [],
        totalResponses: (responses || []).length,
        distribution, totalSat, satisfactionRate,
        avgRating, ratingCount: ratingAnswers.length,
        npsScore, npsCount: npsAnswers.length,
        textAnswers, comments: allComments,
      };
    },
  });

  const categorizeComment = useMutation({
    mutationFn: async ({ responseId, questionId, commentText, category }: any) => {
      const { data: existing } = await supabase
        .from("client_survey_comments").select("id")
        .eq("response_id", responseId).eq("comment_text", commentText).maybeSingle();
      if (existing) {
        await supabase.from("client_survey_comments").update({ category }).eq("id", existing.id);
      } else {
        await supabase.from("client_survey_comments").insert({
          response_id: responseId, question_id: questionId,
          comment_text: commentText, category,
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
        source_type: "satisfaction_client", type_action: "amelioration", statut: "planifiee",
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
      <div className="max-w-md">
        <Label>Sélectionner un sondage</Label>
        <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
          <SelectTrigger><SelectValue placeholder="Choisir un sondage..." /></SelectTrigger>
          <SelectContent>
            {surveys.map((s: any) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <p className="text-sm text-muted-foreground">Taux satisfaction</p>
                <p className="text-2xl font-bold">{results.satisfactionRate}%</p>
              </div>
            </Card>
            {results.avgRating !== null && (
              <Card className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Star className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Note moyenne</p>
                  <p className="text-2xl font-bold">{results.avgRating}/5</p>
                  <p className="text-[10px] text-muted-foreground">{results.ratingCount} votes</p>
                </div>
              </Card>
            )}
            {results.npsScore !== null && (
              <Card className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Gauge className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Score NPS</p>
                  <p className={`text-2xl font-bold ${results.npsScore >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {results.npsScore > 0 ? "+" : ""}{results.npsScore}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{results.npsCount} votes</p>
                </div>
              </Card>
            )}
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
          {results.totalSat > 0 && results.distribution.some((d: number, i: number) => i > 0 && d > 0) && (
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
                        <div className={`h-full ${satisfactionColors[level]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-semibold w-16 text-right">{pct}% ({count})</span>
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
                            <CatConfig.icon className="h-3 w-3 mr-1" />{CatConfig.label}
                          </Badge>
                        )}
                        <Select value={cat || ""} onValueChange={(v) => categorizeComment.mutate({
                          responseId: a.response_id, questionId: a.question_id, commentText: a.answer_text, category: v,
                        })}>
                          <SelectTrigger className="h-7 w-36 text-xs"><SelectValue placeholder="Catégoriser" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="amelioration">Amélioration</SelectItem>
                            <SelectItem value="plainte">Plainte</SelectItem>
                            <SelectItem value="suggestion">Suggestion</SelectItem>
                          </SelectContent>
                        </Select>
                        {!existingComment?.action_id && (
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                            onClick={() => createAction.mutate({ commentText: a.answer_text, commentId: existingComment?.id })}>
                            <Lightbulb className="h-3 w-3" />Créer action
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
