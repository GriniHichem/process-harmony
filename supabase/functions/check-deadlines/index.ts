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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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
    let emailsSent = 0;

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

        // Resolve user_id
        let userId: string | null = null;
        if (source.responsible_type === "uuid") {
          const acteurId = row[source.responsible_col];
          if (acteurId) userId = acteurToUser[acteurId] || null;
        } else {
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

        // Get pref channel for this type
        let prefChannel = "both";
        if (userPrefs) {
          prefChannel = userPrefs[notifType] || "both";
        }
        if (prefChannel === "none") continue;

        const desc = (row[source.description_col] || "").substring(0, 100);
        const title = notifType === "retard"
          ? "Action en retard"
          : "Echeance proche";
        const message = notifType === "retard"
          ? `En retard de ${Math.abs(daysUntil)} jour${Math.abs(daysUntil) > 1 ? "s" : ""} : ${desc}`
          : `Echeance dans ${daysUntil} jour${daysUntil > 1 ? "s" : ""} : ${desc}`;

        const entityUrl = source.entity_url_fn(row);

        // Insert notification
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

        // Send email if needed
        if (prefChannel === "email" || prefChannel === "both") {
          try {
            const funcUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-email`;
            await fetch(funcUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({ user_id: userId, title, message, entity_url: entityUrl }),
            });
            emailsSent++;
          } catch (e) {
            console.error("Email send failed:", e);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifications_created: totalCreated, emails_sent: emailsSent }),
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
