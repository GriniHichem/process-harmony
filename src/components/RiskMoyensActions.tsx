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
import { Plus, Pencil, Trash2, Calendar, DollarSign, User, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useActeurs } from "@/hooks/useActeurs";
import { ActeurUserSelect } from "@/components/ActeurUserSelect";
import { ElementNotes } from "@/components/ElementNotes";

interface RiskAction {
  id: string;
  risk_id: string;
  description: string;
  statut: string;
  date_prevue: string | null;
  deadline: string | null;
  responsable: string | null;
}

interface RiskMoyen {
  id: string;
  risk_id: string;
  description: string;
  type_moyen: string;
  budget: number | null;
  date_prevue: string | null;
  deadline: string | null;
  responsable: string | null;
  statut: string;
}

const STATUT_LABELS: Record<string, string> = { a_faire: "À faire", en_cours: "En cours", realisee: "Réalisée" };
const TYPE_MOYEN_LABELS: Record<string, string> = { humain: "Humain", materiel: "Matériel", financier: "Financier", logiciel: "Logiciel", autre: "Autre" };

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

function formatDate(d: string | null) {
  if (!d) return null;
  return format(new Date(d), "dd MMM yyyy", { locale: fr });
}

interface ItemCardProps {
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
}

function ItemCard({ itemId, elementType, description, statut, responsable, responsableActeurId, datePrevue, deadline, budget, typeMoyen, canEdit, onEdit, onDelete }: ItemCardProps) {
  const isOverdue = deadline && new Date(deadline) < new Date() && statut !== "realisee";
  const cardStyle = getCardStyle(statut, deadline);
  const badgeVariant = getStatusBadgeVariant(statut, deadline);

  return (
    <Card className={`border-2 transition-colors ${cardStyle}`}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium text-sm flex-1">{description}</p>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant={badgeVariant} className="text-xs">
              {isOverdue ? "En retard" : STATUT_LABELS[statut] || statut}
            </Badge>
            {typeMoyen && (
              <Badge variant="outline" className="text-xs">{TYPE_MOYEN_LABELS[typeMoyen] || typeMoyen}</Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {responsable && (
            <span className="flex items-center gap-1"><User className="h-3 w-3" />{responsable}</span>
          )}
          {datePrevue && (
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Prévu: {formatDate(datePrevue)}</span>
          )}
          {deadline && (
            <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : ""}`}>
              <Clock className="h-3 w-3" />Deadline: {formatDate(deadline)}
            </span>
          )}
          {budget != null && budget > 0 && (
            <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{budget.toLocaleString()} DH</span>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-1 pt-1">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onEdit}><Pencil className="h-3 w-3 mr-1" />Modifier</Button>
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
                  <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        <ElementNotes elementType={elementType} elementId={itemId} responsableActeurId={responsableActeurId} />
      </CardContent>
    </Card>
  );
}

interface RiskMoyensActionsProps {
  riskId: string;
  canEdit: boolean;
}

export function RiskMoyensActions({ riskId, canEdit }: RiskMoyensActionsProps) {
  const { acteurs, getActeurLabel } = useActeurs();
  const [actions, setActions] = useState<RiskAction[]>([]);
  const [moyens, setMoyens] = useState<RiskMoyen[]>([]);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [moyenDialogOpen, setMoyenDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<RiskAction | null>(null);
  const [editingMoyen, setEditingMoyen] = useState<RiskMoyen | null>(null);

  const emptyActionForm = { description: "", statut: "a_faire", date_prevue: "", deadline: "", responsable: "", responsable_user_id: "" };
  const emptyMoyenForm = { description: "", type_moyen: "humain", budget: "", date_prevue: "", deadline: "", responsable: "", responsable_user_id: "", statut: "a_faire" };
  const [actionForm, setActionForm] = useState(emptyActionForm);
  const [moyenForm, setMoyenForm] = useState(emptyMoyenForm);

  const fetchData = async () => {
    const [aRes, mRes] = await Promise.all([
      supabase.from("risk_actions").select("*").eq("risk_id", riskId).order("created_at"),
      supabase.from("risk_moyens").select("*").eq("risk_id", riskId).order("created_at"),
    ]);
    setActions((aRes.data ?? []) as RiskAction[]);
    setMoyens((mRes.data ?? []) as RiskMoyen[]);
  };

  useEffect(() => { fetchData(); }, [riskId]);

  // Action CRUD
  const openEditAction = (a: RiskAction) => {
    setEditingAction(a);
    setActionForm({ description: a.description, statut: a.statut, date_prevue: a.date_prevue || "", deadline: a.deadline || "", responsable: a.responsable || "", responsable_user_id: (a as any).responsable_user_id || "" });
    setActionDialogOpen(true);
  };

  const handleSaveAction = async () => {
    if (!actionForm.description) { toast.error("Description requise"); return; }
    const data: any = { description: actionForm.description, statut: actionForm.statut, date_prevue: actionForm.date_prevue || null, deadline: actionForm.deadline || null, responsable: actionForm.responsable || null, responsable_user_id: actionForm.responsable_user_id || null };
    if (editingAction) {
      const { error } = await supabase.from("risk_actions").update(data).eq("id", editingAction.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Action modifiée");
    } else {
      const { error } = await supabase.from("risk_actions").insert({ ...data, risk_id: riskId });
      if (error) { toast.error(error.message); return; }
      toast.success("Action ajoutée");
    }
    setActionDialogOpen(false);
    setEditingAction(null);
    setActionForm(emptyActionForm);
    fetchData();
  };

  const handleDeleteAction = async (id: string) => {
    const { error } = await supabase.from("risk_actions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Action supprimée");
    fetchData();
  };

  // Moyen CRUD
  const openEditMoyen = (m: RiskMoyen) => {
    setEditingMoyen(m);
    setMoyenForm({ description: m.description, type_moyen: m.type_moyen, budget: m.budget?.toString() || "", date_prevue: m.date_prevue || "", deadline: m.deadline || "", responsable: m.responsable || "", responsable_user_id: (m as any).responsable_user_id || "", statut: m.statut });
    setMoyenDialogOpen(true);
  };

  const handleSaveMoyen = async () => {
    if (!moyenForm.description) { toast.error("Description requise"); return; }
    const data: any = { description: moyenForm.description, type_moyen: moyenForm.type_moyen, budget: moyenForm.budget ? Number(moyenForm.budget) : null, date_prevue: moyenForm.date_prevue || null, deadline: moyenForm.deadline || null, responsable: moyenForm.responsable || null, responsable_user_id: moyenForm.responsable_user_id || null, statut: moyenForm.statut };
    if (editingMoyen) {
      const { error } = await supabase.from("risk_moyens").update(data).eq("id", editingMoyen.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Moyen modifié");
    } else {
      const { error } = await supabase.from("risk_moyens").insert({ ...data, risk_id: riskId });
      if (error) { toast.error(error.message); return; }
      toast.success("Moyen ajouté");
    }
    setMoyenDialogOpen(false);
    setEditingMoyen(null);
    setMoyenForm(emptyMoyenForm);
    fetchData();
  };

  const handleDeleteMoyen = async (id: string) => {
    const { error } = await supabase.from("risk_moyens").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Moyen supprimé");
    fetchData();
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 pt-2">
      {/* Moyens */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">🛠 Moyens</h4>
          {canEdit && (
            <Dialog open={moyenDialogOpen} onOpenChange={(o) => { setMoyenDialogOpen(o); if (!o) { setEditingMoyen(null); setMoyenForm(emptyMoyenForm); } }}>
              <DialogTrigger asChild><Button size="sm" variant="outline" className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" />Ajouter</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingMoyen ? "Modifier le moyen" : "Ajouter un moyen"}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1"><Label>Description</Label><Textarea value={moyenForm.description} onChange={(e) => setMoyenForm({ ...moyenForm, description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Type</Label>
                      <Select value={moyenForm.type_moyen} onValueChange={(v) => setMoyenForm({ ...moyenForm, type_moyen: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(TYPE_MOYEN_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Statut</Label>
                      <Select value={moyenForm.statut} onValueChange={(v) => setMoyenForm({ ...moyenForm, statut: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1"><Label>Budget (DH)</Label><Input type="number" value={moyenForm.budget} onChange={(e) => setMoyenForm({ ...moyenForm, budget: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Responsable</Label><ActeurUserSelect acteurValue={moyenForm.responsable} userValue={moyenForm.responsable_user_id} onActeurChange={(v) => setMoyenForm({ ...moyenForm, responsable: v, responsable_user_id: "" })} onUserChange={(v) => setMoyenForm({ ...moyenForm, responsable_user_id: v })} acteurs={acteurs} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>Date prévue</Label><Input type="date" value={moyenForm.date_prevue} onChange={(e) => setMoyenForm({ ...moyenForm, date_prevue: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Deadline</Label><Input type="date" value={moyenForm.deadline} onChange={(e) => setMoyenForm({ ...moyenForm, deadline: e.target.value })} /></div>
                  </div>
                  <Button onClick={handleSaveMoyen} className="w-full">{editingMoyen ? "Enregistrer" : "Ajouter"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {moyens.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Aucun moyen défini</p>
        ) : (
          <div className="space-y-2">
            {moyens.map((m) => (
              <ItemCard key={m.id} itemId={m.id} elementType="risk_moyen" description={m.description} statut={m.statut} responsable={getActeurLabel(m.responsable)} responsableActeurId={m.responsable} datePrevue={m.date_prevue} deadline={m.deadline} budget={m.budget} typeMoyen={m.type_moyen} canEdit={canEdit} onEdit={() => openEditMoyen(m)} onDelete={() => handleDeleteMoyen(m.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">📋 Plan d'actions</h4>
          {canEdit && (
            <Dialog open={actionDialogOpen} onOpenChange={(o) => { setActionDialogOpen(o); if (!o) { setEditingAction(null); setActionForm(emptyActionForm); } }}>
              <DialogTrigger asChild><Button size="sm" variant="outline" className="h-7 text-xs"><Plus className="h-3 w-3 mr-1" />Ajouter</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingAction ? "Modifier l'action" : "Ajouter une action"}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1"><Label>Description</Label><Textarea value={actionForm.description} onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })} /></div>
                  <div className="space-y-1">
                    <Label>Statut</Label>
                    <Select value={actionForm.statut} onValueChange={(v) => setActionForm({ ...actionForm, statut: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Responsable</Label><ActeurSelect value={actionForm.responsable} onChange={(v) => setActionForm({ ...actionForm, responsable: v })} acteurs={acteurs} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label>Date prévue</Label><Input type="date" value={actionForm.date_prevue} onChange={(e) => setActionForm({ ...actionForm, date_prevue: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Deadline</Label><Input type="date" value={actionForm.deadline} onChange={(e) => setActionForm({ ...actionForm, deadline: e.target.value })} /></div>
                  </div>
                  <Button onClick={handleSaveAction} className="w-full">{editingAction ? "Enregistrer" : "Ajouter"}</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {actions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Aucune action définie</p>
        ) : (
          <div className="space-y-2">
            {actions.map((a) => (
              <ItemCard key={a.id} itemId={a.id} elementType="risk_action" description={a.description} statut={a.statut} responsable={getActeurLabel(a.responsable)} responsableActeurId={a.responsable} datePrevue={a.date_prevue} deadline={a.deadline} canEdit={canEdit} onEdit={() => openEditAction(a)} onDelete={() => handleDeleteAction(a.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
