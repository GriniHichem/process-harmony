import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      survey_name,
      respondent_name,
      respondent_email,
      questions,
      answers,
    } = await req.json();

    if (!respondent_email || !survey_name) {
      return new Response(
        JSON.stringify({ error: "Email et nom du sondage requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch SMTP settings
    const { data: settingsData } = await adminClient
      .from("app_settings")
      .select("key, value")
      .in("key", ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "support_email", "app_name"]);

    const cfg: Record<string, string> = {};
    for (const row of settingsData ?? []) {
      cfg[row.key] = row.value;
    }

    if (!cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_password) {
      console.error("SMTP not configured, skipping survey copy email");
      return new Response(
        JSON.stringify({ error: "Configuration SMTP non disponible" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appName = cfg.app_name || "Q-Process";
    const fromEmail = cfg.support_email || cfg.smtp_user;
    const port = parseInt(cfg.smtp_port || "587", 10);
    const domain = fromEmail.split("@")[1] || "localhost";

    // Build questions/answers recap HTML + plain text
    let recapHtml = "";
    let recapText = "";
    for (let i = 0; i < (questions || []).length; i++) {
      const q = questions[i];
      const a = answers?.[i];
      const answerDisplay = a?.answer_text || (a?.answer_value != null ? String(a.answer_value) : "—");

      recapHtml += `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500; color: #374151; width: 50%; vertical-align: top;">
            ${i + 1}. ${escapeHtml(q.question_text)}
          </td>
          <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #1f2937; vertical-align: top;">
            ${escapeHtml(answerDisplay)}
          </td>
        </tr>
      `;
      recapText += `${i + 1}. ${q.question_text}\n   Reponse: ${answerDisplay}\n\n`;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="color: #1f2937; margin: 0 0 8px 0; font-size: 20px;">
            Copie de vos reponses
          </h2>
          <p style="color: #6b7280; margin: 0 0 24px 0; font-size: 14px;">
            Sondage : <strong>${escapeHtml(survey_name)}</strong>
          </p>

          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #6b7280; font-weight: 600;">Question</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 13px; color: #6b7280; font-weight: 600;">Votre reponse</th>
              </tr>
            </thead>
            <tbody>
              ${recapHtml}
            </tbody>
          </table>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #9ca3af; margin: 0;">
            Repondant : ${escapeHtml(respondent_name || "—")}<br/>
            Date : ${dateStr}<br/>
            Ce message a ete envoye automatiquement par ${escapeHtml(appName)}.
          </p>
        </div>
      </div>
    `;

    const plainText = `Copie de vos reponses - Sondage: ${survey_name}\n\nRepondant: ${respondent_name || "—"}\nDate: ${dateStr}\n\n${recapText}Ce message a ete envoye automatiquement par ${appName}.`;

    const client = new SMTPClient({
      connection: {
        hostname: cfg.smtp_host,
        port,
        tls: port === 465,
        auth: {
          username: cfg.smtp_user,
          password: cfg.smtp_password,
        },
      },
    });

    await client.send({
      from: `${appName} <${fromEmail}>`,
      to: respondent_email,
      subject: `Copie de vos reponses - ${survey_name}`,
      content: plainText,
      html,
      headers: {
        "Message-ID": `<survey-${Date.now()}-${Math.random().toString(36).slice(2)}@${domain}>`,
        "Reply-To": fromEmail,
        "X-Mailer": appName,
      },
    });

    await client.close();
    console.log("Survey copy email sent to", respondent_email);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error sending survey copy email:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erreur lors de l'envoi" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
