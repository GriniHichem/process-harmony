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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorise" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Non autorise" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Acces refuse" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Keep local/self-host dispatch config in sync for notification trigger
    await adminClient.from("app_settings").upsert(
      {
        key: "supabase_url",
        value: supabaseUrl,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: "key" }
    );

    const { to } = await req.json();
    if (!to || typeof to !== "string") {
      return new Response(JSON.stringify({ error: "Adresse email destinataire requise" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch SMTP settings (including password stored in app_settings)
    const { data: settingsData } = await adminClient
      .from("app_settings")
      .select("key, value")
      .in("key", ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "support_email", "app_name"]);

    const cfg: Record<string, string> = {};
    for (const row of settingsData ?? []) {
      cfg[row.key] = row.value;
    }

    const smtpPassword = cfg.smtp_password;

    if (!cfg.smtp_host || !cfg.smtp_user || !smtpPassword) {
      console.error("SMTP config incomplete:", { hasHost: !!cfg.smtp_host, hasUser: !!cfg.smtp_user, hasPassword: !!smtpPassword });
      return new Response(
        JSON.stringify({ error: "Configuration SMTP incomplete. Veuillez remplir Hote, Utilisateur et Mot de passe SMTP." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appName = cfg.app_name || "Q-Process";
    const fromEmail = cfg.support_email || cfg.smtp_user;
    const port = parseInt(cfg.smtp_port || "587", 10);
    const domain = fromEmail.split("@")[1] || "localhost";

    console.log(`Connecting to SMTP: ${cfg.smtp_host}:${port} as ${cfg.smtp_user}`);

    const client = new SMTPClient({
      connection: {
        hostname: cfg.smtp_host,
        port,
        tls: port === 465,
        auth: {
          username: cfg.smtp_user,
          password: smtpPassword,
        },
      },
    });

    const now = new Date();

    const subject = `Test Email - ${appName}`;
    const logEmail = async (status: "sent" | "failed", errorMessage?: string) => {
      try {
        await adminClient.from("email_send_log").insert({
          recipient_email: to,
          email_type: "test",
          subject,
          status,
          error_message: errorMessage ?? null,
          user_id: user.id,
        });
      } catch (e) { console.error("log insert failed", e); }
    };

    try {
      await client.send({
        from: `${appName} <${fromEmail}>`,
        to,
        subject,
        content: `Ce message confirme que la configuration SMTP de ${appName} fonctionne correctement.\n\nServeur: ${cfg.smtp_host}:${port}\nExpediteur: ${fromEmail}\nDate: ${now.toISOString()}`,
        html: `
          <div style="font-family: Arial, Helvetica, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Test Email Reussi</h2>
            <p>Ce message confirme que la configuration SMTP de <strong>${appName}</strong> fonctionne correctement.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
            <p style="font-size: 12px; color: #6b7280;">
              Serveur: ${cfg.smtp_host}:${port}<br/>
              Expediteur: ${fromEmail}<br/>
              Date: ${now.toISOString()}
            </p>
          </div>
        `,
        headers: {
          "Message-ID": `<test-${Date.now()}-${Math.random().toString(36).slice(2)}@${domain}>`,
          "Reply-To": fromEmail,
          "X-Mailer": appName,
        },
      });
      await client.close();
    } catch (smtpErr: any) {
      try { await client.close(); } catch (_) {}
      await logEmail("failed", smtpErr?.message || String(smtpErr));
      throw smtpErr;
    }
    console.log("Test email sent successfully to", to);
    await logEmail("sent");

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error sending test email:", err);
    return new Response(JSON.stringify({ error: err.message || "Erreur inconnue lors de l'envoi" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
