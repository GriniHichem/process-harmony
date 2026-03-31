import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell, Save } from "lucide-react";

const ENTITY_TYPES = [
  { key: "actions", label: "Actions correctives", category: "Actions" },
  { key: "quality_objectives", label: "Objectifs qualité", category: "Stratégie" },
  { key: "review_decisions", label: "Décisions de revue", category: "Stratégie" },
  { key: "risk_actions", label: "Actions risques", category: "Risques" },
  { key: "risk_moyens", label: "Moyens risques", category: "Risques" },
  { key: "indicator_actions", label: "Actions indicateurs", category: "Indicateurs" },
  { key: "indicator_moyens", label: "Moyens indicateurs", category: "Indicateurs" },
  { key: "context_issue_actions", label: "Actions enjeux", category: "Contexte" },
  { key: "nc_actions", label: "Actions NC", category: "Non-conformités" },
  { key: "process_tasks", label: "Tâches processus", category: "Processus" },
  { key: "processes", label: "Processus", category: "Processus" },
] as const;

const NOTIF_TYPES = [
  { key: "assignation", label: "Assignation", color: "bg-blue-500" },
  { key: "echeance_proche", label: "Échéance", color: "bg-amber-500" },
  { key: "retard", label: "Retard", color: "bg-destructive" },
  { key: "statut_change", label: "Statut", color: "bg-emerald-500" },
] as const;

const CHANNEL_OPTIONS = [
  { value: "both", label: "Push + Email" },
  { value: "push", label: "Push" },
  { value: "email", label: "Email" },
  { value: "none", label: "Désactivé" },
];

interface Props {
  scope: string; // 'global' or user_id
  showDefaultOption?: boolean; // true for user prefs
  readOnly?: boolean;
}

type ConfigMap = Record<string, string>; // key = entity_type:notif_type, value = channel

function makeKey(entity: string, notif: string) {
  return `${entity}:${notif}`;
}

export function NotificationConfigMatrix({ scope, showDefaultOption = false, readOnly = false }: Props) {
  const [config, setConfig] = useState<ConfigMap>({});
  const [globalConfig, setGlobalConfig] = useState<ConfigMap>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchConfig = useCallback(async () => {
    const scopes = showDefaultOption ? [scope, "global"] : [scope];
    const { data } = await supabase
      .from("notification_config")
      .select("*")
      .in("scope", scopes);

    const cfg: ConfigMap = {};
    const gbl: ConfigMap = {};
    for (const row of data || []) {
      const k = makeKey(row.entity_type, row.notif_type);
      if (row.scope === "global") gbl[k] = row.channel;
      if (row.scope === scope) cfg[k] = row.channel;
    }
    setConfig(cfg);
    setGlobalConfig(gbl);
    setLoaded(true);
  }, [scope, showDefaultOption]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleChange = (entity: string, notif: string, channel: string) => {
    const k = makeKey(entity, notif);
    setConfig((prev) => {
      if (showDefaultOption && channel === "default") {
        const next = { ...prev };
        delete next[k];
        return next;
      }
      return { ...prev, [k]: channel };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build upsert rows for all set values
      const rows: { scope: string; entity_type: string; notif_type: string; channel: string; updated_at: string }[] = [];
      const toDelete: { entity_type: string; notif_type: string }[] = [];

      for (const entity of ENTITY_TYPES) {
        for (const notif of NOTIF_TYPES) {
          const k = makeKey(entity.key, notif.key);
          if (config[k]) {
            rows.push({
              scope,
              entity_type: entity.key,
              notif_type: notif.key,
              channel: config[k],
              updated_at: new Date().toISOString(),
            });
          } else if (showDefaultOption) {
            // User removed override → delete the row
            toDelete.push({ entity_type: entity.key, notif_type: notif.key });
          }
        }
      }

      if (rows.length > 0) {
        const { error } = await supabase
          .from("notification_config")
          .upsert(rows, { onConflict: "scope,entity_type,notif_type" });
        if (error) throw error;
      }

      // Delete overrides that were reset to default
      for (const d of toDelete) {
        await supabase
          .from("notification_config")
          .delete()
          .eq("scope", scope)
          .eq("entity_type", d.entity_type)
          .eq("notif_type", d.notif_type);
      }

      toast.success("Configuration enregistrée");
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  // Group entities by category
  const categories = [...new Set(ENTITY_TYPES.map((e) => e.category))];

  const channelOptions = showDefaultOption
    ? [{ value: "default", label: "Par défaut" }, ...CHANNEL_OPTIONS]
    : CHANNEL_OPTIONS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-4 w-4" />
          {showDefaultOption ? "Préférences par entité" : "Configuration par entité"}
        </CardTitle>
        <CardDescription>
          {showDefaultOption
            ? "Surchargez les défauts globaux ou laissez « Par défaut »"
            : "Définissez le canal de notification par défaut pour chaque entité"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Header row */}
        <div className="hidden sm:grid grid-cols-[1fr_repeat(4,100px)] gap-2 mb-3 px-1">
          <div />
          {NOTIF_TYPES.map((t) => (
            <div key={t.key} className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${t.color}`} />
                <span className="text-xs font-medium text-muted-foreground">{t.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          {categories.map((cat) => (
            <div key={cat}>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2 px-1 border-b">
                {cat}
              </div>
              {ENTITY_TYPES.filter((e) => e.category === cat).map((entity) => (
                <div
                  key={entity.key}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_repeat(4,100px)] gap-2 py-2 px-1 hover:bg-muted/50 rounded items-center"
                >
                  <span className="text-sm font-medium truncate">{entity.label}</span>
                  {NOTIF_TYPES.map((notif) => {
                    const k = makeKey(entity.key, notif.key);
                    const value = config[k] || (showDefaultOption ? "default" : "both");
                    const globalVal = globalConfig[k] || "both";
                    const globalLabel = CHANNEL_OPTIONS.find((o) => o.value === globalVal)?.label || "Both";

                    return (
                      <div key={notif.key} className="flex sm:block items-center gap-2">
                        <span className="sm:hidden text-xs text-muted-foreground w-20">{notif.label}</span>
                        <Select
                          value={value}
                          onValueChange={(v) => handleChange(entity.key, notif.key, v)}
                          disabled={readOnly}
                        >
                          <SelectTrigger className={`h-8 text-xs ${value === "default" ? "text-muted-foreground italic" : ""}`}>
                            <SelectValue placeholder={showDefaultOption ? `(${globalLabel})` : undefined} />
                          </SelectTrigger>
                          <SelectContent>
                            {channelOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                {opt.value === "default" ? `Par défaut (${globalLabel})` : opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>

        {!readOnly && (
          <div className="flex justify-end pt-4 border-t mt-4">
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="h-4 w-4 mr-1" />
              {saving ? "..." : "Enregistrer"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
