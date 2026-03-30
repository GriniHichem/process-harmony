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
import { Settings, Upload, Eye, Save, Mail, Server, EyeOff, SendHorizonal, Paintbrush, Image } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotificationConfigMatrix } from "@/components/NotificationConfigMatrix";
import { useActeurs } from "@/hooks/useActeurs";
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
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
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
                  <Label>Crédits développement</Label>
                  <Input value={form.info_credits} onChange={(e) => handleChange("info_credits", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Crédits aide contextuelle</Label>
                  <Input value={form.info_credits_help} onChange={(e) => handleChange("info_credits_help", e.target.value)} placeholder="Ex: Radja BENHAMIDA" />
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
                      {form.info_credits_help && (
                        <p className="text-xs text-muted-foreground">
                          Aide contextuelle par <span className="font-semibold text-foreground">{form.info_credits_help}</span>
                        </p>
                      )}
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
                          const { data: sessionData } = await supabase.auth.getSession();
                          const accessToken = sessionData.session?.access_token;

                          if (!accessToken) {
                            throw new Error("Session expirée. Reconnectez-vous puis réessayez.");
                          }

                          const { data, error } = await supabase.functions.invoke("send-test-email", {
                            body: { to: testEmail },
                            headers: { Authorization: `Bearer ${accessToken}` },
                          });

                          if (error) {
                            let message = error.message || "Erreur lors de l'envoi";
                            try {
                              const parsed = JSON.parse((error as any).context?.body || "{}");
                              if (parsed.error) message = parsed.error;
                            } catch {
                              // ignore parsing fallback
                            }
                            throw new Error(message);
                          }

                          if ((data as any)?.error) {
                            throw new Error((data as any).error);
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
      </Tabs>
    </div>
  );
}

interface DocTag { id: string; label: string; color: string; }
interface DocActeurPerm {
  id: string; acteur_id: string;
  can_read: boolean; can_download: boolean; can_delete: boolean;
  allowed_type_ids: string[]; allowed_tag_ids: string[];
}

function DocumentConfigTab() {
  const { acteurs, getActeurLabel } = useActeurs();
  const [types, setTypes] = useState<DocType[]>([]);
  const [tags, setTags] = useState<DocTag[]>([]);
  const [perms, setPerms] = useState<DocActeurPerm[]>([]);
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [newTypeCode, setNewTypeCode] = useState("");
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    const [tRes, tagRes, pRes] = await Promise.all([
      supabase.from("document_types").select("*").order("label"),
      supabase.from("document_tags").select("*").order("label"),
      supabase.from("document_actor_permissions").select("*"),
    ]);
    setTypes((tRes.data ?? []) as DocType[]);
    setTags((tagRes.data ?? []) as DocTag[]);
    setPerms((pRes.data ?? []) as DocActeurPerm[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  // Types CRUD
  const addType = async () => {
    if (!newTypeLabel.trim() || !newTypeCode.trim()) { toast.error("Label et code requis"); return; }
    const { error } = await supabase.from("document_types").insert({ label: newTypeLabel.trim(), code: newTypeCode.trim().toLowerCase().replace(/\s+/g, "_") });
    if (error) { toast.error(error.message); return; }
    toast.success("Type ajouté");
    setNewTypeLabel(""); setNewTypeCode("");
    fetchAll();
  };

  const toggleTypeActif = async (t: DocType) => {
    await supabase.from("document_types").update({ actif: !t.actif } as any).eq("id", t.id);
    fetchAll();
  };

  const deleteType = async (id: string) => {
    if (!confirm("Supprimer ce type ?")) return;
    const { error } = await supabase.from("document_types").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Type supprimé");
    fetchAll();
  };

  // Tags CRUD
  const addTag = async () => {
    if (!newTagLabel.trim()) { toast.error("Label requis"); return; }
    const { error } = await supabase.from("document_tags").insert({ label: newTagLabel.trim(), color: newTagColor });
    if (error) { toast.error(error.message); return; }
    toast.success("Tag ajouté");
    setNewTagLabel(""); setNewTagColor("#6366f1");
    fetchAll();
  };

  const deleteTag = async (id: string) => {
    if (!confirm("Supprimer ce tag ?")) return;
    const { error } = await supabase.from("document_tags").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Tag supprimé");
    fetchAll();
  };

  // Permissions
  const getPermForActeur = (acteurId: string): DocActeurPerm | undefined =>
    perms.find(p => p.acteur_id === acteurId);

  const upsertPerm = async (acteurId: string, field: string, value: any) => {
    const existing = getPermForActeur(acteurId);
    if (existing) {
      await supabase.from("document_actor_permissions").update({ [field]: value } as any).eq("id", existing.id);
    } else {
      await supabase.from("document_actor_permissions").insert({ acteur_id: acteurId, [field]: value } as any);
    }
    fetchAll();
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground">Chargement...</div>;

  return (
    <div className="space-y-8">
      {/* Types de documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><FolderOpen className="h-4 w-4" /> Types de documents</CardTitle>
          <CardDescription>Gérez les types de documents disponibles pour le classement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Label (ex: Manuel qualité)" value={newTypeLabel} onChange={e => setNewTypeLabel(e.target.value)} className="flex-1" />
            <Input placeholder="Code (ex: manuel_qualite)" value={newTypeCode} onChange={e => setNewTypeCode(e.target.value)} className="w-[200px]" />
            <Button onClick={addType} size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="w-[80px]">Actif</TableHead>
                <TableHead className="w-[60px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.label}</TableCell>
                  <TableCell className="text-muted-foreground text-xs font-mono">{t.code}</TableCell>
                  <TableCell>
                    <Switch checked={t.actif} onCheckedChange={() => toggleTypeActif(t)} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteType(t.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Tag className="h-4 w-4" /> Tags</CardTitle>
          <CardDescription>Étiquettes pour catégoriser les documents</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-center">
            <Input placeholder="Label (ex: Technique)" value={newTagLabel} onChange={e => setNewTagLabel(e.target.value)} className="flex-1" />
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">Couleur</Label>
              <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)} className="h-8 w-8 rounded border cursor-pointer" />
            </div>
            <Button onClick={addTag} size="sm"><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <Badge key={tag.id} style={{ backgroundColor: tag.color, color: "#fff" }} className="gap-1 text-sm px-3 py-1.5">
                {tag.label}
                <button onClick={() => deleteTag(tag.id)} className="ml-1 hover:opacity-70"><Trash2 className="h-3 w-3" /></button>
              </Badge>
            ))}
            {tags.length === 0 && <p className="text-sm text-muted-foreground">Aucun tag configuré</p>}
          </div>
        </CardContent>
      </Card>

      {/* Permissions documentaires par acteur */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Settings className="h-4 w-4" /> Permissions documentaires par acteur</CardTitle>
          <CardDescription>Définissez les droits de lecture, téléchargement et suppression pour chaque acteur. Types/tags vides = accès à tous.</CardDescription>
        </CardHeader>
        <CardContent>
          {acteurs.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">Aucun acteur configuré</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acteur</TableHead>
                  <TableHead className="text-center w-[80px]">Lire</TableHead>
                  <TableHead className="text-center w-[100px]">Télécharger</TableHead>
                  <TableHead className="text-center w-[90px]">Supprimer</TableHead>
                  <TableHead>Types autorisés</TableHead>
                  <TableHead>Tags autorisés</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acteurs.map(act => {
                  const perm = getPermForActeur(act.id);
                  return (
                    <TableRow key={act.id}>
                      <TableCell className="font-medium text-sm">{act.fonction || act.organisation || "Acteur"}</TableCell>
                      <TableCell className="text-center">
                        <Checkbox checked={perm?.can_read ?? true} onCheckedChange={v => upsertPerm(act.id, "can_read", !!v)} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox checked={perm?.can_download ?? false} onCheckedChange={v => upsertPerm(act.id, "can_download", !!v)} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox checked={perm?.can_delete ?? false} onCheckedChange={v => upsertPerm(act.id, "can_delete", !!v)} />
                      </TableCell>
                      <TableCell>
                        <Select
                          value="__show__"
                          onValueChange={v => {
                            if (v === "__show__") return;
                            const current = perm?.allowed_type_ids ?? [];
                            const updated = current.includes(v) ? current.filter(x => x !== v) : [...current, v];
                            upsertPerm(act.id, "allowed_type_ids", updated);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs w-[140px]">
                            <SelectValue>
                              {(perm?.allowed_type_ids?.length ?? 0) === 0 ? "Tous" : `${perm!.allowed_type_ids.length} type(s)`}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__show__" disabled>Sélectionner...</SelectItem>
                            {types.filter(t => t.actif).map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                {(perm?.allowed_type_ids ?? []).includes(t.id) ? "✓ " : ""}{t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value="__show__"
                          onValueChange={v => {
                            if (v === "__show__") return;
                            const current = perm?.allowed_tag_ids ?? [];
                            const updated = current.includes(v) ? current.filter(x => x !== v) : [...current, v];
                            upsertPerm(act.id, "allowed_tag_ids", updated);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs w-[140px]">
                            <SelectValue>
                              {(perm?.allowed_tag_ids?.length ?? 0) === 0 ? "Tous" : `${perm!.allowed_tag_ids.length} tag(s)`}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__show__" disabled>Sélectionner...</SelectItem>
                            {tags.map(t => (
                              <SelectItem key={t.id} value={t.id}>
                                {(perm?.allowed_tag_ids ?? []).includes(t.id) ? "✓ " : ""}{t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
