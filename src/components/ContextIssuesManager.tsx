import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, ListPlus } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ContextIssue {
  id: string;
  reference: string;
  type_enjeu: "interne" | "externe";
  intitule: string;
  description: string;
  impact: "faible" | "moyen" | "fort";
  climat_pertinent: boolean;
  domaine: string;
}

interface ContextIssueAction {
  id: string;
  context_issue_id: string;
  description: string;
  responsable: string;
  date_revue: string | null;
  statut: string;
}

interface Process {
  id: string;
  code: string;
  nom: string;
  responsable_id: string | null;
}

interface Props {
  processId?: string;
  canEdit: boolean;
  canDelete: boolean;
  userId?: string;
  isOnlyResponsable?: boolean;
  /** If set, only show enjeux linked to these process IDs */
  filterProcessIds?: string[];
}

const impactColors: Record<string, string> = {
  faible: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  moyen: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  fort: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const DOMAINES = [
  { value: "strategique", label: "Stratégique" },
  { value: "organisationnel", label: "Organisationnel" },
  { value: "technique", label: "Technique" },
  { value: "reglementaire", label: "Réglementaire" },
  { value: "financier", label: "Financier" },
  { value: "humain", label: "Humain" },
  { value: "marche_client", label: "Marché / Client" },
  { value: "fournisseur_prestataire", label: "Fournisseur / Prestataire" },
  { value: "securite_cyber", label: "Sécurité / Cybersécurité" },
  { value: "environnement_climat", label: "Environnement / Climat" },
];

const domaineLabel = (v: string) => DOMAINES.find(d => d.value === v)?.label || v;

type FormType = {
  reference: string;
  type_enjeu: "interne" | "externe";
  intitule: string;
  description: string;
  impact: "faible" | "moyen" | "fort";
  climat_pertinent: boolean;
  domaine: string;
  process_ids: string[];
};

const emptyIssue: FormType = { reference: "", type_enjeu: "interne", intitule: "", description: "", impact: "moyen", climat_pertinent: false, domaine: "strategique", process_ids: [] };
const emptyAction = { description: "", responsable: "", date_revue: "", statut: "a_faire" };

export function ContextIssuesManager({ processId, canEdit, canDelete, userId, isOnlyResponsable }: Props) {
  const [issues, setIssues] = useState<ContextIssue[]>([]);
  const [issueProcesses, setIssueProcesses] = useState<Record<string, string[]>>({});
  const [actions, setActions] = useState<Record<string, ContextIssueAction[]>>({});
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<ContextIssue | null>(null);
  const [form, setForm] = useState<FormType>(emptyIssue);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionForm, setActionForm] = useState(emptyAction);
  const [editingAction, setEditingAction] = useState<ContextIssueAction | null>(null);
  const [currentIssueId, setCurrentIssueId] = useState<string | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  const fetchProcesses = useCallback(async () => {
    const { data } = await supabase.from("processes").select("id, code, nom, responsable_id").order("code");
    setProcesses((data ?? []) as Process[]);
  }, []);

  const fetchIssues = useCallback(async () => {
    let issuesData: ContextIssue[];

    if (processId) {
      const { data: links } = await supabase.from("context_issue_processes").select("context_issue_id").eq("process_id", processId);
      if (!links || links.length === 0) { setIssues([]); setActions({}); setLoading(false); return; }
      const issueIds = links.map((l: any) => l.context_issue_id);
      const { data } = await supabase.from("context_issues").select("*").in("id", issueIds).order("reference");
      issuesData = (data as ContextIssue[]) ?? [];
    } else {
      const { data } = await supabase.from("context_issues").select("*").order("reference");
      issuesData = (data as ContextIssue[]) ?? [];
    }

    setIssues(issuesData);

    if (issuesData.length > 0) {
      const ids = issuesData.map(i => i.id);
      const [{ data: actionsData }, { data: cipData }] = await Promise.all([
        supabase.from("context_issue_actions").select("*").in("context_issue_id", ids).order("created_at"),
        supabase.from("context_issue_processes").select("*").in("context_issue_id", ids),
      ]);

      const groupedActions: Record<string, ContextIssueAction[]> = {};
      for (const a of (actionsData ?? []) as ContextIssueAction[]) {
        if (!groupedActions[a.context_issue_id]) groupedActions[a.context_issue_id] = [];
        groupedActions[a.context_issue_id].push(a);
      }
      setActions(groupedActions);

      const groupedProcesses: Record<string, string[]> = {};
      for (const link of (cipData ?? []) as any[]) {
        if (!groupedProcesses[link.context_issue_id]) groupedProcesses[link.context_issue_id] = [];
        groupedProcesses[link.context_issue_id].push(link.process_id);
      }
      setIssueProcesses(groupedProcesses);
    } else {
      setActions({});
      setIssueProcesses({});
    }
    setLoading(false);
  }, [processId]);

  useEffect(() => { fetchIssues(); fetchProcesses(); }, [fetchIssues, fetchProcesses]);

  const openAdd = () => { setEditingIssue(null); setForm({ ...emptyIssue, process_ids: processId ? [processId] : [] }); setDialogOpen(true); };
  const openEdit = async (issue: ContextIssue) => {
    setEditingIssue(issue);
    const linkedIds = issueProcesses[issue.id] ?? [];
    setForm({
      reference: issue.reference, type_enjeu: issue.type_enjeu, intitule: issue.intitule,
      description: issue.description || "", impact: issue.impact, climat_pertinent: issue.climat_pertinent,
      domaine: issue.domaine || "strategique", process_ids: linkedIds,
    });
    setDialogOpen(true);
  };

  const handleSaveIssue = async () => {
    if (!form.reference.trim() || !form.intitule.trim()) { toast.error("Référence et intitulé requis"); return; }

    if (editingIssue) {
      const { error } = await supabase.from("context_issues").update({
        reference: form.reference, type_enjeu: form.type_enjeu, intitule: form.intitule,
        description: form.description, impact: form.impact, climat_pertinent: form.climat_pertinent,
        domaine: form.domaine,
      }).eq("id", editingIssue.id);
      if (error) { toast.error(error.message); return; }

      // Update process links
      await supabase.from("context_issue_processes").delete().eq("context_issue_id", editingIssue.id);
      if (form.process_ids.length > 0) {
        await supabase.from("context_issue_processes").insert(
          form.process_ids.map(pid => ({ context_issue_id: editingIssue.id, process_id: pid }))
        );
      }
      toast.success("Enjeu modifié");
    } else {
      const { data, error } = await supabase.from("context_issues").insert({
        reference: form.reference, type_enjeu: form.type_enjeu, intitule: form.intitule,
        description: form.description, impact: form.impact, climat_pertinent: form.climat_pertinent,
        domaine: form.domaine,
      }).select("id").single();
      if (error || !data) { toast.error(error?.message || "Erreur"); return; }

      if (form.process_ids.length > 0) {
        await supabase.from("context_issue_processes").insert(
          form.process_ids.map(pid => ({ context_issue_id: data.id, process_id: pid }))
        );
      }
      toast.success("Enjeu ajouté");
    }
    setDialogOpen(false);
    fetchIssues();
  };

  const handleDeleteIssue = async (issueId: string) => {
    const { error } = await supabase.from("context_issues").delete().eq("id", issueId);
    if (error) { toast.error(error.message); return; }
    toast.success("Enjeu supprimé");
    fetchIssues();
  };

  const openAddAction = (issueId: string) => { setCurrentIssueId(issueId); setEditingAction(null); setActionForm(emptyAction); setActionDialogOpen(true); };
  const openEditAction = (action: ContextIssueAction) => {
    setCurrentIssueId(action.context_issue_id);
    setEditingAction(action);
    setActionForm({ description: action.description, responsable: action.responsable || "", date_revue: action.date_revue || "", statut: action.statut });
    setActionDialogOpen(true);
  };

  const handleSaveAction = async () => {
    if (!actionForm.description.trim()) { toast.error("Description requise"); return; }
    if (editingAction) {
      const { error } = await supabase.from("context_issue_actions").update({
        description: actionForm.description, responsable: actionForm.responsable,
        date_revue: actionForm.date_revue || null, statut: actionForm.statut,
      }).eq("id", editingAction.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Action modifiée");
    } else {
      const { error } = await supabase.from("context_issue_actions").insert({
        context_issue_id: currentIssueId!, description: actionForm.description,
        responsable: actionForm.responsable, date_revue: actionForm.date_revue || null, statut: actionForm.statut,
      });
      if (error) { toast.error(error.message); return; }
      toast.success("Action ajoutée");
    }
    setActionDialogOpen(false);
    fetchIssues();
  };

  const handleDeleteAction = async (actionId: string) => {
    const { error } = await supabase.from("context_issue_actions").delete().eq("id", actionId);
    if (error) { toast.error(error.message); return; }
    toast.success("Action supprimée");
    fetchIssues();
  };

  const toggleExpand = (id: string) => {
    setExpandedIssues(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleProcessId = (pid: string) => {
    setForm(prev => ({
      ...prev,
      process_ids: prev.process_ids.includes(pid) ? prev.process_ids.filter(p => p !== pid) : [...prev.process_ids, pid],
    }));
  };

  const statutLabels: Record<string, string> = { a_faire: "À faire", en_cours: "En cours", termine: "Terminé" };

  if (loading) return <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Enjeux du contexte</h3>
        {canEdit && (
          <Button size="sm" onClick={openAdd}><Plus className="mr-1 h-3.5 w-3.5" /> Ajouter un enjeu</Button>
        )}
      </div>

      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">Aucun enjeu du contexte défini</p>
      ) : (
        <div className="space-y-3">
          {issues.map(issue => {
            const linkedProcesses = (issueProcesses[issue.id] ?? []).map(pid => processes.find(p => p.id === pid)).filter(Boolean) as Process[];
            return (
              <Card key={issue.id} className="border">
                <Collapsible open={expandedIssues.has(issue.id)} onOpenChange={() => toggleExpand(issue.id)}>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger className="flex items-center gap-2 cursor-pointer hover:opacity-80 flex-wrap">
                        {expandedIssues.has(issue.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        <span className="font-mono text-xs text-muted-foreground">{issue.reference}</span>
                        <Badge variant="outline" className="text-xs">{issue.type_enjeu}</Badge>
                        <Badge variant="secondary" className="text-xs">{domaineLabel(issue.domaine)}</Badge>
                        <span className="font-medium text-sm">{issue.intitule}</span>
                        <Badge className={`text-xs ${impactColors[issue.impact]}`}>{issue.impact}</Badge>
                        {issue.climat_pertinent && <Badge variant="secondary" className="text-xs">🌍 Climat</Badge>}
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-1">
                        {canEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(issue)}><Pencil className="h-3.5 w-3.5" /></Button>}
                        {canDelete && <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteIssue(issue.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                      </div>
                    </div>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="pt-0 px-4 pb-4 space-y-3">
                      {issue.description && <p className="text-sm text-muted-foreground">{issue.description}</p>}

                      {!processId && linkedProcesses.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground font-medium">Processus :</span>
                          {linkedProcesses.map(p => (
                            <Badge key={p.id} variant="outline" className="text-xs">{p.code} – {p.nom}</Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium">Actions de prise en compte</h4>
                        {canEdit && (
                          <Button size="sm" variant="outline" onClick={() => openAddAction(issue.id)}>
                            <ListPlus className="mr-1 h-3.5 w-3.5" /> Action
                          </Button>
                        )}
                      </div>

                      {(actions[issue.id] ?? []).length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Aucune action définie</p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Action</TableHead>
                              <TableHead className="w-[120px]">Responsable</TableHead>
                              <TableHead className="w-[110px]">Date revue</TableHead>
                              <TableHead className="w-[90px]">Statut</TableHead>
                              {(canEdit || canDelete) && <TableHead className="w-[60px]" />}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(actions[issue.id] ?? []).map(action => (
                              <TableRow key={action.id}>
                                <TableCell className="text-sm">{action.description}</TableCell>
                                <TableCell className="text-sm">{action.responsable || "—"}</TableCell>
                                <TableCell className="text-sm">{action.date_revue || "—"}</TableCell>
                                <TableCell><Badge variant="outline" className="text-xs">{statutLabels[action.statut] ?? action.statut}</Badge></TableCell>
                                {(canEdit || canDelete) && (
                                  <TableCell>
                                    <div className="flex gap-1">
                                      {canEdit && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditAction(action)}><Pencil className="h-3 w-3" /></Button>}
                                      {canDelete && <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteAction(action.id)}><Trash2 className="h-3 w-3" /></Button>}
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Issue Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editingIssue ? "Modifier l'enjeu" : "Nouvel enjeu du contexte"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Référence</Label><Input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="EX: EC-001" /></div>
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type_enjeu} onValueChange={v => setForm({ ...form, type_enjeu: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="interne">Interne</SelectItem>
                    <SelectItem value="externe">Externe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Domaine / Catégorie</Label>
              <Select value={form.domaine} onValueChange={v => setForm({ ...form, domaine: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOMAINES.map(d => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Intitulé</Label><Input value={form.intitule} onChange={e => setForm({ ...form, intitule: e.target.value })} /></div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Impact</Label>
                <Select value={form.impact} onValueChange={v => setForm({ ...form, impact: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="faible">Faible</SelectItem>
                    <SelectItem value="moyen">Moyen</SelectItem>
                    <SelectItem value="fort">Fort</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex flex-col justify-end">
                <Label>Climat pertinent ?</Label>
                <Switch checked={form.climat_pertinent} onCheckedChange={v => setForm({ ...form, climat_pertinent: v })} />
              </div>
            </div>
            {/* Multi-select processus */}
            <div className="space-y-1">
              <Label>Processus concerné(s)</Label>
              <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
                {processes.map(p => {
                  const isMyProcess = !isOnlyResponsable || (userId && (p as any).responsable_id === userId);
                  const isAlreadyLinked = form.process_ids.includes(p.id);
                  return (
                    <label key={p.id} className={`flex items-center gap-2 text-sm rounded px-1 py-0.5 ${isMyProcess ? "cursor-pointer hover:bg-muted/50" : "opacity-50 cursor-not-allowed"}`}>
                      <input
                        type="checkbox"
                        checked={isAlreadyLinked}
                        onChange={() => isMyProcess && toggleProcessId(p.id)}
                        disabled={!isMyProcess}
                        className="rounded"
                      />
                      <span className="font-mono text-xs text-muted-foreground">{p.code}</span>
                      <span>{p.nom}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveIssue}>{editingIssue ? "Modifier" : "Ajouter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>{editingAction ? "Modifier l'action" : "Nouvelle action"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Description</Label><Textarea value={actionForm.description} onChange={e => setActionForm({ ...actionForm, description: e.target.value })} rows={2} /></div>
            <div className="space-y-1"><Label>Responsable</Label><Input value={actionForm.responsable} onChange={e => setActionForm({ ...actionForm, responsable: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Date de revue</Label><Input type="date" value={actionForm.date_revue} onChange={e => setActionForm({ ...actionForm, date_revue: e.target.value })} /></div>
              <div className="space-y-1">
                <Label>Statut</Label>
                <Select value={actionForm.statut} onValueChange={v => setActionForm({ ...actionForm, statut: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a_faire">À faire</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="termine">Terminé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSaveAction}>{editingAction ? "Modifier" : "Ajouter"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
