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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Zap, ChevronDown, ChevronRight, StickyNote, User, Trash2, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Acteur = { id: string; nom: string; prenom: string };
type ActionNote = { id: string; action_id: string; contenu: string; avancement: number; date_note: string; created_at: string };
type Action = { id: string; description: string; type_action: string; statut: string; echeance: string | null; responsable_id: string | null; source_type: string };

const statusColors: Record<string, string> = {
  planifiee: "bg-muted text-muted-foreground",
  en_cours: "bg-primary/20 text-primary",
  realisee: "bg-success/20 text-success",
  verifiee: "bg-accent/20 text-accent",
  cloturee: "bg-secondary text-secondary-foreground",
  en_retard: "bg-destructive/20 text-destructive",
};

const statusLabels: Record<string, string> = {
  planifiee: "Planifiée",
  en_cours: "En cours",
  realisee: "Réalisée",
  verifiee: "Vérifiée",
  cloturee: "Clôturée",
  en_retard: "En retard",
};

export default function Actions() {
  const { hasRole } = useAuth();
  const [actions, setActions] = useState<Action[]>([]);
  const [acteurs, setActeurs] = useState<Acteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAction, setNewAction] = useState({ description: "", type_action: "corrective", echeance: "", source_type: "manuelle", responsable_id: "" });
  const [expandedAction, setExpandedAction] = useState<string | null>(null);
  const [notesMap, setNotesMap] = useState<Record<string, ActionNote[]>>({});
  const [newNote, setNewNote] = useState<Record<string, { contenu: string; avancement: string }>>({});

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAction, setEditAction] = useState<{ id: string; description: string; type_action: string; echeance: string; responsable_id: string } | null>(null);

  const canCreate = hasRole("rmq") || hasRole("responsable_processus") || hasRole("auditeur") || hasRole("admin");
  const canEdit = hasRole("rmq") || hasRole("responsable_processus") || hasRole("admin");
  const canDelete = hasRole("rmq") || hasRole("admin");

  const fetchActions = async () => {
    const { data } = await supabase.from("actions").select("*").order("echeance", { ascending: true });
    setActions((data ?? []) as Action[]);
    setLoading(false);
  };

  const fetchActeurs = async () => {
    const { data } = await supabase.from("acteurs").select("id, nom, prenom").eq("actif", true).order("nom");
    setActeurs(data ?? []);
  };

  const fetchNotes = async (actionId: string) => {
    const { data } = await supabase
      .from("action_notes")
      .select("*")
      .eq("action_id", actionId)
      .order("date_note", { ascending: false });
    setNotesMap((prev) => ({ ...prev, [actionId]: (data ?? []) as ActionNote[] }));
  };

  useEffect(() => {
    fetchActions();
    fetchActeurs();
  }, []);

  const handleCreate = async () => {
    if (!newAction.description) { toast.error("Description requise"); return; }
    const { error } = await supabase.from("actions").insert({
      description: newAction.description,
      type_action: newAction.type_action as any,
      echeance: newAction.echeance || null,
      source_type: newAction.source_type,
      responsable_id: newAction.responsable_id || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Action créée");
    setDialogOpen(false);
    setNewAction({ description: "", type_action: "corrective", echeance: "", source_type: "manuelle", responsable_id: "" });
    fetchActions();
  };

  const handleOpenEdit = (a: Action) => {
    setEditAction({
      id: a.id,
      description: a.description,
      type_action: a.type_action,
      echeance: a.echeance ?? "",
      responsable_id: a.responsable_id ?? "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdateAction = async () => {
    if (!editAction) return;
    if (!editAction.description) { toast.error("Description requise"); return; }
    const { error } = await supabase.from("actions").update({
      description: editAction.description,
      type_action: editAction.type_action as any,
      echeance: editAction.echeance || null,
      responsable_id: editAction.responsable_id || null,
    }).eq("id", editAction.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Action modifiée");
    setEditDialogOpen(false);
    setEditAction(null);
    fetchActions();
  };

  const handleDeleteAction = async (id: string) => {
    const { error } = await supabase.from("actions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Action supprimée");
    if (expandedAction === id) setExpandedAction(null);
    fetchActions();
  };

  const handleUpdateStatus = async (actionId: string, newStatut: string) => {
    const { error } = await supabase.from("actions").update({ statut: newStatut as any }).eq("id", actionId);
    if (error) { toast.error(error.message); return; }
    toast.success("Statut mis à jour");
    fetchActions();
  };

  const handleUpdateResponsable = async (actionId: string, responsableId: string) => {
    const { error } = await supabase.from("actions").update({ responsable_id: responsableId || null }).eq("id", actionId);
    if (error) { toast.error(error.message); return; }
    toast.success("Responsable mis à jour");
    fetchActions();
  };

  const handleAddNote = async (actionId: string) => {
    const note = newNote[actionId];
    if (!note?.contenu) { toast.error("Contenu de la note requis"); return; }
    const avancement = Math.min(100, Math.max(0, parseInt(note.avancement) || 0));
    const { error } = await supabase.from("action_notes").insert({
      action_id: actionId,
      contenu: note.contenu,
      avancement,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Note ajoutée");
    setNewNote((prev) => ({ ...prev, [actionId]: { contenu: "", avancement: "" } }));
    fetchNotes(actionId);
  };

  const handleDeleteNote = async (noteId: string, actionId: string) => {
    const { error } = await supabase.from("action_notes").delete().eq("id", noteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Note supprimée");
    fetchNotes(actionId);
  };

  const toggleExpand = (actionId: string) => {
    if (expandedAction === actionId) {
      setExpandedAction(null);
    } else {
      setExpandedAction(actionId);
      if (!notesMap[actionId]) fetchNotes(actionId);
    }
  };

  const getResponsableName = (id: string | null) => {
    if (!id) return null;
    const a = acteurs.find((act) => act.id === id);
    return a ? `${a.prenom} ${a.nom}` : null;
  };

  const isOverdue = (a: Action) => a.echeance && new Date(a.echeance) < new Date() && !["cloturee", "verifiee"].includes(a.statut);

  const getLatestAvancement = (actionId: string) => {
    const notes = notesMap[actionId];
    if (!notes || notes.length === 0) return 0;
    return notes[0].avancement;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Actions</h1>
          <p className="text-muted-foreground">Actions correctives, préventives et d'amélioration</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nouvelle action</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer une action</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={newAction.description} onChange={(e) => setNewAction({ ...newAction, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newAction.type_action} onValueChange={(v) => setNewAction({ ...newAction, type_action: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrective">Corrective</SelectItem>
                      <SelectItem value="preventive">Préventive</SelectItem>
                      <SelectItem value="amelioration">Amélioration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Responsable</Label>
                  <Select value={newAction.responsable_id} onValueChange={(v) => setNewAction({ ...newAction, responsable_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un responsable" /></SelectTrigger>
                    <SelectContent>
                      {acteurs.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.prenom} {a.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Échéance</Label>
                  <Input type="date" value={newAction.echeance} onChange={(e) => setNewAction({ ...newAction, echeance: e.target.value })} />
                </div>
                <Button onClick={handleCreate} className="w-full">Créer</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : actions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune action</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {actions.map((a) => {
            const isOpen = expandedAction === a.id;
            const notes = notesMap[a.id] ?? [];
            const noteInput = newNote[a.id] ?? { contenu: "", avancement: "" };
            const responsable = getResponsableName(a.responsable_id);
            const latestAvancement = getLatestAvancement(a.id);

            return (
              <Collapsible key={a.id} open={isOpen} onOpenChange={() => toggleExpand(a.id)}>
                <Card className={isOverdue(a) ? "border-destructive/50" : ""}>
                  <CollapsibleTrigger asChild>
                    <CardContent className="flex items-center justify-between py-4 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                        <Zap className={`h-5 w-5 shrink-0 ${isOverdue(a) ? "text-destructive" : "text-primary"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium line-clamp-1">{a.description}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span>{a.type_action}</span>
                            <span>•</span>
                            <span>{a.echeance ?? "Sans échéance"}</span>
                            {responsable && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1"><User className="h-3 w-3" />{responsable}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        {notesMap[a.id] && notesMap[a.id].length > 0 && (
                          <div className="flex items-center gap-2 w-24">
                            <Progress value={latestAvancement} className="h-2" />
                            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">{latestAvancement}%</span>
                          </div>
                        )}
                        <Badge className={statusColors[a.statut] ?? ""}>{statusLabels[a.statut] ?? a.statut}</Badge>
                      </div>
                    </CardContent>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div className="border-t px-6 py-4 space-y-4 bg-muted/10">
                      {/* Statut & Responsable inline edit + Edit/Delete buttons */}
                      {canEdit && (
                        <div className="flex flex-wrap gap-4 items-end">
                          <div className="space-y-1">
                            <Label className="text-xs">Statut</Label>
                            <Select value={a.statut} onValueChange={(v) => handleUpdateStatus(a.id, v)}>
                              <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(statusLabels).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Responsable</Label>
                            <Select value={a.responsable_id ?? ""} onValueChange={(v) => handleUpdateResponsable(a.id, v)}>
                              <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="Assigner" /></SelectTrigger>
                              <SelectContent>
                                {acteurs.map((act) => (
                                  <SelectItem key={act.id} value={act.id}>{act.prenom} {act.nom}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-1 ml-auto">
                            <Button variant="outline" size="sm" className="h-8" onClick={() => handleOpenEdit(a)}>
                              <Pencil className="h-3 w-3 mr-1" /> Modifier
                            </Button>
                            {canDelete && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-8 text-destructive border-destructive/30 hover:bg-destructive/10">
                                    <Trash2 className="h-3 w-3 mr-1" /> Supprimer
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer cette action ?</AlertDialogTitle>
                                    <AlertDialogDescription>Cette action et toutes ses notes de suivi seront supprimées définitivement.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteAction(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Notes list */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <StickyNote className="h-4 w-4" /> Notes de suivi ({notes.length})
                        </h4>
                        {notes.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Aucune note de suivi</p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {notes.map((n) => (
                              <div key={n.id} className="rounded-lg border bg-background p-3 space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-muted-foreground">{new Date(n.date_note).toLocaleDateString("fr-FR")}</span>
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5">
                                      <Progress value={n.avancement} className="h-1.5 w-16" />
                                      <span className="text-xs font-medium">{n.avancement}%</span>
                                    </div>
                                    {(role === "rmq" || role === "admin") && (
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteNote(n.id, a.id)}>
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                <p className="text-sm">{n.contenu}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add note form */}
                        {canCreate && (
                          <div className="flex gap-2 items-end pt-2 border-t">
                            <div className="flex-1 space-y-1">
                              <Label className="text-xs">Note</Label>
                              <Input
                                placeholder="Ajouter une note de suivi..."
                                value={noteInput.contenu}
                                onChange={(e) => setNewNote((prev) => ({ ...prev, [a.id]: { ...noteInput, contenu: e.target.value } }))}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="w-24 space-y-1">
                              <Label className="text-xs">Avancement %</Label>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                placeholder="0"
                                value={noteInput.avancement}
                                onChange={(e) => setNewNote((prev) => ({ ...prev, [a.id]: { ...noteInput, avancement: e.target.value } }))}
                                className="h-8 text-sm"
                              />
                            </div>
                            <Button size="sm" className="h-8" onClick={() => handleAddNote(a.id)}>
                              <Plus className="h-3 w-3 mr-1" /> Ajouter
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Edit Action Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditAction(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier l'action</DialogTitle></DialogHeader>
          {editAction && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={editAction.description} onChange={(e) => setEditAction({ ...editAction, description: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editAction.type_action} onValueChange={(v) => setEditAction({ ...editAction, type_action: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrective">Corrective</SelectItem>
                    <SelectItem value="preventive">Préventive</SelectItem>
                    <SelectItem value="amelioration">Amélioration</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsable</Label>
                <Select value={editAction.responsable_id} onValueChange={(v) => setEditAction({ ...editAction, responsable_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>
                    {acteurs.map((act) => (
                      <SelectItem key={act.id} value={act.id}>{act.prenom} {act.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Échéance</Label>
                <Input type="date" value={editAction.echeance} onChange={(e) => setEditAction({ ...editAction, echeance: e.target.value })} />
              </div>
              <Button onClick={handleUpdateAction} className="w-full">Enregistrer</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
