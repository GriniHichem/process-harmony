import { useState, useRef, useEffect } from "react";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Settings, Upload, Eye, Save, Mail, Server, EyeOff, SendHorizonal, Bell, Paintbrush, Image } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { NotificationConfigMatrix } from "@/components/NotificationConfigMatrix";
import logo from "@/assets/logo.jpg";

export default function SuperAdmin() {
  const { settings, loading, updateSetting, refreshSettings } = useAppSettings();
  const { user } = useAuth();
  const [form, setForm] = useState({ ...settings });
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState("");

  useEffect(() => {
    if (!loading) setForm({ ...settings });
  }, [loading, settings]);

  const [saving, setSaving] = useState(false);
  const [uploadingCompany, setUploadingCompany] = useState(false);
  const [uploadingBrand, setUploadingBrand] = useState(false);
  const [smtpPassword, setSmtpPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const companyFileRef = useRef<HTMLInputElement>(null);
  const brandFileRef = useRef<HTMLInputElement>(null);

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

  const handleLogoUpload = async (
    file: File,
    settingKey: "logo_url" | "brand_logo_url",
    filename: string,
    setUploading: (v: boolean) => void
  ) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${filename}.${ext}`;
      await supabase.storage.from("branding").remove([path]);
      const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
      const logoUrl = urlData.publicUrl + "?t=" + Date.now();
      await updateSetting(settingKey, logoUrl);
      setForm((prev) => ({ ...prev, [settingKey]: logoUrl }));
      toast.success("Logo téléchargé avec succès");
    } catch (err: any) {
      toast.error("Erreur upload : " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const companyLogo = form.logo_url || logo;
  const brandLogo = form.brand_logo_url || logo;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Super Administration</h1>
            <p className="text-sm text-muted-foreground">Configuration globale de l'application</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="branding" className="gap-2">
            <Paintbrush className="h-4 w-4" />
            <span className="hidden sm:inline">Identité</span>
          </TabsTrigger>
          <TabsTrigger value="logos" className="gap-2">
            <Image className="h-4 w-4" />
            <span className="hidden sm:inline">Logos</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Email / SMTP</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB: IDENTITÉ ─── */}
        <TabsContent value="branding" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informations générales</CardTitle>
                <CardDescription>Nom, version et description de l'application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom de l'application</Label>
                    <Input value={form.app_name} onChange={(e) => handleChange("app_name", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Version</Label>
                    <Input value={form.app_version} onChange={(e) => handleChange("app_version", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Nom de l'entreprise</Label>
                  <Input value={form.company_name} onChange={(e) => handleChange("company_name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={form.app_description} onChange={(e) => handleChange("app_description", e.target.value)} rows={2} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Crédits & Copyright</CardTitle>
                <CardDescription>Informations affichées dans le dialogue "À propos"</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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

            {/* Aperçu */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Aperçu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Barre haute</p>
                    <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
                      <img src={companyLogo} alt="Logo entreprise" className="h-7 object-contain" />
                      {form.brand_logo_url && (
                        <img src={brandLogo} alt="Logo marque" className="h-7 object-contain" />
                      )}
                      <span className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {form.app_name}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        SMQ
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Dialogue Info</p>
                    <div className="rounded-lg border bg-card p-4 text-center space-y-2">
                      <p className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {form.app_name}
                      </p>
                      <p className="text-sm text-muted-foreground">{form.company_name}</p>
                      <p className="text-xs font-medium text-foreground">{form.app_version}</p>
                      <p className="text-xs text-muted-foreground italic">{form.app_description}</p>
                      <div className="h-px bg-border" />
                      <p className="text-xs text-muted-foreground">{form.info_copyright}</p>
                      <p className="text-xs text-muted-foreground">
                        Développé par <span className="font-semibold text-foreground">{form.info_credits}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB: LOGOS ─── */}
        <TabsContent value="logos" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Logo Entreprise</CardTitle>
                <CardDescription>Logo principal affiché dans le header et la page de connexion</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="h-24 w-24 rounded-xl border-2 border-dashed bg-muted/50 flex items-center justify-center overflow-hidden">
                    <img src={companyLogo} alt="Logo entreprise" className="h-full w-full object-contain p-2" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <input ref={companyFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file, "logo_url", "company-logo", setUploadingCompany);
                    }} />
                    <Button variant="outline" onClick={() => companyFileRef.current?.click()} disabled={uploadingCompany}>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingCompany ? "Téléchargement..." : "Changer le logo"}
                    </Button>
                    <p className="text-xs text-muted-foreground">Format recommandé : PNG, JPG ou SVG. Taille max : 2 Mo.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Logo Marque</CardTitle>
                <CardDescription>Logo secondaire affiché dans le header et le dialogue info</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="h-24 w-24 rounded-xl border-2 border-dashed bg-muted/50 flex items-center justify-center overflow-hidden">
                    <img src={brandLogo} alt="Logo marque" className="h-full w-full object-contain p-2" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <input ref={brandFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file, "brand_logo_url", "brand-logo", setUploadingBrand);
                    }} />
                    <Button variant="outline" onClick={() => brandFileRef.current?.click()} disabled={uploadingBrand}>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingBrand ? "Téléchargement..." : "Changer le logo"}
                    </Button>
                    <p className="text-xs text-muted-foreground">Format recommandé : PNG, JPG ou SVG. Taille max : 2 Mo.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB: EMAIL / SMTP ─── */}
        <TabsContent value="email" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Expéditeur
                  </CardTitle>
                  <CardDescription>Adresse utilisée pour l'envoi des emails</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Email support / expéditeur</Label>
                    <Input
                      type="email"
                      placeholder="support.processus@groupeamour.com"
                      value={form.support_email}
                      onChange={(e) => handleChange("support_email", e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Utilisé comme adresse d'expédition pour les sondages et notifications.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <SendHorizonal className="h-4 w-4" />
                    Tester l'envoi
                  </CardTitle>
                  <CardDescription>Vérifiez que la configuration SMTP fonctionne</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="destinataire@exemple.com"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      disabled={!testEmail || sendingTest}
                      onClick={async () => {
                        setSendingTest(true);
                        try {
                          const response = await fetch(
                            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-test-email`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                                "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                              },
                              body: JSON.stringify({ to: testEmail }),
                            }
                          );
                          const result = await response.json();
                          if (!response.ok || result.error) {
                            throw new Error(result.error || `Erreur ${response.status}`);
                          }
                          toast.success("Email de test envoyé avec succès !");
                        } catch (err: any) {
                          toast.error("Échec : " + err.message);
                        } finally {
                          setSendingTest(false);
                        }
                      }}
                    >
                      <SendHorizonal className="h-4 w-4 mr-2" />
                      {sendingTest ? "Envoi..." : "Envoyer"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Serveur sortant (SMTP)
                </CardTitle>
                <CardDescription>Configuration du serveur webmail pour l'envoi des emails</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hôte SMTP</Label>
                    <Input
                      placeholder="mail.groupeamour.com"
                      value={form.smtp_host}
                      onChange={(e) => handleChange("smtp_host", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Port</Label>
                    <Input
                      placeholder="587"
                      value={form.smtp_port}
                      onChange={(e) => handleChange("smtp_port", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Utilisateur SMTP</Label>
                  <Input
                    placeholder="support.processus@groupeamour.com"
                    value={form.smtp_user}
                    onChange={(e) => handleChange("smtp_user", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mot de passe SMTP</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={smtpPassword}
                        onChange={(e) => setSmtpPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!smtpPassword || savingPassword}
                      onClick={async () => {
                        setSavingPassword(true);
                        try {
                          const { error } = await supabase.functions.invoke("admin-save-smtp-password", {
                            body: { password: smtpPassword },
                          });
                          if (error) throw error;
                          toast.success("Mot de passe SMTP enregistré");
                          setSmtpPassword("");
                        } catch (err: any) {
                          toast.error("Erreur : " + err.message);
                        } finally {
                          setSavingPassword(false);
                        }
                      }}
                    >
                      {savingPassword ? "..." : "Enregistrer"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Le mot de passe est stocké de manière sécurisée et n'est jamais affiché.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB: NOTIFICATIONS ─── */}
        <TabsContent value="notifications" className="space-y-6">
          <div className="grid gap-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-4 w-4" />
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
                      checked={form.notif_email_enabled !== "false"}
                      onCheckedChange={(checked) => handleChange("notif_email_enabled", checked ? "true" : "false")}
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
                      value={form.notif_rappel_jours_defaut || "3"}
                      onChange={(e) => handleChange("notif_rappel_jours_defaut", e.target.value)}
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

            <NotificationConfigMatrix scope="global" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
