import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, AlertOctagon, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Incident {
  id: string;
  risk_id: string | null;
  process_id: string | null;
  description: string;
  date_incident: string;
  gravite: string;
  statut: string;
  responsable: string | null;
  actions_correctives: string | null;
}

const GRAVITE_LABELS: Record<string, string> = { mineure: "Mineure", majeure: "Majeure", critique: "Critique" };
const STATUT_LABELS: Record<string, string> = { ouvert: "Ouvert", en_traitement: "En traitement", cloture: "Clôturé" };

const GRAVITE_COLORS: Record<string, "outline" | "secondary" | "destructive"> = {
  mineure: "outline",
  majeure: "secondary",
  critique: "destructive",
};

const STATUT_COLORS: Record<string, string> = {
  ouvert: "border-orange-500/60 bg-orange-50 dark:bg-orange-950/20",
  en_traitement: "border-blue-500/60 bg-blue-50 dark:bg-blue-950/20",
  cloture: "border-green-500/60 bg-green-50 dark:bg-green-950/20",
};

interface RiskIncidentsProps {
  riskId: string;
  canEdit: boolean;
}

export function RiskIncidents({ riskId, canEdit }: RiskIncidentsProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Incident | null>(null);
  const emptyForm = { description: "", date_incident: new Date().toISOString().split("T")[0], gravite: "mineure", statut: "ouvert", responsable: "", actions_correctives: "" };
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    const { data } = await supabase.from("risk_incidents").select("*").eq("risk_id", riskId).order("date_incident", { ascending: false });
    setIncidents((data ?? []) as Incident[]);
  };

  useEffect(() => { fetchData(); }, [riskId]);

  const openEdit = (inc: Incident) => {
    setEditing(inc);
    setForm({ description: inc.description, date_incident: inc.date_incident, gravite: inc.gravite, statut: inc.statut, responsable: inc.responsable || "", actions_correctives: inc.actions_correctives || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.description) { toast.error("Description requise"); return; }
    const data: any = { description: form.description, date_incident: form.date_incident, gravite: form.gravite, statut: form.statut, responsable: form.responsable || null, actions_correctives: form.actions_correctives || null };
    if (editing) {
      const { error } = await supabase.from("risk_incidents").update(data).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Incident modifié");
    } else {
      const { error } = await supabase.from("risk_incidents").insert({ ...data, risk_id: riskId });
      if (error) { toast.error(error.message); return; }
      toast.success("Incident enregistré");
    }
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("risk_incidents").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Incident supprimé");
    fetchData();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">⚠️ Incidents ({incidents.length})</h4>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild><Button size="sm" variant="outline" className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" />Déclarer</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Modifier l'incident" : "Déclarer un incident"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Date de l'incident</Label><Input type="date" value={form.date_incident} onChange={(e) => setForm({ ...form, date_incident: e.target.value })} /></div>
                  <div className="space-y-1">
                    <Label>Gravité</Label>
                    <Select value={form.gravite} onValueChange={(v) => setForm({ ...form, gravite: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(GRAVITE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Statut</Label>
                    <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Responsable</Label><Input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} /></div>
                </div>
                <div className="space-y-1"><Label>Actions correctives</Label><Textarea value={form.actions_correctives} onChange={(e) => setForm({ ...form, actions_correctives: e.target.value })} placeholder="Mesures prises ou à prendre..." /></div>
                <Button onClick={handleSave} className="w-full">{editing ? "Enregistrer" : "Déclarer"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
      {incidents.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Aucun incident enregistré</p>
      ) : (
        <div className="space-y-2">
          {incidents.map((inc) => (
            <Card key={inc.id} className={`border-2 transition-colors ${STATUT_COLORS[inc.statut] || ""}`}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <AlertOctagon className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                    <p className="text-sm font-medium">{inc.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={GRAVITE_COLORS[inc.gravite] || "outline"} className="text-xs">{GRAVITE_LABELS[inc.gravite] || inc.gravite}</Badge>
                    <Badge variant="outline" className="text-xs">{STATUT_LABELS[inc.statut] || inc.statut}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(inc.date_incident), "dd MMM yyyy", { locale: fr })}</span>
                  {inc.responsable && <span className="flex items-center gap-1"><User className="h-3 w-3" />{inc.responsable}</span>}
                </div>
                {inc.actions_correctives && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">💊 {inc.actions_correctives}</p>
                )}
                {canEdit && (
                  <div className="flex gap-1 pt-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(inc)}><Pencil className="h-3 w-3 mr-1" />Modifier</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive"><Trash2 className="h-3 w-3 mr-1" />Supprimer</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cet incident ?</AlertDialogTitle>
                          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(inc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
