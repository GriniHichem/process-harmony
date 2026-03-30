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
import { Plus, Pencil, Trash2, Calendar, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useActeurs } from "@/hooks/useActeurs";
import { ActeurUserSelect } from "@/components/ActeurUserSelect";
import { ElementNotes } from "@/components/ElementNotes";

interface NcAction {
  id: string;
  nc_id: string;
  description: string;
  type_action: string;
  statut: string;
  date_prevue: string | null;
  deadline: string | null;
  responsable: string | null;
  responsable_user_id: string | null;
}

const STATUT_LABELS: Record<string, string> = { a_faire: "À faire", en_cours: "En cours", realisee: "Réalisée" };
const TYPE_ACTION_LABELS: Record<string, string> = { corrective: "Corrective", preventive: "Préventive", amelioration: "Amélioration" };

function formatDate(d: string | null) {
  if (!d) return null;
  return format(new Date(d), "dd MMM yyyy", { locale: fr });
}

function getCardStyle(statut: string, deadline: string | null) {
  const isOverdue = deadline && new Date(deadline) < new Date() && statut !== "realisee";
  if (isOverdue) return "border-destructive/60 bg-destructive/5";
  if (statut === "realisee") return "border-green-500/60 bg-green-50 dark:bg-green-950/20";
  if (statut === "en_cours") return "border-blue-500/60 bg-blue-50 dark:bg-blue-950/20";
  return "border-muted-foreground/20 bg-muted/30";
}

function getStatusBadgeVariant(statut: string, deadline: string | null): "destructive" | "secondary" | "default" | "outline" {
  const isOverdue = deadline && new Date(deadline) < new Date() && statut !== "realisee";
  if (isOverdue) return "destructive";
  if (statut === "realisee") return "default";
  if (statut === "en_cours") return "secondary";
  return "outline";
}

interface NcMoyensActionsProps {
  ncId: string;
  canEdit: boolean;
}

export function NcMoyensActions({ ncId, canEdit }: NcMoyensActionsProps) {
  const { acteurs, getActeurLabel } = useActeurs();
  const [actions, setActions] = useState<NcAction[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<NcAction | null>(null);

  const emptyForm = { description: "", type_action: "corrective", statut: "a_faire", date_prevue: "", deadline: "", responsable: "", responsable_user_id: "" };
  const [form, setForm] = useState(emptyForm);

  const fetchActions = async () => {
    const { data } = await supabase.from("nc_actions").select("*").eq("nc_id", ncId).order("created_at");
    setActions((data ?? []) as NcAction[]);
  };

  useEffect(() => { fetchActions(); }, [ncId]);

  const openEdit = (a: NcAction) => {
    setEditing(a);
    setForm({
      description: a.description,
      type_action: a.type_action,
      statut: a.statut,
      date_prevue: a.date_prevue || "",
      deadline: a.deadline || "",
      responsable: a.responsable || "",
      responsable_user_id: a.responsable_user_id || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.description) { toast.error("Description requise"); return; }
    const data: any = {
      description: form.description,
      type_action: form.type_action,
      statut: form.statut,
      date_prevue: form.date_prevue || null,
      deadline: form.deadline || null,
      responsable: form.responsable || null,
      responsable_user_id: form.responsable_user_id || null,
    };
    if (editing) {
      const { error } = await supabase.from("nc_actions").update(data).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Action modifiée");
    } else {
      const { error } = await supabase.from("nc_actions").insert({ ...data, nc_id: ncId });
      if (error) { toast.error(error.message); return; }
      toast.success("Action ajoutée");
    }
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
    fetchActions();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("nc_actions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Action supprimée");
    fetchActions();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm">📋 Actions correctives / préventives</h4>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" />Ajouter</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? "Modifier l'action" : "Ajouter une action"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select value={form.type_action} onValueChange={(v) => setForm({ ...form, type_action: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_ACTION_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Statut</Label>
                    <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Responsable</Label>
                  <ActeurUserSelect
                    acteurValue={form.responsable}
                    userValue={form.responsable_user_id}
                    onActeurChange={(v) => setForm({ ...form, responsable: v, responsable_user_id: "" })}
                    onUserChange={(v) => setForm({ ...form, responsable_user_id: v })}
                    acteurs={acteurs}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Date prévue</Label><Input type="date" value={form.date_prevue} onChange={(e) => setForm({ ...form, date_prevue: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Deadline</Label><Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></div>
                </div>
                <Button onClick={handleSave} className="w-full">{editing ? "Enregistrer" : "Ajouter"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {actions.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Aucune action définie</p>
      ) : (
        <div className="space-y-2">
          {actions.map((a) => {
            const isOverdue = a.deadline && new Date(a.deadline) < new Date() && a.statut !== "realisee";
            const cardStyle = getCardStyle(a.statut, a.deadline);
            const badgeVariant = getStatusBadgeVariant(a.statut, a.deadline);
            return (
              <Card key={a.id} className={`border-2 transition-colors ${cardStyle}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm flex-1">{a.description}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant={badgeVariant} className="text-xs">
                        {isOverdue ? "En retard" : STATUT_LABELS[a.statut] || a.statut}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{TYPE_ACTION_LABELS[a.type_action] || a.type_action}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {a.responsable && (
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{getActeurLabel(a.responsable)}</span>
                    )}
                    {a.date_prevue && (
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Prévu: {formatDate(a.date_prevue)}</span>
                    )}
                    {a.deadline && (
                      <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : ""}`}>
                        <Clock className="h-3 w-3" />Deadline: {formatDate(a.deadline)}
                      </span>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex gap-1 pt-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(a)}><Pencil className="h-3 w-3 mr-1" />Modifier</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive"><Trash2 className="h-3 w-3 mr-1" />Supprimer</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmer la suppression ?</AlertDialogTitle>
                            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                  <ElementNotes elementType="nc_action" elementId={a.id} responsableActeurId={a.responsable} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
