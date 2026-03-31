import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ProjectFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  editProject?: {
    id: string;
    title: string;
    slogan: string | null;
    description: string | null;
    resources: string | null;
    statut: string;
    date_debut: string | null;
    date_fin: string | null;
    image_url: string | null;
  } | null;
}

export function ProjectForm({ open, onOpenChange, onSaved, editProject }: ProjectFormProps) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    title: "", slogan: "", description: "", resources: "", statut: "en_cours",
    date_debut: "", date_fin: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editProject) {
      setForm({
        title: editProject.title,
        slogan: editProject.slogan ?? "",
        description: editProject.description ?? "",
        resources: editProject.resources ?? "",
        statut: editProject.statut,
        date_debut: editProject.date_debut ?? "",
        date_fin: editProject.date_fin ?? "",
      });
    } else {
      setForm({ title: "", slogan: "", description: "", resources: "", statut: "en_cours", date_debut: "", date_fin: "" });
    }
  }, [editProject, open]);

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Le titre est requis"); return; }
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      slogan: form.slogan || null,
      description: form.description || null,
      resources: form.resources || null,
      statut: form.statut,
      date_debut: form.date_debut || null,
      date_fin: form.date_fin || null,
    };

    let error;
    if (editProject) {
      ({ error } = await supabase.from("projects").update(payload).eq("id", editProject.id));
    } else {
      ({ error } = await supabase.from("projects").insert({ ...payload, created_by: user?.id ?? null }));
    }

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editProject ? "Projet modifié" : "Projet créé");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editProject ? "Modifier le projet" : "Nouveau projet"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Titre *</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Nom du projet" />
          </div>
          <div className="space-y-1.5">
            <Label>Slogan</Label>
            <Input value={form.slogan} onChange={(e) => setForm({ ...form, slogan: e.target.value })} placeholder="Phrase d'accroche" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Ressources</Label>
            <Textarea value={form.resources} onChange={(e) => setForm({ ...form, resources: e.target.value })} rows={2} placeholder="Ressources nécessaires" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brouillon">Brouillon</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="termine">Terminé</SelectItem>
                  <SelectItem value="archive">Archivé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Date début</Label>
              <Input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Date fin</Label>
              <Input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} />
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Enregistrement..." : editProject ? "Enregistrer" : "Créer le projet"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
