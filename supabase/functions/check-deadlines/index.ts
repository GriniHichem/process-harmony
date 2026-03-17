import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DeadlineSource {
  table: string;
  deadline_col: string;
  responsible_col: string;
  responsible_type: "uuid" | "text";
  statut_col: string;
  entity_url_fn: (row: any) => string;
  description_col: string;
}

const SOURCES: DeadlineSource[] = [
  { table: "actions", deadline_col: "echeance", responsible_col: "responsable_id", responsible_type: "uuid", statut_col: "statut", entity_url_fn: () => "/actions", description_col: "description" },
  { table: "quality_objectives", deadline_col: "echeance", responsible_col: "responsable_id", responsible_type: "uuid", statut_col: "statut", entity_url_fn: () => "/politique-qualite", description_col: "description" },
  { table: "review_decisions", deadline_col: "echeance", responsible_col: "responsable_id", responsible_type: "uuid", statut_col: "statut", entity_url_fn: () => "/revue-direction", description_col: "description" },
  { table: "risk_actions", deadline_col: "deadline", responsible_col: "responsable", responsible_type: "text", statut_col: "statut", entity_url_fn: () => "/risques", description_col: "description" },
  { table: "risk_moyens", deadline_col: "deadline", responsible_col: "responsable", responsible_type: "text", statut_col: "statut", entity_url_fn: () => "/risques", description_col: "description" },
  { table: "indicator_actions", deadline_col: "deadline", responsible_col: "responsable", responsible_type: "text", statut_col: "statut", entity_url_fn: () => "/indicateurs", description_col: "description" },
  { table: "indicator_moyens", deadline_col: "deadline", responsible_col: "responsable", responsible_type: "text", statut_col: "statut", entity_url_fn: () => "/indicateurs", description_col: "description" },
  { table: "context_issue_actions", deadline_col: "date_revue", responsible_col: "responsable", responsible_type: "text", statut_col: "statut", entity_url_fn: () => "/enjeux-contexte", description_col: "description" },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Ensure dispatch trigger base URL is populated (portable: self-configures on first run)
    await supabase.from("app_settings").upsert(
      { key: "supabase_url", value: supabaseUrl, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

    // Get global rappel_jours setting
    const { data: rappelSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "notif_rappel_jours_defaut")
      .maybeSingle();
    const globalRappelJours = parseInt(rappelSetting?.value || "3");

    // Get all user preferences (for per-user rappel_jours)
    const { data: allPrefs } = await supabase.from("notification_preferences").select("*");
    const prefsMap: Record<string, any> = {};
    for (const p of allPrefs || []) prefsMap[p.user_id] = p;

    // Load notification_config for channel resolution
    const { data: allConfig } = await supabase.from("notification_config").select("*");
    const configMap: Record<string, string> = {};
    for (const c of allConfig || []) {
      configMap[`${c.scope}:${c.entity_type}:${c.notif_type}`] = c.channel;
    }

    function resolveChannel(userId: string, entityType: string, notifType: string): string {
      return configMap[`${userId}:${entityType}:${notifType}`]
        ?? configMap[`global:${entityType}:${notifType}`]
        ?? "both";
    }

    // Build profiles lookup: acteur_id -> user_id
    const { data: profiles } = await supabase.from("profiles").select("id, acteur_id");
    const acteurToUser: Record<string, string> = {};
    for (const p of profiles || []) {
      if (p.acteur_id) acteurToUser[p.acteur_id] = p.id;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    let totalCreated = 0;

    for (const source of SOURCES) {
      const { data: rows } = await supabase
        .from(source.table)
        .select("*")
        .not(source.deadline_col, "is", null)
        .neq(source.statut_col, "terminee")
        .neq(source.statut_col, "cloturee")
        .neq(source.statut_col, "annulee");

      if (!rows) continue;

      for (const row of rows) {
        const deadlineStr = row[source.deadline_col];
        if (!deadlineStr) continue;

        const deadline = new Date(deadlineStr);
        deadline.setHours(0, 0, 0, 0);

        // Prefer responsable_user_id (direct user reference) over acteur_id lookup
        let userId: string | null = row.responsable_user_id || null;

        if (!userId) {
          // Fallback: resolve user_id from acteur_id via profiles
          const acteurId = row[source.responsible_col];
          if (acteurId) userId = acteurToUser[acteurId] || null;
        }
        if (!userId) continue;

        // Get user rappel_jours
        const userPrefs = prefsMap[userId];
        const rappelJours = userPrefs?.rappel_jours || globalRappelJours;

        const daysUntil = Math.floor((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        let notifType: string | null = null;

        if (daysUntil < 0) {
          notifType = "retard";
        } else if (daysUntil <= rappelJours) {
          notifType = "echeance_proche";
        }

        if (!notifType) continue;

        // Check for duplicate (same entity + type today)
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("entity_type", source.table)
          .eq("entity_id", row.id)
          .eq("type", notifType)
          .gte("created_at", todayStr)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Resolve channel from notification_config
        const prefChannel = resolveChannel(userId, source.table, notifType);
        if (prefChannel === "none") continue;

        const desc = (row[source.description_col] || "").substring(0, 100);
        const title = notifType === "retard"
          ? "Action en retard"
          : "Echeance proche";
        const message = notifType === "retard"
          ? `En retard de ${Math.abs(daysUntil)} jour${Math.abs(daysUntil) > 1 ? "s" : ""} : ${desc}`
          : `Echeance dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""} : ${desc}`;

        const entityUrl = source.entity_url_fn(row);

        // Insert notification — the DB trigger dispatch_email_on_notification
        // will automatically call send-notification-email if channel is email/both
        await supabase.from("notifications").insert({
          user_id: userId,
          type: notifType,
          title,
          message,
          entity_type: source.table,
          entity_id: row.id,
          entity_url: entityUrl,
          channel: prefChannel,
        });
        totalCreated++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifications_created: totalCreated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("check-deadlines error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
