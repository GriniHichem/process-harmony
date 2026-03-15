import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, message, entity_url } = await req.json();

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

    // Get SMTP settings
    const { data: settings } = await supabase.from("app_settings").select("key, value");
    const cfg: Record<string, string> = {};
    for (const s of settings || []) cfg[s.key] = s.value;

    const smtpHost = cfg.smtp_host;
    const smtpPort = parseInt(cfg.smtp_port || "587");
    const smtpUser = cfg.smtp_user;
    const supportEmail = cfg.support_email || smtpUser;
    const appName = cfg.app_name || "Q-Process";

    if (!smtpHost || !smtpUser) {
      return new Response(JSON.stringify({ error: "SMTP not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get SMTP password from vault
    const { data: secretData } = await supabase.rpc("get_smtp_password");
    const smtpPassword = secretData || "";

    if (!smtpPassword) {
      return new Response(JSON.stringify({ error: "SMTP password not set" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const useSSL = smtpPort === 465;
    const baseUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") || "";
    const appUrl = cfg.app_url || `https://${baseUrl}`;

    const linkHtml = entity_url
      ? `<p style="margin-top:20px;"><a href="${appUrl}${entity_url}" style="background-color:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">Voir dans ${appName}</a></p>`
      : "";

    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background-color:#f4f4f5;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:30px;border:1px solid #e4e4e7;">
    <h2 style="color:#18181b;margin-top:0;">${title}</h2>
    <p style="color:#52525b;line-height:1.6;">${message}</p>
    ${linkHtml}
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0;">
    <p style="color:#a1a1aa;font-size:12px;">Ce message a ete envoye automatiquement par ${appName}.</p>
  </div>
</body>
</html>`;

    const textBody = `${title}\n\n${message}\n\n${entity_url ? `Lien: ${appUrl}${entity_url}` : ""}`;

    const boundary = "----=_Part_" + Date.now();
    const messageId = `<${crypto.randomUUID()}@${smtpHost}>`;

    const emailContent = [
      `From: ${appName} <${supportEmail}>`,
      `To: ${profile.email}`,
      `Subject: ${title}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      `X-Mailer: ${appName}`,
      "",
      `--${boundary}`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      textBody,
      "",
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      "",
      htmlBody,
      "",
      `--${boundary}--`,
    ].join("\r\n");

    // Connect and send via SMTP
    const conn = useSSL
      ? await Deno.connectTls({ hostname: smtpHost, port: smtpPort })
      : await Deno.connect({ hostname: smtpHost, port: smtpPort });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    async function readResponse(): Promise<string> {
      const buf = new Uint8Array(1024);
      const n = await conn.read(buf);
      return n ? decoder.decode(buf.subarray(0, n)) : "";
    }

    async function sendCommand(cmd: string): Promise<string> {
      await conn.write(encoder.encode(cmd + "\r\n"));
      return await readResponse();
    }

    await readResponse(); // greeting
    await sendCommand(`EHLO ${smtpHost}`);

    if (!useSSL) {
      const starttlsResp = await sendCommand("STARTTLS");
      if (starttlsResp.startsWith("220")) {
        const tlsConn = await Deno.startTls(conn as Deno.TcpConn, { hostname: smtpHost });
        Object.assign(conn, tlsConn);
        await sendCommand(`EHLO ${smtpHost}`);
      }
    }

    // Auth
    await sendCommand("AUTH LOGIN");
    await sendCommand(btoa(smtpUser));
    await sendCommand(btoa(smtpPassword));

    await sendCommand(`MAIL FROM:<${supportEmail}>`);
    await sendCommand(`RCPT TO:<${profile.email}>`);
    await sendCommand("DATA");
    await conn.write(encoder.encode(emailContent + "\r\n.\r\n"));
    await readResponse();
    await sendCommand("QUIT");

    try { conn.close(); } catch {}

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
