import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailPayload {
  user_id: string;
  title: string;
  message: string;
  entity_url?: string;
  notif_type?: string;
  entity_type?: string;
  entity_id?: string;
}

// ── Template colors by notification type ──
const TEMPLATE_COLORS: Record<string, { banner: string; accent: string; label: string }> = {
  assignation:    { banner: "#2563eb", accent: "#dbeafe", label: "Nouvelle assignation" },
  echeance_proche:{ banner: "#f59e0b", accent: "#fef3c7", label: "Echeance proche" },
  retard:         { banner: "#ef4444", accent: "#fee2e2", label: "Action en retard" },
  statut_change:  { banner: "#10b981", accent: "#d1fae5", label: "Changement de statut" },
};

// ── Entity metadata: table name, FR label, and fields to display ──
const ENTITY_META: Record<string, { table: string; label: string; fields: { key: string; label: string }[] }> = {
  actions: {
    table: "actions",
    label: "Action",
    fields: [
      { key: "description", label: "Description" },
      { key: "type_action", label: "Type" },
      { key: "statut", label: "Statut" },
      { key: "echeance", label: "Echeance" },
      { key: "source_type", label: "Source" },
    ],
  },
  quality_objectives: {
    table: "quality_objectives",
    label: "Objectif qualite",
    fields: [
      { key: "description", label: "Description" },
      { key: "statut", label: "Statut" },
      { key: "echeance", label: "Echeance" },
    ],
  },
  review_decisions: {
    table: "review_decisions",
    label: "Decision de revue",
    fields: [
      { key: "description", label: "Description" },
      { key: "statut", label: "Statut" },
      { key: "echeance", label: "Echeance" },
    ],
  },
  risk_actions: {
    table: "risk_actions",
    label: "Action sur risque",
    fields: [
      { key: "description", label: "Description" },
      { key: "statut", label: "Statut" },
      { key: "deadline", label: "Echeance" },
    ],
  },
  risk_moyens: {
    table: "risk_moyens",
    label: "Moyen de maitrise (risque)",
    fields: [
      { key: "description", label: "Description" },
      { key: "type_moyen", label: "Type" },
      { key: "statut", label: "Statut" },
      { key: "deadline", label: "Echeance" },
    ],
  },
  indicator_actions: {
    table: "indicator_actions",
    label: "Action sur indicateur",
    fields: [
      { key: "description", label: "Description" },
      { key: "statut", label: "Statut" },
      { key: "deadline", label: "Echeance" },
    ],
  },
  indicator_moyens: {
    table: "indicator_moyens",
    label: "Moyen de maitrise (indicateur)",
    fields: [
      { key: "description", label: "Description" },
      { key: "type_moyen", label: "Type" },
      { key: "statut", label: "Statut" },
      { key: "deadline", label: "Echeance" },
    ],
  },
  context_issue_actions: {
    table: "context_issue_actions",
    label: "Action sur enjeu",
    fields: [
      { key: "description", label: "Description" },
      { key: "statut", label: "Statut" },
      { key: "date_revue", label: "Date de revue" },
    ],
  },
  process_tasks: {
    table: "process_tasks",
    label: "Tache processus",
    fields: [
      { key: "description", label: "Description" },
      { key: "code", label: "Code" },
      { key: "type_flux", label: "Type" },
    ],
  },
  processes: {
    table: "processes",
    label: "Processus",
    fields: [
      { key: "nom", label: "Nom" },
      { key: "type_processus", label: "Type" },
      { key: "statut", label: "Statut" },
    ],
  },
};

// ── Statut labels ──
const STATUT_LABELS: Record<string, string> = {
  planifiee: "Planifiee", en_cours: "En cours", terminee: "Terminee", annulee: "Annulee",
  a_faire: "A faire", en_attente: "En attente", fait: "Fait",
  brouillon: "Brouillon", actif: "Actif", archive: "Archive",
  ouverte: "Ouverte", cloturee: "Cloturee",
};

function formatDate(val: string | null): string {
  if (!val) return "—";
  try {
    const d = new Date(val);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return val; }
}

function formatValue(key: string, val: unknown): string {
  if (val === null || val === undefined || val === "") return "—";
  const s = String(val);
  if (key === "echeance" || key === "deadline" || key === "date_revue" || key === "date_prevue") return formatDate(s);
  if (key === "statut") return STATUT_LABELS[s] || s.replace(/_/g, " ");
  if (key === "type_action" || key === "type_processus" || key === "type_moyen" || key === "source_type" || key === "type_flux")
    return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return s.length > 200 ? s.substring(0, 200) + "..." : s;
}

// ── Fetch entity details from DB ──
async function fetchEntityDetails(
  supabase: ReturnType<typeof createClient>,
  entityType: string,
  entityId: string
): Promise<{ label: string; rows: { label: string; value: string }[] } | null> {
  const meta = ENTITY_META[entityType];
  if (!meta || !entityId) return null;

  const columns = meta.fields.map(f => f.key).join(",");
  const { data, error } = await supabase.from(meta.table).select(columns).eq("id", entityId).maybeSingle();
  if (error || !data) {
    console.log(`Entity lookup failed for ${entityType}/${entityId}:`, error?.message);
    return null;
  }

  const rows = meta.fields
    .map(f => ({ label: f.label, value: formatValue(f.key, (data as Record<string, unknown>)[f.key]) }))
    .filter(r => r.value !== "—");

  return { label: meta.label, rows };
}

// ── Build entity detail HTML block ──
function buildDetailsHtml(details: { label: string; rows: { label: string; value: string }[] }, bannerColor: string): string {
  if (details.rows.length === 0) return "";
  const rowsHtml = details.rows.map(r =>
    `<tr>
      <td style="padding:8px 12px;font-weight:600;color:#52525b;font-size:13px;white-space:nowrap;border-bottom:1px solid #f4f4f5;">${r.label}</td>
      <td style="padding:8px 12px;color:#18181b;font-size:13px;border-bottom:1px solid #f4f4f5;">${r.value}</td>
    </tr>`
  ).join("");

  return `
    <div style="margin:20px 0;">
      <div style="font-size:13px;font-weight:700;color:${bannerColor};text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">
        ${details.label}
      </div>
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fafafa;border-radius:6px;border:1px solid #e4e4e7;">
        ${rowsHtml}
      </table>
    </div>`;
}

function buildDetailsText(details: { label: string; rows: { label: string; value: string }[] }): string {
  if (details.rows.length === 0) return "";
  return `\n--- ${details.label} ---\n` + details.rows.map(r => `${r.label}: ${r.value}`).join("\n");
}

// ── Build full HTML email ──
function buildHtml(
  payload: EmailPayload,
  appName: string,
  appUrl: string,
  details: { label: string; rows: { label: string; value: string }[] } | null
): string {
  const t = TEMPLATE_COLORS[payload.notif_type || ""] || TEMPLATE_COLORS.assignation;
  const linkHtml = payload.entity_url
    ? `<p style="margin-top:24px;text-align:center;">
        <a href="${appUrl}${payload.entity_url}" style="background-color:${t.banner};color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;font-size:14px;">Voir dans ${appName}</a>
      </p>`
    : "";
  const detailsHtml = details ? buildDetailsHtml(details, t.banner) : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f5;padding:0;margin:0;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background-color:${t.banner};border-radius:8px 8px 0 0;padding:20px 30px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="color:#ffffff;font-size:20px;font-weight:700;">${t.label}</td>
        <td style="text-align:right;color:#ffffff;font-size:12px;opacity:0.8;">${appName}</td>
      </tr></table>
    </div>
    <div style="background:#ffffff;padding:30px;border:1px solid #e4e4e7;border-top:none;">
      <h2 style="color:#18181b;margin-top:0;font-size:18px;">${payload.title}</h2>
      <div style="background-color:${t.accent};border-left:4px solid ${t.banner};padding:16px;border-radius:4px;margin:20px 0;">
        <p style="color:#18181b;margin:0;line-height:1.6;">${payload.message}</p>
      </div>
      ${detailsHtml}
      ${linkHtml}
    </div>
    <div style="background:#fafafa;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 8px 8px;padding:16px 30px;text-align:center;">
      <p style="color:#a1a1aa;font-size:12px;margin:0;">Ce message a ete envoye automatiquement par ${appName}.</p>
    </div>
  </div>
</body>
</html>`;
}

function buildText(
  payload: EmailPayload,
  appName: string,
  appUrl: string,
  details: { label: string; rows: { label: string; value: string }[] } | null
): string {
  let text = `${payload.title}\n\n${payload.message}`;
  if (details) text += buildDetailsText(details);
  if (payload.entity_url) text += `\n\nLien: ${appUrl}${payload.entity_url}`;
  text += `\n\n--\nEnvoye par ${appName}`;
  return text;
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();
    const { user_id, title } = payload;

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "user_id and title required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check global email toggle
    const { data: emailSetting } = await supabase
      .from("app_settings").select("value").eq("key", "notif_email_enabled").maybeSingle();
    if (emailSetting?.value === "false") {
      return new Response(JSON.stringify({ skipped: true, reason: "email_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user email
    const { data: profile } = await supabase
      .from("profiles").select("email, prenom, nom").eq("id", user_id).single();
    if (!profile?.email) {
      return new Response(JSON.stringify({ error: "No email found for user" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch entity details (parallel with SMTP config)
    const entityPromise = (payload.entity_type && payload.entity_id)
      ? fetchEntityDetails(supabase, payload.entity_type, payload.entity_id)
      : Promise.resolve(null);

    // Get SMTP settings
    const settingsPromise = supabase
      .from("app_settings").select("key, value")
      .in("key", ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "support_email", "app_name", "app_url"]);

    const [entityDetails, { data: settingsData }] = await Promise.all([entityPromise, settingsPromise]);

    const cfg: Record<string, string> = {};
    for (const row of settingsData ?? []) cfg[row.key] = row.value;

    const smtpHost = cfg.smtp_host;
    const smtpPort = parseInt(cfg.smtp_port || "587", 10);
    const smtpUser = cfg.smtp_user;
    const smtpPassword = cfg.smtp_password;
    const fromEmail = cfg.support_email || smtpUser;
    const appName = cfg.app_name || "Q-Process";
    const appUrl = cfg.app_url || "";

    const logEmail = async (status: "sent" | "failed" | "skipped", errorMessage?: string) => {
      try {
        await supabase.from("email_send_log").insert({
          recipient_email: profile.email,
          email_type: "notification",
          subject: title,
          status,
          error_message: errorMessage ?? null,
          entity_type: payload.entity_type ?? null,
          entity_id: payload.entity_id ?? null,
          entity_url: payload.entity_url ?? null,
          user_id,
          notif_type: payload.notif_type ?? null,
        });
      } catch (e) { console.error("log insert failed", e); }
    };

    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.error("SMTP config incomplete");
      await logEmail("failed", "SMTP not configured");
      return new Response(JSON.stringify({ error: "SMTP not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const domain = fromEmail.split("@")[1] || "localhost";
    console.log(`Sending notification email to ${profile.email} (type: ${payload.notif_type || "unknown"}, entity: ${payload.entity_type || "none"})`);

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpPort === 465,
        auth: { username: smtpUser, password: smtpPassword },
      },
    });

    await client.send({
      from: `${appName} <${fromEmail}>`,
      to: profile.email,
      subject: title,
      content: buildText(payload, appName, appUrl, entityDetails),
      html: buildHtml(payload, appName, appUrl, entityDetails),
      headers: {
        "Message-ID": `<notif-${Date.now()}-${Math.random().toString(36).slice(2)}@${domain}>`,
        "Reply-To": fromEmail,
        "X-Mailer": appName,
      },
    });

    await client.close();
    console.log("Notification email sent successfully to", profile.email);
    await logEmail("sent");

    // Best-effort mark email_sent
    if (payload.notif_type) {
      try {
        await supabase
          .from("notifications")
          .update({ email_sent: true } as any)
          .eq("user_id", user_id)
          .eq("type", payload.notif_type)
          .order("created_at", { ascending: false })
          .limit(1);
      } catch (_) { /* ignore */ }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-notification-email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
