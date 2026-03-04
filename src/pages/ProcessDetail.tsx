import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function ProcessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [process, setProcess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("processes").select("*").eq("id", id).single();
      setProcess(data);
      setLoading(false);
    };
    if (id) fetch();
  }, [id]);

  const canEdit = role === "rmq" || role === "consultant" || (role === "responsable_processus" && process?.responsable_id === user?.id);

  const handleSave = async () => {
    if (!process) return;
    setSaving(true);
    const { error } = await supabase.from("processes").update({
      nom: process.nom,
      finalite: process.finalite,
      description: process.description,
      type_processus: process.type_processus,
      parties_prenantes: process.parties_prenantes,
      donnees_entree: process.donnees_entree,
      donnees_sortie: process.donnees_sortie,
      activites: process.activites,
      interactions: process.interactions,
      ressources: process.ressources,
      statut: process.statut,
    }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Processus mis à jour");
    setSaving(false);
  };

  const updateField = (field: string, value: string) => setProcess({ ...process, [field]: value });

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!process) return <div className="text-center py-12 text-muted-foreground">Processus non trouvé</div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/processus")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-primary font-medium">{process.code}</span>
            <Badge>{process.statut.replace("_", " ")}</Badge>
            <span className="text-xs text-muted-foreground">v{process.version_courante}</span>
          </div>
          <h1 className="text-2xl font-bold mt-1">{process.nom}</h1>
        </div>
        {canEdit && (
          <Button onClick={handleSave} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "..." : "Enregistrer"}</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Intitulé</Label><Input value={process.nom} onChange={(e) => updateField("nom", e.target.value)} disabled={!canEdit} /></div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={process.type_processus} onValueChange={(v) => updateField("type_processus", v)} disabled={!canEdit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pilotage">Pilotage</SelectItem>
                  <SelectItem value="realisation">Réalisation</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={process.statut} onValueChange={(v) => updateField("statut", v)} disabled={role !== "rmq"}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brouillon">Brouillon</SelectItem>
                  <SelectItem value="en_validation">En validation</SelectItem>
                  <SelectItem value="valide">Validé</SelectItem>
                  <SelectItem value="archive">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Finalité</Label><Textarea value={process.finalite ?? ""} onChange={(e) => updateField("finalite", e.target.value)} disabled={!canEdit} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Description détaillée</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Description</Label><Textarea value={process.description ?? ""} onChange={(e) => updateField("description", e.target.value)} disabled={!canEdit} rows={3} /></div>
            <div className="space-y-2"><Label>Parties prenantes</Label><Textarea value={process.parties_prenantes ?? ""} onChange={(e) => updateField("parties_prenantes", e.target.value)} disabled={!canEdit} rows={2} /></div>
            <div className="space-y-2"><Label>Ressources</Label><Textarea value={process.ressources ?? ""} onChange={(e) => updateField("ressources", e.target.value)} disabled={!canEdit} rows={2} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Entrées / Sorties</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Données d'entrée</Label><Textarea value={process.donnees_entree ?? ""} onChange={(e) => updateField("donnees_entree", e.target.value)} disabled={!canEdit} /></div>
            <div className="space-y-2"><Label>Données de sortie</Label><Textarea value={process.donnees_sortie ?? ""} onChange={(e) => updateField("donnees_sortie", e.target.value)} disabled={!canEdit} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Activités & Interactions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Activités principales</Label><Textarea value={process.activites ?? ""} onChange={(e) => updateField("activites", e.target.value)} disabled={!canEdit} /></div>
            <div className="space-y-2"><Label>Interactions</Label><Textarea value={process.interactions ?? ""} onChange={(e) => updateField("interactions", e.target.value)} disabled={!canEdit} /></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
