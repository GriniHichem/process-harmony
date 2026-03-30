import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Settings } from "lucide-react";
import { NotificationConfigMatrix } from "@/components/NotificationConfigMatrix";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

export default function AdminNotificationsConfig() {
  const { hasPermission } = useAuth();
  const { settings, updateSetting } = useAppSettings();
  const canEdit = hasPermission("notifications", "can_edit");

  const [emailEnabled, setEmailEnabled] = useState(settings.notif_email_enabled !== "false");
  const [rappelJours, setRappelJours] = useState(settings.notif_rappel_jours_defaut || "3");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEmailEnabled(settings.notif_email_enabled !== "false");
    setRappelJours(settings.notif_rappel_jours_defaut || "3");
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSetting("notif_email_enabled", emailEnabled ? "true" : "false");
      await updateSetting("notif_rappel_jours_defaut", rappelJours);
      toast.success("Paramètres enregistrés");
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuration des notifications</h1>
            <p className="text-sm text-muted-foreground">
              Paramètres globaux et matrice de notification
              {!canEdit && <span className="ml-2 text-amber-500 font-medium">(lecture seule)</span>}
            </p>
          </div>
        </div>
        {canEdit && (
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Paramètres généraux
            </CardTitle>
            <CardDescription>Options globales des notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <Label className="text-sm font-medium">Notifications email</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Activer l'envoi d'emails de notification</p>
              </div>
              <Switch
                checked={emailEnabled}
                onCheckedChange={setEmailEnabled}
                disabled={!canEdit}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div>
                <Label className="text-sm font-medium">Délai de rappel (jours)</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Nombre de jours avant l'échéance pour un rappel automatique</p>
              </div>
              <Input
                type="number"
                min={1}
                max={30}
                className="w-20"
                value={rappelJours}
                onChange={(e) => setRappelJours(e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Types de notifications</CardTitle>
            <CardDescription>Les notifications sont générées automatiquement pour :</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { color: "bg-blue-500", label: "Assignation", desc: "Quand un responsable est assigné" },
                { color: "bg-amber-500", label: "Échéance proche", desc: "Rappel avant la date limite" },
                { color: "bg-destructive", label: "Retard", desc: "Quand une action dépasse son échéance" },
                { color: "bg-emerald-500", label: "Changement de statut", desc: "Quand le statut est modifié" },
              ].map((t) => (
                <div key={t.label} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${t.color}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <NotificationConfigMatrix scope="global" readOnly={!canEdit} />
    </div>
  );
}
