import { useState, useRef } from "react";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Settings, Upload, Eye, Save } from "lucide-react";
import logo from "@/assets/logo.jpg";

export default function SuperAdmin() {
  const { settings, updateSetting, refreshSettings } = useAppSettings();
  const { user } = useAuth();
  const [form, setForm] = useState({ ...settings });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const keys = Object.keys(form) as (keyof typeof form)[];
      for (const key of keys) {
        if (form[key] !== settings[key]) {
          await updateSetting(key, form[key]);
        }
      }
      toast.success("Paramètres enregistrés avec succès");
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `logo.${ext}`;
      // Remove old logo
      await supabase.storage.from("branding").remove([path]);
      const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
      const logoUrl = urlData.publicUrl + "?t=" + Date.now();
      await updateSetting("logo_url", logoUrl);
      setForm((prev) => ({ ...prev, logo_url: logoUrl }));
      toast.success("Logo téléchargé avec succès");
    } catch (err: any) {
      toast.error("Erreur upload : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const previewLogo = form.logo_url || logo;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Super Administration</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Identité de l'application</CardTitle>
            <CardDescription>Personnalisez le nom, la description et la version</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nom de l'application</Label>
              <Input value={form.app_name} onChange={(e) => handleChange("app_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Nom de l'entreprise</Label>
              <Input value={form.company_name} onChange={(e) => handleChange("company_name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Version</Label>
              <Input value={form.app_version} onChange={(e) => handleChange("app_version", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.app_description} onChange={(e) => handleChange("app_description", e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Copyright</Label>
              <Input value={form.info_copyright} onChange={(e) => handleChange("info_copyright", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Crédits</Label>
              <Input value={form.info_credits} onChange={(e) => handleChange("info_credits", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Logo */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Logo</CardTitle>
              <CardDescription>Téléchargez le logo de l'entreprise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                  <img src={previewLogo} alt="Logo" className="h-full w-full object-contain" />
                </div>
                <div className="flex-1 space-y-2">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Upload..." : "Changer le logo"}
                  </Button>
                  <p className="text-xs text-muted-foreground">PNG, JPG ou SVG recommandé</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Aperçu
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-card p-6 text-center space-y-3">
                <img src={previewLogo} alt="Logo" className="mx-auto h-12 object-contain" />
                <p className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {form.app_name}
                </p>
                <p className="text-sm font-medium text-foreground">{form.app_version}</p>
                <p className="text-xs text-muted-foreground italic">{form.app_description}</p>
                <div className="h-px bg-border" />
                <p className="text-xs text-muted-foreground">{form.info_copyright}</p>
                <p className="text-xs text-muted-foreground">
                  Développé par <span className="font-semibold text-foreground">{form.info_credits}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
        </Button>
      </div>
    </div>
  );
}
