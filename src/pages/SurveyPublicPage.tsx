import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Send, Star } from "lucide-react";
import logo from "@/assets/logo.jpg";

// Anonymous supabase client for guest access
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

export default function SurveyPublicPage() {
  const { token } = useParams<{ token: string }>();
  const [answers, setAnswers] = useState<Record<string, { text: string; value: number | null }>>({});
  const [respondentName, setRespondentName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { data: survey, isLoading } = useQuery({
    queryKey: ["public_survey", token],
    queryFn: async () => {
      const { data: s, error: sErr } = await anonClient
        .from("client_surveys")
        .select("*")
        .eq("public_token", token)
        .eq("status", "active")
        .single();
      if (sErr) throw sErr;

      const { data: questions, error: qErr } = await anonClient
        .from("client_survey_questions")
        .select("*")
        .eq("survey_id", s.id)
        .order("ordre");
      if (qErr) throw qErr;

      return { ...s, questions };
    },
  });

  const setAnswer = (questionId: string, text: string, value: number | null) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { text, value } }));
  };

  const handleSubmit = async () => {
    if (!survey) return;
    setSubmitting(true);
    setError("");

    try {
      // Create response
      const { data: response, error: rErr } = await anonClient
        .from("client_survey_responses")
        .insert({ survey_id: survey.id, respondent_name: respondentName || null })
        .select()
        .single();
      if (rErr) throw rErr;

      // Create answers
      const answersToInsert = survey.questions.map((q: any) => ({
        response_id: response.id,
        question_id: q.id,
        answer_text: answers[q.id]?.text || "",
        answer_value: answers[q.id]?.value ?? null,
      }));

      const { error: aErr } = await anonClient.from("client_survey_answers").insert(answersToInsert);
      if (aErr) throw aErr;

      // Insert text comments into client_survey_comments
      const textComments = answersToInsert.filter((a: any) => a.answer_text && !a.answer_value);
      for (const tc of textComments) {
        await anonClient.from("client_survey_comments").insert({
          response_id: response.id,
          question_id: tc.question_id,
          comment_text: tc.answer_text,
          category: "suggestion",
        });
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Sondage introuvable</h2>
          <p className="text-muted-foreground">Ce sondage n'existe pas ou n'est plus actif.</p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
        <Card className="p-8 text-center max-w-md">
          <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Merci !</h2>
          <p className="text-muted-foreground">
            Merci pour votre contribution à l'amélioration de nos services.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 py-8 px-4">
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

        {/* Respondent name */}
        <Card className="p-5">
          <Label>Votre nom (optionnel)</Label>
          <Input
            value={respondentName}
            onChange={(e) => setRespondentName(e.target.value)}
            placeholder="Nom du répondant"
            className="mt-1"
          />
        </Card>

        {/* Questions */}
        {survey.questions.map((q: any, idx: number) => (
          <Card key={q.id} className="p-5 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-sm font-bold text-primary">{idx + 1}.</span>
              <div className="flex-1">
                <p className="font-medium">{q.question_text}</p>
                {q.image_url && <img src={q.image_url} alt="" className="mt-2 rounded-lg max-h-48 object-cover" />}
              </div>
            </div>

            {q.question_type === "satisfaction" && (
              <div className="grid grid-cols-5 gap-2 mt-2">
                {satisfactionOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAnswer(q.id, opt.label, opt.value)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      answers[q.id]?.value === opt.value
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/50 hover:border-primary/30"
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-[10px] text-center leading-tight text-muted-foreground">{opt.label}</span>
                  </button>
                ))}
              </div>
            )}

            {q.question_type === "text" && (
              <Textarea
                rows={3}
                placeholder="Votre réponse..."
                value={answers[q.id]?.text || ""}
                onChange={(e) => setAnswer(q.id, e.target.value, null)}
              />
            )}

            {q.question_type === "yes_no" && (
              <div className="flex gap-3">
                {[{ label: "Oui", value: 1 }, { label: "Non", value: 0 }].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAnswer(q.id, opt.label, opt.value)}
                    className={`px-6 py-2.5 rounded-xl border-2 font-medium transition-all ${
                      answers[q.id]?.value === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-primary/30"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {q.question_type === "image" && (
              <Textarea
                rows={2}
                placeholder="Votre commentaire sur cette image..."
                value={answers[q.id]?.text || ""}
                onChange={(e) => setAnswer(q.id, e.target.value, null)}
              />
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
