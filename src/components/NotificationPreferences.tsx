import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell, Save } from "lucide-react";

const CHANNEL_OPTIONS = [
  { value: "both", label: "Push + Email" },
  { value: "push", label: "Push uniquement" },
  { value: "email", label: "Email uniquement" },
  { value: "none", label: "Désactivé" },
];

const NOTIF_TYPES = [
  { key: "assignation", label: "Nouvelle assignation", desc: "Quand vous êtes assigné comme responsable" },
  { key: "echeance_proche", label: "Échéance proche", desc: "Rappel avant la date d'échéance" },
  { key: "retard", label: "Retard", desc: "Quand une action dépasse son échéance" },
  { key: "statut_change", label: "Changement de statut", desc: "Quand le statut d'un élément change" },
];

interface Prefs {
  assignation: string;
  echeance_proche: string;
  retard: string;
  statut_change: string;
  rappel_jours: number;
}

const DEFAULT_PREFS: Prefs = {
  assignation: "both",
  echeance_proche: "push",
  retard: "both",
  statut_change: "push",
  rappel_jours: 3,
};

export function NotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setPrefs({
          assignation: data.assignation,
          echeance_proche: data.echeance_proche,
          retard: data.retard,
          statut_change: data.statut_change,
          rappel_jours: data.rappel_jours,
        });
      }
      setLoaded(true);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("notification_preferences").upsert(
        { user_id: user.id, ...prefs, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      if (error) throw error;
      toast.success("Préférences de notification enregistrées");
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Préférences de notification
        </CardTitle>
        <CardDescription>Choisissez comment recevoir vos notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {NOTIF_TYPES.map((type) => (
          <div key={type.key} className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Label className="text-sm font-medium">{type.label}</Label>
              <p className="text-xs text-muted-foreground">{type.desc}</p>
            </div>
            <Select
              value={(prefs as any)[type.key]}
              onValueChange={(v) => setPrefs((p) => ({ ...p, [type.key]: v }))}
            >
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}

        <div className="flex items-center justify-between gap-4 pt-2 border-t">
          <div>
            <Label className="text-sm font-medium">Rappel d'échéance</Label>
            <p className="text-xs text-muted-foreground">Nombre de jours avant l'échéance</p>
          </div>
          <Input
            type="number"
            min={1}
            max={30}
            className="w-20"
            value={prefs.rappel_jours}
            onChange={(e) => setPrefs((p) => ({ ...p, rappel_jours: parseInt(e.target.value) || 3 }))}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="h-4 w-4 mr-1" />
            {saving ? "..." : "Enregistrer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
