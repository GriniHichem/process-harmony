import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Bell, Save } from "lucide-react";
import { NotificationConfigMatrix } from "@/components/NotificationConfigMatrix";

export function NotificationPreferences() {
  const { user } = useAuth();
  const [rappelJours, setRappelJours] = useState(3);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("rappel_jours")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setRappelJours(data.rappel_jours);
      setLoaded(true);
    })();
  }, [user]);

  const handleSaveRappel = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("notification_preferences").upsert(
        { user_id: user.id, rappel_jours: rappelJours, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
      if (error) throw error;
      toast.success("Délai de rappel enregistré");
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded || !user) return null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Rappel d'échéance
          </CardTitle>
          <CardDescription>Nombre de jours avant l'échéance pour recevoir un rappel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="number"
              min={1}
              max={30}
              className="w-20"
              value={rappelJours}
              onChange={(e) => setRappelJours(parseInt(e.target.value) || 3)}
            />
            <span className="text-sm text-muted-foreground">jours</span>
            <Button onClick={handleSaveRappel} disabled={saving} size="sm" variant="outline">
              <Save className="h-4 w-4 mr-1" />
              {saving ? "..." : "Enregistrer"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <NotificationConfigMatrix scope={user.id} showDefaultOption />
    </div>
  );
}
