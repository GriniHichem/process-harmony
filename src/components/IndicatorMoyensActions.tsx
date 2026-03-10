import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, Wrench, ClipboardList, CalendarClock } from "lucide-react";
import { format } from "date-fns";

interface IndicatorAction {
  id: string;
  indicator_id: string;
  description: string;
  statut: string;
  date_prevue: string | null;
  deadline: string | null;
  responsable: string | null;
}

interface IndicatorMoyensActionsProps {
  indicatorId: string;
  moyens: string | null;
  canEdit: boolean;
  onMoyensUpdate: (moyens: string) => void;
}

const STATUT_LABELS: Record<string, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  realisee: "Réalisée",
};

const STATUT_COLORS: Record<string, string> = {
  a_faire: "bg-muted text-muted-foreground",
  en_cours: "bg-primary/10 text-primary",
  realisee: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

export function IndicatorMoyensActions({ indicatorId, moyens, canEdit, onMoyensUpdate }: IndicatorMoyensActionsProps) {
  const [actions, setActions] = useState<IndicatorAction[]>([]);
  const [editingMoyens, setEditingMoyens] = useState(false);
  const [moyensText, setMoyensText] = useState(moyens ?? "");
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<IndicatorAction | null>(null);
  const [form, setForm] = useState({ description: "", statut: "a_faire", date_prevue: "", deadline: "", responsable: "" });

  const fetchActions = useCallback(async () => {
    const { data } = await supabase
      .from("indicator_actions")
      .select("*")
      .eq("indicator_id", indicatorId)
      .order("created_at", { ascending: true });
    setActions((data ?? []) as IndicatorAction[]);
  }, [indicatorId]);

  useEffect(() => { fetchActions(); }, [fetchActions]);
  useEffect(() => { setMoyensText(moyens ?? ""); }, [moyens]);

  const handleSaveMoyens = async () => {
    const { error } = await supabase.from("indicators").update({ moyens: moyensText || null } as any).eq("id", indicatorId);
    if (error) { toast.error(error.message); return; }
    toast.success("Moyens mis à jour");
    setEditingMoyens(false);
    onMoyensUpdate(moyensText);
  };

  const openAddAction = () => {
    setEditingAction(null);
    setForm({ description: "", statut: "a_faire", date_prevue: "", deadline: "", responsable: "" });
    setActionDialogOpen(true);
  };

  const openEditAction = (a: IndicatorAction) => {
    setEditingAction(a);
    setForm({
      description: a.description,
      statut: a.statut,
      date_prevue: a.date_prevue ?? "",
      deadline: a.deadline ?? "",
      responsable: a.responsable ?? "",
    });
    setActionDialogOpen(true);
  };

  const handleSaveAction = async () => {
    if (!form.description.trim()) { toast.error("Description requise"); return; }
    const payload = {
      description: form.description.trim(),
      statut: form.statut,
      date_prevue: form.date_prevue || null,
      deadline: form.deadline || null,
      responsable: form.responsable || null,
    };

    if (editingAction) {
      const { error } = await supabase.from("indicator_actions").update(payload as any).eq("id", editingAction.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Action mise à jour");
    } else {
      const { error } = await supabase.from("indicator_actions").insert({ ...payload, indicator_id: indicatorId } as any);
      if (error) { toast.error(error.message); return; }
      toast.success("Action ajoutée");
    }
    setActionDialogOpen(false);
    fetchActions();
  };

  const handleDeleteAction = async (id: string) => {
    const { error } = await supabase.from("indicator_actions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Action supprimée");
    fetchActions();
  };

  const isOverdue = (deadline: string | null, statut: string) => {
    if (!deadline || statut === "realisee") return false;
    return new Date(deadline) < new Date();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Moyens */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Moyens
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editingMoyens ? (
            <div className="space-y-2">
              <Textarea
                value={moyensText}
                onChange={(e) => setMoyensText(e.target.value)}
                placeholder="Ressources humaines, matérielles, financières..."
                rows={4}
                className="text-sm"
              />
              <div className="flex gap-1 justify-end">
                <Button variant="ghost" size="sm" onClick={handleSaveMoyens}><Check className="h-3 w-3 mr-1" /> Enregistrer</Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditingMoyens(false); setMoyensText(moyens ?? ""); }}><X className="h-3 w-3 mr-1" /> Annuler</Button>
              </div>
            </div>
          ) : (
            <div>
              {moyens ? (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{moyens}</p>
              ) : (
                <p className="text-sm text-muted-foreground italic">Aucun moyen défini</p>
              )}
              {canEdit && (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setEditingMoyens(true)}>
                  <Pencil className="h-3 w-3 mr-1" /> {moyens ? "Modifier" : "Ajouter"}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan d'actions */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Plan d'actions
            </CardTitle>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={openAddAction}>
                <Plus className="h-3 w-3 mr-1" /> Ajouter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucune action définie</p>
          ) : (
            <div className="space-y-2">
              {actions.map((a) => {
                const overdue = isOverdue(a.deadline, a.statut);
                return (
                  <div key={a.id} className={`rounded-md border px-3 py-2 text-sm ${overdue ? "border-destructive/50 bg-destructive/5" : "bg-muted/30"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{a.description}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className={`text-[10px] ${STATUT_COLORS[a.statut] ?? ""}`}>
                            {STATUT_LABELS[a.statut] ?? a.statut}
                          </Badge>
                          {a.responsable && <span>👤 {a.responsable}</span>}
                          {a.date_prevue && (
                            <span className="flex items-center gap-0.5">
                              <CalendarClock className="h-3 w-3" /> Prévu : {format(new Date(a.date_prevue), "dd/MM/yyyy")}
                            </span>
                          )}
                          {a.deadline && (
                            <span className={`flex items-center gap-0.5 ${overdue ? "text-destructive font-medium" : ""}`}>
                              🎯 Deadline : {format(new Date(a.deadline), "dd/MM/yyyy")}
                              {overdue && " ⚠️"}
                            </span>
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex gap-0.5 shrink-0">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditAction(a)}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteAction(a.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAction ? "Modifier l'action" : "Nouvelle action"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a_faire">À faire</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="realisee">Réalisée</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} placeholder="Nom du responsable" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date prévue</Label>
                <Input type="date" value={form.date_prevue} onChange={(e) => setForm({ ...form, date_prevue: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Deadline finale</Label>
                <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleSaveAction} className="w-full">Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
