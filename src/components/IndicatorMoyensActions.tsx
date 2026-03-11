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
import { Plus, Pencil, Trash2, Check, X, Wrench, ClipboardList, CalendarClock, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { useActeurs } from "@/hooks/useActeurs";
import { ActeurSelect } from "@/components/ActeurSelect";
import { ElementNotes } from "@/components/ElementNotes";

interface IndicatorMoyen {
  id: string;
  indicator_id: string;
  description: string;
  type_moyen: string;
  budget: number | null;
  date_prevue: string | null;
  deadline: string | null;
  responsable: string | null;
  statut: string;
}

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

const TYPE_MOYEN_LABELS: Record<string, string> = {
  humain: "Humain",
  materiel: "Matériel",
  financier: "Financier",
  logiciel: "Logiciel",
  autre: "Autre",
};

function ItemCard({
  itemId,
  elementType,
  description,
  statut,
  responsable,
  responsableActeurId,
  datePrevue,
  deadline,
  budget,
  typeMoyen,
  canEdit,
  onEdit,
  onDelete,
}: {
  itemId: string;
  elementType: string;
  description: string;
  statut: string;
  responsable: string | null;
  responsableActeurId: string | null;
  datePrevue: string | null;
  deadline: string | null;
  budget?: number | null;
  typeMoyen?: string;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const overdue = deadline && statut !== "realisee" && new Date(deadline) < new Date();
  return (
    <div className={`rounded-md border px-3 py-2 text-sm ${overdue ? "border-destructive/50 bg-destructive/5" : "bg-muted/30"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          <p className="font-medium">{description}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary" className={`text-[10px] ${STATUT_COLORS[statut] ?? ""}`}>
              {STATUT_LABELS[statut] ?? statut}
            </Badge>
            {typeMoyen && (
              <Badge variant="outline" className="text-[10px]">
                {TYPE_MOYEN_LABELS[typeMoyen] ?? typeMoyen}
              </Badge>
            )}
            {budget != null && (
              <span className="flex items-center gap-0.5">
                <DollarSign className="h-3 w-3" /> {budget.toLocaleString()} DH
              </span>
            )}
            {responsable && <span>👤 {responsable}</span>}
            {datePrevue && (
              <span className="flex items-center gap-0.5">
                <CalendarClock className="h-3 w-3" /> Prévu : {format(new Date(datePrevue), "dd/MM/yyyy")}
              </span>
            )}
            {deadline && (
              <span className={`flex items-center gap-0.5 ${overdue ? "text-destructive font-medium" : ""}`}>
                🎯 Deadline : {format(new Date(deadline), "dd/MM/yyyy")}
                {overdue && " ⚠️"}
              </span>
            )}
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}><Pencil className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
          </div>
        )}
      </div>
      <ElementNotes elementType={elementType} elementId={itemId} responsableActeurId={responsableActeurId} />
    </div>
  );
}

export function IndicatorMoyensActions({ indicatorId, canEdit }: IndicatorMoyensActionsProps) {
  const { acteurs, getActeurLabel } = useActeurs();
  const [moyens, setMoyens] = useState<IndicatorMoyen[]>([]);
  const [actions, setActions] = useState<IndicatorAction[]>([]);

  // Moyen dialog
  const [moyenDialogOpen, setMoyenDialogOpen] = useState(false);
  const [editingMoyen, setEditingMoyen] = useState<IndicatorMoyen | null>(null);
  const [moyenForm, setMoyenForm] = useState({ description: "", type_moyen: "humain", budget: "", date_prevue: "", deadline: "", responsable: "", statut: "a_faire" });

  // Action dialog
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<IndicatorAction | null>(null);
  const [actionForm, setActionForm] = useState({ description: "", statut: "a_faire", date_prevue: "", deadline: "", responsable: "" });

  const fetchMoyens = useCallback(async () => {
    const { data } = await supabase
      .from("indicator_moyens" as any)
      .select("*")
      .eq("indicator_id", indicatorId)
      .order("created_at", { ascending: true });
    setMoyens((data ?? []) as any);
  }, [indicatorId]);

  const fetchActions = useCallback(async () => {
    const { data } = await supabase
      .from("indicator_actions")
      .select("*")
      .eq("indicator_id", indicatorId)
      .order("created_at", { ascending: true });
    setActions((data ?? []) as IndicatorAction[]);
  }, [indicatorId]);

  useEffect(() => { fetchMoyens(); fetchActions(); }, [fetchMoyens, fetchActions]);

  // === MOYENS CRUD ===
  const openAddMoyen = () => {
    setEditingMoyen(null);
    setMoyenForm({ description: "", type_moyen: "humain", budget: "", date_prevue: "", deadline: "", responsable: "", statut: "a_faire" });
    setMoyenDialogOpen(true);
  };
  const openEditMoyen = (m: IndicatorMoyen) => {
    setEditingMoyen(m);
    setMoyenForm({
      description: m.description,
      type_moyen: m.type_moyen,
      budget: m.budget != null ? String(m.budget) : "",
      date_prevue: m.date_prevue ?? "",
      deadline: m.deadline ?? "",
      responsable: m.responsable ?? "",
      statut: m.statut,
    });
    setMoyenDialogOpen(true);
  };
  const handleSaveMoyen = async () => {
    if (!moyenForm.description.trim()) { toast.error("Description requise"); return; }
    const payload = {
      description: moyenForm.description.trim(),
      type_moyen: moyenForm.type_moyen,
      budget: moyenForm.budget ? Number(moyenForm.budget) : null,
      date_prevue: moyenForm.date_prevue || null,
      deadline: moyenForm.deadline || null,
      responsable: moyenForm.responsable || null,
      statut: moyenForm.statut,
    };
    if (editingMoyen) {
      const { error } = await supabase.from("indicator_moyens" as any).update(payload as any).eq("id", editingMoyen.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Moyen mis à jour");
    } else {
      const { error } = await supabase.from("indicator_moyens" as any).insert({ ...payload, indicator_id: indicatorId } as any);
      if (error) { toast.error(error.message); return; }
      toast.success("Moyen ajouté");
    }
    setMoyenDialogOpen(false);
    fetchMoyens();
  };
  const handleDeleteMoyen = async (id: string) => {
    const { error } = await supabase.from("indicator_moyens" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Moyen supprimé");
    fetchMoyens();
  };

  // === ACTIONS CRUD ===
  const openAddAction = () => {
    setEditingAction(null);
    setActionForm({ description: "", statut: "a_faire", date_prevue: "", deadline: "", responsable: "" });
    setActionDialogOpen(true);
  };
  const openEditAction = (a: IndicatorAction) => {
    setEditingAction(a);
    setActionForm({
      description: a.description,
      statut: a.statut,
      date_prevue: a.date_prevue ?? "",
      deadline: a.deadline ?? "",
      responsable: a.responsable ?? "",
    });
    setActionDialogOpen(true);
  };
  const handleSaveAction = async () => {
    if (!actionForm.description.trim()) { toast.error("Description requise"); return; }
    const payload = {
      description: actionForm.description.trim(),
      statut: actionForm.statut,
      date_prevue: actionForm.date_prevue || null,
      deadline: actionForm.deadline || null,
      responsable: actionForm.responsable || null,
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Moyens */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="h-4 w-4" /> Moyens
            </CardTitle>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={openAddMoyen}>
                <Plus className="h-3 w-3 mr-1" /> Ajouter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {moyens.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Aucun moyen défini</p>
          ) : (
            <div className="space-y-2">
              {moyens.map((m) => (
                 <ItemCard
                  key={m.id}
                  itemId={m.id}
                  elementType="indicator_moyen"
                  description={m.description}
                  statut={m.statut}
                  responsable={getActeurLabel(m.responsable)}
                  responsableActeurId={m.responsable}
                  datePrevue={m.date_prevue}
                  deadline={m.deadline}
                  budget={m.budget}
                  typeMoyen={m.type_moyen}
                  canEdit={canEdit}
                  onEdit={() => openEditMoyen(m)}
                  onDelete={() => handleDeleteMoyen(m.id)}
                />
              ))}
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
              {actions.map((a) => (
                <ItemCard
                  key={a.id}
                  description={a.description}
                  statut={a.statut}
                  responsable={getActeurLabel(a.responsable)}
                  datePrevue={a.date_prevue}
                  deadline={a.deadline}
                  canEdit={canEdit}
                  onEdit={() => openEditAction(a)}
                  onDelete={() => handleDeleteAction(a.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Moyen dialog */}
      <Dialog open={moyenDialogOpen} onOpenChange={setMoyenDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMoyen ? "Modifier le moyen" : "Nouveau moyen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={moyenForm.description} onChange={(e) => setMoyenForm({ ...moyenForm, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={moyenForm.type_moyen} onValueChange={(v) => setMoyenForm({ ...moyenForm, type_moyen: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="humain">Humain</SelectItem>
                    <SelectItem value="materiel">Matériel</SelectItem>
                    <SelectItem value="financier">Financier</SelectItem>
                    <SelectItem value="logiciel">Logiciel</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Budget (DH)</Label>
                <Input type="number" value={moyenForm.budget} onChange={(e) => setMoyenForm({ ...moyenForm, budget: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={moyenForm.statut} onValueChange={(v) => setMoyenForm({ ...moyenForm, statut: v })}>
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
              <ActeurSelect value={moyenForm.responsable} onChange={(v) => setMoyenForm({ ...moyenForm, responsable: v })} acteurs={acteurs} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date prévue</Label>
                <Input type="date" value={moyenForm.date_prevue} onChange={(e) => setMoyenForm({ ...moyenForm, date_prevue: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Deadline finale</Label>
                <Input type="date" value={moyenForm.deadline} onChange={(e) => setMoyenForm({ ...moyenForm, deadline: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleSaveMoyen} className="w-full">Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Action dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAction ? "Modifier l'action" : "Nouvelle action"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={actionForm.description} onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={actionForm.statut} onValueChange={(v) => setActionForm({ ...actionForm, statut: v })}>
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
              <ActeurSelect value={actionForm.responsable} onChange={(v) => setActionForm({ ...actionForm, responsable: v })} acteurs={acteurs} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date prévue</Label>
                <Input type="date" value={actionForm.date_prevue} onChange={(e) => setActionForm({ ...actionForm, date_prevue: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Deadline finale</Label>
                <Input type="date" value={actionForm.deadline} onChange={(e) => setActionForm({ ...actionForm, deadline: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleSaveAction} className="w-full">Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
