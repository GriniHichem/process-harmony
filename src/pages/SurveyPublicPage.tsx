import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Send, Star, Mail } from "lucide-react";
import logo from "@/assets/logo.jpg";

const anonClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const satisfactionOptions = [
  { value: 5, label: "Très satisfait", emoji: "😄" },
  { value: 4, label: "Satisfait", emoji: "🙂" },
  { value: 3, label: "Neutre", emoji: "😐" },
  { value: 2, label: "Insatisfait", emoji: "😕" },
  { value: 1, label: "Très insatisfait", emoji: "😞" },
];

function parseOptions(q: any): string[] {
  if (q.question_type === "multiple_choice" && q.image_url) {
    try { return JSON.parse(q.image_url); } catch { return []; }
  }
  return [];
}

export default function SurveyPublicPage() {
  const { token } = useParams<{ token: string }>();
  const [answers, setAnswers] = useState<Record<string, { text: string; value: number | null }>>({});
  const [respondentName, setRespondentName] = useState("");
  const [respondentEmail, setRespondentEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { data: survey, isLoading } = useQuery({
    queryKey: ["public_survey", token],
    queryFn: async () => {
      const { data: s, error: sErr } = await anonClient
        .from("client_surveys").select("*")
        .eq("public_token", token).eq("status", "active").single();
      if (sErr) throw sErr;
      const { data: questions, error: qErr } = await anonClient
        .from("client_survey_questions").select("*")
        .eq("survey_id", s.id).order("ordre");
      if (qErr) throw qErr;
      return { ...s, questions: (questions || []).map((q: any) => ({ ...q, options: parseOptions(q) })) };
    },
  });

  const isCible = survey?.mode_sondage === "cible";

  const setAnswer = (questionId: string, text: string, value: number | null) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { text, value } }));
  };

  const handleSubmit = async () => {
    if (!survey) return;

    // Validation for ciblé mode
    if (isCible) {
      if (!respondentName.trim()) {
        setError("Le nom est obligatoire pour ce sondage.");
        return;
      }
      if (!respondentEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(respondentEmail)) {
        setError("Une adresse email valide est obligatoire pour ce sondage.");
        return;
      }
    }

    setSubmitting(true);
    setError("");
    try {
      const { data: response, error: rErr } = await anonClient
        .from("client_survey_responses")
        .insert({
          survey_id: survey.id,
          respondent_name: respondentName || null,
          respondent_email: isCible ? respondentEmail : null,
        })
        .select().single();
      if (rErr) throw rErr;

      const answersToInsert = survey.questions.map((q: any) => ({
        response_id: response.id,
        question_id: q.id,
        answer_text: answers[q.id]?.text || "",
        answer_value: answers[q.id]?.value ?? null,
      }));
      const { error: aErr } = await anonClient.from("client_survey_answers").insert(answersToInsert);
      if (aErr) throw aErr;

      const textComments = answersToInsert.filter((a: any) => a.answer_text && a.answer_text.trim() && a.answer_value == null);
      for (const tc of textComments) {
        await anonClient.from("client_survey_comments").insert({
          response_id: response.id, question_id: tc.question_id,
          comment_text: tc.answer_text, category: "suggestion",
        });
      }

      // Send copy email for ciblé mode
      if (isCible && respondentEmail) {
        try {
          await anonClient.functions.invoke("send-survey-copy", {
            body: {
              response_id: response.id,
              survey_name: survey.name,
              respondent_name: respondentName,
              respondent_email: respondentEmail,
              questions: survey.questions.map((q: any) => ({
                question_text: q.question_text,
                question_type: q.question_type,
              })),
              answers: answersToInsert.map((a: any) => ({
                question_id: a.question_id,
                answer_text: a.answer_text,
                answer_value: a.answer_value,
              })),
            },
          });
        } catch (emailErr) {
          // Don't block submission if email fails
          console.error("Failed to send survey copy email:", emailErr);
        }
      }

      setSubmitted(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Sondage introuvable</h2>
          <p className="text-muted-foreground">Ce sondage n'existe pas ou n'est plus actif.</p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <Card className="p-10 text-center max-w-md">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Merci !</h2>
          <p className="text-muted-foreground">
            Merci pour votre contribution à l'amélioration de nos services.
          </p>
          {isCible && respondentEmail && (
            <p className="text-sm text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
              <Mail className="h-4 w-4" />
              Une copie de vos réponses a été envoyée à <strong>{respondentEmail}</strong>
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <img src={logo} alt="Logo" className="h-16 mx-auto rounded-xl" />
          <h1 className="text-2xl font-bold">{survey.name}</h1>
          {survey.description && <p className="text-muted-foreground">{survey.description}</p>}
          {survey.product_service && (
            <p className="text-sm text-muted-foreground">Produit / Service : <strong>{survey.product_service}</strong></p>
          )}
        </div>

        {/* Respondent info */}
        <Card className="p-5 space-y-3">
          {isCible && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 mb-2">
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <p className="text-sm text-primary">
                Une copie de vos réponses vous sera envoyée par email après soumission.
              </p>
            </div>
          )}
          <div>
            <Label>{isCible ? "Votre nom *" : "Votre nom (optionnel)"}</Label>
            <Input
              value={respondentName}
              onChange={(e) => setRespondentName(e.target.value)}
              placeholder="Nom du répondant"
              className="mt-1"
              required={isCible}
            />
          </div>
          {isCible && (
            <div>
              <Label>Votre adresse email *</Label>
              <Input
                type="email"
                value={respondentEmail}
                onChange={(e) => setRespondentEmail(e.target.value)}
                placeholder="votre@email.com"
                className="mt-1"
                required
              />
            </div>
          )}
        </Card>

        {/* Questions */}
        {survey.questions.map((q: any, idx: number) => (
          <Card key={q.id} className="p-5 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-sm font-bold text-primary mt-0.5">{idx + 1}.</span>
              <div className="flex-1">
                <p className="font-medium">{q.question_text}</p>
                {q.question_type === "image" && q.image_url && (
                  <img src={q.image_url} alt="" className="mt-2 rounded-lg max-h-48 object-cover" />
                )}
              </div>
            </div>

            {/* Satisfaction */}
            {q.question_type === "satisfaction" && (
              <div className="grid grid-cols-5 gap-2 mt-2">
                {satisfactionOptions.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setAnswer(q.id, opt.label, opt.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      answers[q.id]?.value === opt.value ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:border-primary/30"
                    }`}>
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-[10px] text-center leading-tight text-muted-foreground">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Rating (stars) */}
            {q.question_type === "rating" && (
              <div className="flex gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" onClick={() => setAnswer(q.id, `${s} étoiles`, s)}
                    className="p-1 transition-transform hover:scale-110">
                    <Star className={`h-8 w-8 transition-colors ${
                      (answers[q.id]?.value || 0) >= s ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
                    }`} />
                  </button>
                ))}
              </div>
            )}

            {/* NPS */}
            {q.question_type === "nps" && (
              <div className="space-y-2 mt-2">
                <div className="flex gap-1 flex-wrap">
                  {Array.from({ length: 11 }, (_, i) => (
                    <button key={i} type="button" onClick={() => setAnswer(q.id, `NPS: ${i}`, i)}
                      className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-medium border-2 transition-all
                        ${answers[q.id]?.value === i ? "border-primary bg-primary text-primary-foreground shadow-sm" :
                          i <= 6 ? "border-red-200 bg-red-50 text-red-700 hover:border-red-400 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
                          : i <= 8 ? "border-yellow-200 bg-yellow-50 text-yellow-700 hover:border-yellow-400 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400"
                        }`}>
                      {i}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground px-1">
                  <span>Pas du tout probable</span>
                  <span>Très probable</span>
                </div>
              </div>
            )}

            {/* Multiple choice */}
            {q.question_type === "multiple_choice" && (
              <div className="space-y-2 mt-2">
                {(q.options || []).map((opt: string, optIdx: number) => (
                  <button key={optIdx} type="button" onClick={() => setAnswer(q.id, opt, optIdx + 1)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      answers[q.id]?.text === opt ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"
                    }`}>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      answers[q.id]?.text === opt ? "border-primary bg-primary" : "border-muted-foreground/40"
                    }`}>
                      {answers[q.id]?.text === opt && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                    </div>
                    <span className="text-sm">{opt}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Text */}
            {q.question_type === "text" && (
              <Textarea rows={3} placeholder="Votre réponse..." value={answers[q.id]?.text || ""}
                onChange={(e) => setAnswer(q.id, e.target.value, null)} />
            )}

            {/* Yes/No */}
            {q.question_type === "yes_no" && (
              <div className="flex gap-3">
                {[{ label: "Oui", value: 1 }, { label: "Non", value: 0 }].map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setAnswer(q.id, opt.label, opt.value)}
                    className={`px-6 py-2.5 rounded-xl border-2 font-medium transition-all ${
                      answers[q.id]?.value === opt.value ? "border-primary bg-primary/5" : "border-border/50 hover:border-primary/30"
                    }`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Image comment */}
            {q.question_type === "image" && (
              <Textarea rows={2} placeholder="Votre commentaire sur cette image..."
                value={answers[q.id]?.text || ""} onChange={(e) => setAnswer(q.id, e.target.value, null)} />
            )}
          </Card>
        ))}

        {error && <p className="text-destructive text-sm text-center">{error}</p>}

        <div className="text-center pb-8">
          <Button size="lg" onClick={handleSubmit} disabled={submitting} className="gap-2 px-8">
            <Send className="h-4 w-4" />
            {submitting ? "Envoi en cours..." : "Envoyer mes réponses"}
          </Button>
        </div>
      </div>
    </div>
  );
}
