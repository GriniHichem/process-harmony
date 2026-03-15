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
}

const TEMPLATE_COLORS: Record<string, { banner: string; accent: string; icon: string; label: string }> = {
  assignation: {
    banner: "#2563eb",
    accent: "#dbeafe",
    icon: "👤",
    label: "Nouvelle assignation",
  },
  echeance_proche: {
    banner: "#f59e0b",
    accent: "#fef3c7",
    icon: "⏰",
    label: "Echeance proche",
  },
  retard: {
    banner: "#ef4444",
    accent: "#fee2e2",
    icon: "⚠",
    label: "Action en retard",
  },
  statut_change: {
    banner: "#10b981",
    accent: "#d1fae5",
    icon: "🔄",
    label: "Changement de statut",
  },
};

function buildHtml(payload: EmailPayload, appName: string, appUrl: string): string {
  const t = TEMPLATE_COLORS[payload.notif_type || ""] || TEMPLATE_COLORS.assignation;
  const linkHtml = payload.entity_url
    ? `<p style="margin-top:24px;text-align:center;">
        <a href="${appUrl}${payload.entity_url}" style="background-color:${t.banner};color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:6px;display:inline-block;font-weight:600;font-size:14px;">Voir dans ${appName}</a>
      </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:Arial,Helvetica,sans-serif;background-color:#f4f4f5;padding:0;margin:0;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <!-- Banner -->
    <div style="background-color:${t.banner};border-radius:8px 8px 0 0;padding:20px 30px;">
      <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
        <td style="color:#ffffff;font-size:20px;font-weight:700;">${t.label}</td>
        <td style="text-align:right;color:#ffffff;font-size:12px;opacity:0.8;">${appName}</td>
      </tr></table>
    </div>
    <!-- Body -->
    <div style="background:#ffffff;padding:30px;border:1px solid #e4e4e7;border-top:none;">
      <h2 style="color:#18181b;margin-top:0;font-size:18px;">${payload.title}</h2>
      <div style="background-color:${t.accent};border-left:4px solid ${t.banner};padding:16px;border-radius:4px;margin:20px 0;">
        <p style="color:#18181b;margin:0;line-height:1.6;">${payload.message}</p>
      </div>
      ${linkHtml}
    </div>
    <!-- Footer -->
    <div style="background:#fafafa;border:1px solid #e4e4e7;border-top:none;border-radius:0 0 8px 8px;padding:16px 30px;text-align:center;">
      <p style="color:#a1a1aa;font-size:12px;margin:0;">Ce message a ete envoye automatiquement par ${appName}.</p>
    </div>
  </div>
</body>
</html>`;
}

function buildText(payload: EmailPayload, appName: string, appUrl: string): string {
  let text = `${payload.title}\n\n${payload.message}`;
  if (payload.entity_url) text += `\n\nLien: ${appUrl}${payload.entity_url}`;
  text += `\n\n--\nEnvoye par ${appName}`;
  return text;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: EmailPayload = await req.json();
    const { user_id, title, message } = payload;

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "user_id and title required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check global email enabled
    const { data: emailSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "notif_email_enabled")
      .maybeSingle();

    if (emailSetting?.value === "false") {
      return new Response(JSON.stringify({ skipped: true, reason: "email_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, prenom, nom")
      .eq("id", user_id)
      .single();

    if (!profile?.email) {
      return new Response(JSON.stringify({ error: "No email found for user" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all SMTP settings from app_settings (portable, no vault)
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "support_email", "app_name", "app_url"]);

    const cfg: Record<string, string> = {};
    for (const row of settingsData ?? []) cfg[row.key] = row.value;

    const smtpHost = cfg.smtp_host;
    const smtpPort = parseInt(cfg.smtp_port || "587", 10);
    const smtpUser = cfg.smtp_user;
    const smtpPassword = cfg.smtp_password;
    const fromEmail = cfg.support_email || smtpUser;
    const appName = cfg.app_name || "Q-Process";
    const appUrl = cfg.app_url || "";

    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.error("SMTP config incomplete:", { hasHost: !!smtpHost, hasUser: !!smtpUser, hasPassword: !!smtpPassword });
      return new Response(JSON.stringify({ error: "SMTP not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const domain = fromEmail.split("@")[1] || "localhost";

    console.log(`Sending notification email to ${profile.email} (type: ${payload.notif_type || "unknown"})`);

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: smtpPort === 465,
        auth: {
          username: smtpUser,
          password: smtpPassword,
        },
      },
    });

    await client.send({
      from: `${appName} <${fromEmail}>`,
      to: profile.email,
      subject: title,
      content: buildText(payload, appName, appUrl),
      html: buildHtml(payload, appName, appUrl),
      headers: {
        "Message-ID": `<notif-${Date.now()}-${Math.random().toString(36).slice(2)}@${domain}>`,
        "Reply-To": fromEmail,
        "X-Mailer": appName,
      },
    });

    await client.close();
    console.log("Notification email sent successfully to", profile.email);

    // Mark email_sent if possible
    if (payload.notif_type) {
      // Best-effort update - don't fail if column doesn't exist yet
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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
