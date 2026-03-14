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
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
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
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
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
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to } = await req.json();
    if (!to || typeof to !== "string") {
      return new Response(JSON.stringify({ error: "Adresse email destinataire requise" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch SMTP settings
    const { data: settingsData } = await adminClient
      .from("app_settings")
      .select("key, value")
      .in("key", ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "support_email"]);

    const cfg: Record<string, string> = {};
    for (const row of settingsData ?? []) {
      cfg[row.key] = row.value;
    }

    if (!cfg.smtp_host || !cfg.smtp_user || !cfg.smtp_password) {
      return new Response(
        JSON.stringify({ error: "Configuration SMTP incomplète. Veuillez remplir Hôte, Utilisateur et Mot de passe SMTP." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fromEmail = cfg.support_email || cfg.smtp_user;
    const port = parseInt(cfg.smtp_port || "587", 10);

    console.log(`Connecting to SMTP: ${cfg.smtp_host}:${port} as ${cfg.smtp_user}`);

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
      from: fromEmail,
      to,
      subject: "✅ Test Email — Q-Process",
      content: "Ce message confirme que la configuration SMTP de Q-Process fonctionne correctement.",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">✅ Test Email Réussi</h2>
          <p>Ce message confirme que la configuration SMTP de <strong>Q-Process</strong> fonctionne correctement.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="font-size: 12px; color: #6b7280;">
            Serveur: ${cfg.smtp_host}:${port}<br/>
            Expéditeur: ${fromEmail}<br/>
            Date: ${new Date().toISOString()}
          </p>
        </div>
      `,
    });

    await client.close();
    console.log("Test email sent successfully to", to);

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
