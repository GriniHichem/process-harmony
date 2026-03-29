import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, MessageCircle, TrendingUp, Users, Lightbulb, AlertTriangle, Sparkles, Star, Gauge, Download, Target } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell } from "recharts";

const satisfactionLabels = ["", "Très insatisfait", "Insatisfait", "Neutre", "Satisfait", "Très satisfait"];
const satisfactionColors = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-400", "bg-emerald-600"];

const categoryConfig: Record<string, { label: string; icon: any; color: string }> = {
  amelioration: { label: "Amélioration", icon: Lightbulb, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  plainte: { label: "Plainte", icon: AlertTriangle, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  suggestion: { label: "Suggestion", icon: Sparkles, color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
};

function getStatusIcon(score: number) {
  if (score >= 80) return <span className="text-emerald-600 font-bold">✅</span>;
  if (score >= 50) return <span className="text-amber-600 font-bold">⚠️</span>;
  return <span className="text-red-600 font-bold">❌</span>;
}

function getStatusColor(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

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

  const selectedSurvey = surveys.find((s: any) => s.id === selectedSurveyId);
  const isIso = !!selectedSurvey?.template_id;

  const { data: results } = useQuery({
    queryKey: ["survey_results", selectedSurveyId],
    enabled: !!selectedSurveyId,
    queryFn: async () => {
      const [{ data: questions }, { data: responses }, { data: surveyAnswers }] = await Promise.all([
        supabase.from("client_survey_questions").select("*").eq("survey_id", selectedSurveyId).order("ordre"),
        supabase.from("client_survey_responses").select("*, client_survey_answers(*)").eq("survey_id", selectedSurveyId),
        supabase.from("survey_answers").select("*").eq("survey_id", selectedSurveyId),
      ]);

      const responseIds = (responses || []).map((r: any) => r.id);
      let allComments: any[] = [];
      if (responseIds.length > 0) {
        const { data: c } = await supabase.from("client_survey_comments").select("*").in("response_id", responseIds);
        allComments = c || [];
      }

      const allAnswers = (responses || []).flatMap((r: any) => r.client_survey_answers || []);
      const qMap = new Map((questions || []).map((q: any) => [q.id, q]));

      // Satisfaction distribution (classic)
      const satAnswers = allAnswers.filter((a: any) => {
        const q = qMap.get(a.question_id);
        return q?.question_type === "satisfaction" && a.answer_value != null;
      });
      const distribution = [0, 0, 0, 0, 0, 0];
      satAnswers.forEach((a: any) => { if (a.answer_value >= 1 && a.answer_value <= 5) distribution[a.answer_value]++; });

      let weightedSatSum = 0, weightedSatMax = 0;
      satAnswers.forEach((a: any) => {
        const q = qMap.get(a.question_id);
        const poids = q?.poids ?? 1;
        weightedSatSum += a.answer_value * poids;
        weightedSatMax += 5 * poids;
      });
      const satisfactionRate = weightedSatMax > 0 ? Math.round((weightedSatSum / weightedSatMax) * 100) : 0;
      const totalSat = satAnswers.length || 1;

      // Rating average
      const ratingAnswers = allAnswers.filter((a: any) => qMap.get(a.question_id)?.question_type === "rating" && a.answer_value != null);
      let avgRating: string | null = null;
      if (ratingAnswers.length > 0) {
        let wSum = 0, wTotal = 0;
        ratingAnswers.forEach((a: any) => { const p = qMap.get(a.question_id)?.poids ?? 1; wSum += a.answer_value * p; wTotal += p; });
        avgRating = (wSum / wTotal).toFixed(1);
      }

      // NPS
      const npsAnswers = allAnswers.filter((a: any) => qMap.get(a.question_id)?.question_type === "nps" && a.answer_value != null);
      let npsScore: number | null = null;
      if (npsAnswers.length > 0) {
        let wP = 0, wD = 0, wT = 0;
        npsAnswers.forEach((a: any) => { const p = qMap.get(a.question_id)?.poids ?? 1; if (a.answer_value >= 9) wP += p; if (a.answer_value <= 6) wD += p; wT += p; });
        npsScore = wT > 0 ? Math.round(((wP - wD) / wT) * 100) : 0;
      }

      // Absolute/Relative analysis (from survey_answers table)
      const absRelData = surveyAnswers || [];

      // Group by section
      const sectionMap = new Map<string, any[]>();
      absRelData.forEach((a: any) => {
        const sec = a.section_title || "Sans section";
        if (!sectionMap.has(sec)) sectionMap.set(sec, []);
        sectionMap.get(sec)!.push(a);
      });

      const sectionAnalysis = Array.from(sectionMap.entries()).map(([section, items]) => {
        const iaValues = items.filter((a: any) => a.absolute_rating != null).map((a: any) => Number(a.absolute_rating));
        const irValues = items.filter((a: any) => a.relative_rating != null).map((a: any) => Number(a.relative_rating));
        const iaAvg = iaValues.length > 0 ? iaValues.reduce((a, b) => a + b, 0) / iaValues.length : 0;
        const irAvg = irValues.length > 0 ? irValues.reduce((a, b) => a + b, 0) / irValues.length : 0;

        return {
          section,
          questions: items.map((a: any) => ({
            label: a.question_label,
            ia: Number(a.absolute_rating) || 0,
            ir: Number(a.relative_rating) || 0,
            obsAbsolute: a.absolute_observation,
            obsRelative: a.relative_observation,
          })),
          iaAvg: Math.round(iaAvg * 10) / 10,
          irAvg: Math.round(irAvg * 10) / 10,
        };
      });

      const globalIa = sectionAnalysis.length > 0 ? Math.round(sectionAnalysis.reduce((s, sec) => s + sec.iaAvg, 0) / sectionAnalysis.length * 10) / 10 : 0;
      const globalIr = sectionAnalysis.length > 0 ? Math.round(sectionAnalysis.reduce((s, sec) => s + sec.irAvg, 0) / sectionAnalysis.length * 10) / 10 : 0;

      // Alerts: questions where Ir < Ia
      const alerts = absRelData
        .filter((a: any) => a.relative_rating != null && a.absolute_rating != null && Number(a.relative_rating) < Number(a.absolute_rating))
        .map((a: any) => ({ label: a.question_label, section: a.section_title, ia: Number(a.absolute_rating), ir: Number(a.relative_rating) }));

      const textAnswers = allAnswers.filter((a: any) => a.answer_text && a.answer_text.trim() && a.answer_value == null);

      return {
        questions: questions || [], responses: responses || [],
        totalResponses: (responses || []).length,
        distribution, totalSat, satisfactionRate,
        avgRating, ratingCount: ratingAnswers.length,
        npsScore, npsCount: npsAnswers.length,
        textAnswers, comments: allComments,
        sectionAnalysis, globalIa, globalIr, alerts,
        hasAbsRel: absRelData.length > 0,
      };
    },
  });

  const categorizeComment = useMutation({
    mutationFn: async ({ responseId, questionId, commentText, category }: any) => {
      const { data: existing } = await supabase.from("client_survey_comments").select("id").eq("response_id", responseId).eq("comment_text", commentText).maybeSingle();
      if (existing) { await supabase.from("client_survey_comments").update({ category }).eq("id", existing.id); }
      else { await supabase.from("client_survey_comments").insert({ response_id: responseId, question_id: questionId, comment_text: commentText, category }); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["survey_results", selectedSurveyId] }); toast({ title: "Commentaire catégorisé" }); },
  });

  const createAction = useMutation({
    mutationFn: async ({ commentText, commentId }: any) => {
      const { data, error } = await supabase.from("actions").insert({
        description: `Action d'amélioration suite au retour client : "${commentText}"`,
        source_type: "satisfaction_client", type_action: "amelioration", statut: "planifiee",
      }).select().single();
      if (error) throw error;
      if (commentId) { await supabase.from("client_survey_comments").update({ action_id: data.id }).eq("id", commentId); }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["survey_results"] }); toast({ title: "Action d'amélioration créée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  // Radar data
  const radarData = useMemo(() => {
    if (!results?.sectionAnalysis) return [];
    return results.sectionAnalysis.map((sec: any, i: number) => ({
      subject: `${String.fromCharCode(65 + i)}. ${sec.section.length > 20 ? sec.section.substring(0, 20) + "…" : sec.section}`,
      Ia: sec.iaAvg,
      Ir: sec.irAvg,
    }));
  }, [results]);

  // Bar data
  const barData = useMemo(() => {
    if (!results?.sectionAnalysis) return [];
    return results.sectionAnalysis.flatMap((sec: any) =>
      sec.questions.map((q: any) => ({
        name: q.label.length > 30 ? q.label.substring(0, 30) + "…" : q.label,
        Ia: q.ia,
        Ir: q.ir,
      }))
    );
  }, [results]);

  const exportCsv = () => {
    if (!results?.sectionAnalysis || results.sectionAnalysis.length === 0) return;
    const BOM = "\uFEFF";
    const sep = ";";
    const lines = [`Section${sep}Question${sep}Ia (Absolu)${sep}Statut Ia${sep}Ir (Concurrence)${sep}Statut Ir${sep}Observations Ia${sep}Observations Ir`];
    for (const sec of results.sectionAnalysis) {
      for (const q of sec.questions) {
        const statusIa = q.ia >= 80 ? "Satisfaisant" : q.ia >= 50 ? "Moyen" : "Insuffisant";
        const statusIr = q.ir >= 80 ? "Meilleur" : q.ir >= 50 ? "Comparable" : "Moins bon";
        lines.push(`"${sec.section}"${sep}"${q.label}"${sep}${q.ia}${sep}"${statusIa}"${sep}${q.ir}${sep}"${statusIr}"${sep}"${q.obsAbsolute || ""}"${sep}"${q.obsRelative || ""}"`);
      }
      lines.push(`"${sec.section}"${sep}"MOYENNE SECTION"${sep}${sec.iaAvg}${sep}""${sep}${sec.irAvg}${sep}""${sep}""${sep}""`);
    }
    lines.push(`""${sep}"MOYENNE GLOBALE"${sep}${results.globalIa}${sep}""${sep}${results.globalIr}${sep}""${sep}""${sep}""`);

    const blob = new Blob([BOM + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resultats_${selectedSurvey?.name?.replace(/\s/g, "_") || "sondage"}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export CSV téléchargé" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-4">
        <div className="flex-1 max-w-md">
          <Label>Sélectionner un sondage</Label>
          <Select value={selectedSurveyId} onValueChange={setSelectedSurveyId}>
            <SelectTrigger><SelectValue placeholder="Choisir un sondage..." /></SelectTrigger>
            <SelectContent>
              {surveys.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    {s.name}
                    {s.template_id && <span className="text-[10px] text-muted-foreground ml-1">📋 ISO</span>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {results?.hasAbsRel && (
          <Button variant="outline" onClick={exportCsv} className="gap-1.5">
            <Download className="h-4 w-4" />Export CSV
          </Button>
        )}
      </div>

      {!selectedSurveyId && (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Sélectionnez un sondage pour voir les résultats</p>
        </div>
      )}

      {results && (
        <div className="space-y-6">
          {/* Survey info badge */}
          {selectedSurvey && (
            <div className="flex items-center gap-2 flex-wrap">
              {isIso && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">📋 {selectedSurvey.template_name}</Badge>}
              {selectedSurvey.client && <Badge variant="outline">Client : {selectedSurvey.client}</Badge>}
              {selectedSurvey.survey_date && <Badge variant="outline">Date : {selectedSurvey.survey_date}</Badge>}
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Réponses</p>
                <p className="text-xl font-bold">{results.totalResponses}</p>
              </div>
            </Card>

            {results.hasAbsRel && (
              <>
                <Card className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Target className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ia moyen</p>
                    <p className={`text-xl font-bold ${getStatusColor(results.globalIa)}`}>{results.globalIa}/100</p>
                  </div>
                </Card>
                <Card className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Ir moyen</p>
                    <p className={`text-xl font-bold ${getStatusColor(results.globalIr)}`}>{results.globalIr}/100</p>
                  </div>
                </Card>
              </>
            )}

            {!results.hasAbsRel && (
              <Card className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Satisfaction</p>
                  <p className="text-xl font-bold">{results.satisfactionRate}%</p>
                </div>
              </Card>
            )}

            {results.avgRating !== null && (
              <Card className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Star className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Note</p>
                  <p className="text-xl font-bold">{results.avgRating}/5</p>
                </div>
              </Card>
            )}

            {results.npsScore !== null && (
              <Card className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Gauge className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">NPS</p>
                  <p className={`text-xl font-bold ${results.npsScore >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {results.npsScore > 0 ? "+" : ""}{results.npsScore}
                  </p>
                </div>
              </Card>
            )}

            <Card className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                <MessageCircle className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Commentaires</p>
                <p className="text-xl font-bold">{results.textAnswers.length}</p>
              </div>
            </Card>
          </div>

          {/* ===== ISO SECTION ANALYSIS ===== */}
          {results.hasAbsRel && results.sectionAnalysis.length > 0 && (
            <>
              {/* Section detail table */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Analyse détaillée par section
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[250px]">Question</TableHead>
                        <TableHead className="text-center w-20">Ia</TableHead>
                        <TableHead className="text-center w-16">Statut</TableHead>
                        <TableHead className="text-center w-20">Ir</TableHead>
                        <TableHead className="text-center w-16">Statut</TableHead>
                        <TableHead className="text-center w-16">Écart</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.sectionAnalysis.map((sec: any, si: number) => (
                        <>
                          {/* Section header */}
                          <TableRow key={`sec-${si}`} className="bg-muted/50">
                            <TableCell colSpan={6} className="font-semibold text-sm">
                              {String.fromCharCode(65 + si)}. {sec.section}
                            </TableCell>
                          </TableRow>
                          {/* Questions */}
                          {sec.questions.map((q: any, qi: number) => {
                            const ecart = q.ir - q.ia;
                            return (
                              <TableRow key={`q-${si}-${qi}`}>
                                <TableCell className="pl-8 text-sm">{q.label}</TableCell>
                                <TableCell className={`text-center font-semibold ${getStatusColor(q.ia)}`}>{q.ia}</TableCell>
                                <TableCell className="text-center">{getStatusIcon(q.ia)}</TableCell>
                                <TableCell className={`text-center font-semibold ${getStatusColor(q.ir)}`}>{q.ir}</TableCell>
                                <TableCell className="text-center">{getStatusIcon(q.ir)}</TableCell>
                                <TableCell className={`text-center text-sm font-medium ${ecart < 0 ? "text-red-600" : ecart > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                                  {ecart > 0 ? "+" : ""}{ecart}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {/* Section average */}
                          <TableRow key={`avg-${si}`} className="border-t-2">
                            <TableCell className="pl-8 font-semibold text-sm text-primary">Moyenne section {String.fromCharCode(65 + si)}</TableCell>
                            <TableCell className={`text-center font-bold ${getStatusColor(sec.iaAvg)}`}>{sec.iaAvg}</TableCell>
                            <TableCell className="text-center">{getStatusIcon(sec.iaAvg)}</TableCell>
                            <TableCell className={`text-center font-bold ${getStatusColor(sec.irAvg)}`}>{sec.irAvg}</TableCell>
                            <TableCell className="text-center">{getStatusIcon(sec.irAvg)}</TableCell>
                            <TableCell className={`text-center font-bold ${(sec.irAvg - sec.iaAvg) < 0 ? "text-red-600" : "text-emerald-600"}`}>
                              {(sec.irAvg - sec.iaAvg) > 0 ? "+" : ""}{Math.round((sec.irAvg - sec.iaAvg) * 10) / 10}
                            </TableCell>
                          </TableRow>
                        </>
                      ))}
                      {/* Global average */}
                      <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                        <TableCell className="font-bold">MOYENNE GLOBALE</TableCell>
                        <TableCell className={`text-center font-bold text-lg ${getStatusColor(results.globalIa)}`}>{results.globalIa}</TableCell>
                        <TableCell className="text-center">{getStatusIcon(results.globalIa)}</TableCell>
                        <TableCell className={`text-center font-bold text-lg ${getStatusColor(results.globalIr)}`}>{results.globalIr}</TableCell>
                        <TableCell className="text-center">{getStatusIcon(results.globalIr)}</TableCell>
                        <TableCell className={`text-center font-bold ${(results.globalIr - results.globalIa) < 0 ? "text-red-600" : "text-emerald-600"}`}>
                          {(results.globalIr - results.globalIa) > 0 ? "+" : ""}{Math.round((results.globalIr - results.globalIa) * 10) / 10}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </Card>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Radar chart */}
                {radarData.length > 0 && (
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4">Radar Ia vs Ir par section</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Radar name="Ia (Absolu)" dataKey="Ia" stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 36%)" fillOpacity={0.2} />
                        <Radar name="Ir (Concurrence)" dataKey="Ir" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.2} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </Card>
                )}

                {/* Bar chart */}
                {barData.length > 0 && (
                  <Card className="p-6">
                    <h3 className="font-semibold mb-4">Comparaison Ia/Ir par question</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={barData} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Ia" name="Ia (Absolu)" fill="hsl(142, 76%, 36%)" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="Ir" name="Ir (Concurrence)" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                )}
              </div>

              {/* Alerts */}
              {results.alerts.length > 0 && (
                <Card className="p-6 border-amber-200 dark:border-amber-800">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-5 w-5" />
                    Alertes : Concurrence mieux positionnée ({results.alerts.length})
                  </h3>
                  <div className="space-y-2">
                    {results.alerts.map((alert: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 text-sm">
                        <span className="font-medium flex-1">{alert.label}</span>
                        <Badge variant="outline" className="text-[10px]">{alert.section}</Badge>
                        <span className="text-emerald-600 font-semibold">Ia: {alert.ia}</span>
                        <span className="text-red-600 font-semibold">Ir: {alert.ir}</span>
                        <span className="text-red-600 text-xs">({alert.ir - alert.ia})</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}

          {/* ===== CLASSIC SATISFACTION ===== */}
          {!results.hasAbsRel && results.totalSat > 0 && results.distribution.some((d: number, i: number) => i > 0 && d > 0) && (
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
                        {existingComment?.action_id && <Badge variant="outline" className="text-xs">Action liée ✓</Badge>}
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
