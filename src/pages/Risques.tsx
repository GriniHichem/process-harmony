import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Plus, AlertTriangle, Lightbulb, Trash2, ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { RiskMoyensActions } from "@/components/RiskMoyensActions";
import { RiskIncidents } from "@/components/RiskIncidents";
import { HelpTooltip } from "@/components/HelpTooltip";

type Risk = {
  id: string;
  type: "risque" | "opportunite";
  description: string;
  probabilite: number | null;
  impact: number | null;
  criticite: number | null;
  faisabilite: number | null;
  statut: string;
  process_id: string;
};

// --- Classification helpers ---

const classifyRisk = (r: Risk): { label: string; badgeClass: string } => {
  const score = r.criticite ?? 0;
  const p = r.probabilite ?? 0;
  const g = r.impact ?? 0;
  if (score >= 10 || p === 5 || g === 4) {
    return { label: "Majeur", badgeClass: "bg-destructive/10 text-destructive border-destructive/30" };
  }
  if (score >= 4) {
    return { label: "Modéré", badgeClass: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700" };
  }
  return { label: "Acceptable", badgeClass: "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700" };
};

const classifyOpportunity = (r: Risk): { label: string; badgeClass: string } => {
  const score = r.criticite ?? 0;
  if (score >= 12) {
    return { label: "Prioritaire", badgeClass: "bg-primary/10 text-primary border-primary/30" };
  }
  if (score >= 6) {
    return { label: "Intéressante", badgeClass: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700" };
  }
  return { label: "Faible / à surveiller", badgeClass: "bg-muted text-muted-foreground border-border" };
};

const getOpportunityScore = (r: Risk) => r.criticite ?? 0;

export default function Risques() {
  const { hasRole, hasPermission, user } = useAuth();
  const [risks, setRisks] = useState<Risk[]>([]);
  const [processes, setProcesses] = useState<{id: string; nom: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRisk, setNewRisk] = useState({ type: "risque" as "risque" | "opportunite", description: "", probabilite: "3", impact: "3", faisabilite: "3", process_id: "" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterProcessId, setFilterProcessId] = useState<string>("all");

  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editRisk, setEditRisk] = useState<{ id: string; type: string; description: string; probabilite: string; impact: string; faisabilite: string; process_id: string } | null>(null);

  const isOnlyActeur = hasRole("acteur") && !hasRole("admin") && !hasRole("rmq") && !hasRole("responsable_processus") && !hasRole("consultant");
  const canCreate = hasPermission("risques", "can_edit");
  const canDelete = hasPermission("risques", "can_delete");
  const canEditActions = hasPermission("risques", "can_edit");
  const isOnlyResponsable = hasRole("responsable_processus") && !hasRole("admin") && !hasRole("rmq");
  const [acteurRiskIds, setActeurRiskIds] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    let processQuery = supabase.from("processes").select("id, nom").order("nom");
    if (isOnlyActeur && user) {
      const { data: profileData } = await supabase.from("profiles").select("acteur_id").eq("id", user.id).single();
      const acteurId = profileData?.acteur_id;
      if (acteurId) {
        const { data: taskData } = await supabase.from("process_tasks").select("process_id").eq("responsable_id", acteurId);
        const processIds = [...new Set((taskData ?? []).map(t => t.process_id))];
        if (processIds.length > 0) {
          processQuery = processQuery.in("id", processIds);
        } else {
          setProcesses([]); setRisks([]); setLoading(false); return;
        }
      } else {
        setProcesses([]); setRisks([]); setLoading(false); return;
      }
    } else if (isOnlyResponsable && user) {
      processQuery = processQuery.eq("responsable_id", user.id);
    }
    const pRes = await processQuery;
    const myProcesses = pRes.data ?? [];
    setProcesses(myProcesses);

    let riskQuery = supabase.from("risks_opportunities").select("*").order("criticite", { ascending: false });
    if ((isOnlyResponsable || isOnlyActeur) && myProcesses.length > 0) {
      riskQuery = riskQuery.in("process_id", myProcesses.map(p => p.id));
    } else if (isOnlyResponsable || isOnlyActeur) {
      riskQuery = riskQuery.in("process_id", ["__none__"]);
    }
    const rRes = await riskQuery;
    const allRisks = (rRes.data ?? []) as Risk[];
    setRisks(allRisks);

    if (isOnlyActeur && user) {
      const { data: profileData } = await supabase.from("profiles").select("acteur_id").eq("id", user.id).single();
      const acteurId = profileData?.acteur_id;
      const riskIds = allRisks.map(r => r.id);
      if (riskIds.length > 0 && acteurId) {
        const [actionsRes, moyensRes] = await Promise.all([
          supabase.from("risk_actions").select("risk_id").in("risk_id", riskIds).eq("responsable", acteurId),
          supabase.from("risk_moyens").select("risk_id").in("risk_id", riskIds).eq("responsable", acteurId),
        ]);
        const ids = new Set<string>();
        (actionsRes.data ?? []).forEach((a: any) => ids.add(a.risk_id));
        (moyensRes.data ?? []).forEach((m: any) => ids.add(m.risk_id));
        setActeurRiskIds(ids);
      }
    }

    setLoading(false);
  };

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const riskId = searchParams.get("risk");
    if (riskId && risks.length > 0 && !expandedId) {
      if (risks.find(r => r.id === riskId)) {
        setExpandedId(riskId);
        setSearchParams({}, { replace: true });
      }
    }
  }, [risks, searchParams]);

  const handleCreate = async () => {
    if (!newRisk.description || !newRisk.process_id) { toast.error("Description et processus requis"); return; }
    const isOpp = newRisk.type === "opportunite";
    const impactVal = Number(newRisk.impact);
    const insertData: any = {
      type: newRisk.type,
      description: newRisk.description,
      process_id: newRisk.process_id,
      impact: impactVal,
    };
    if (isOpp) {
      const faisVal = Number(newRisk.faisabilite);
      insertData.faisabilite = faisVal;
      // criticite is a generated column (probabilite * impact), so for opportunities
      // we store faisabilite in probabilite to leverage the auto-computed score
      insertData.probabilite = faisVal;
    } else {
      insertData.probabilite = Number(newRisk.probabilite);
      insertData.faisabilite = null;
    }
    const { error } = await supabase.from("risks_opportunities").insert(insertData);
    if (error) { toast.error(error.message); return; }
    toast.success("Élément ajouté");
    setDialogOpen(false);
    setNewRisk({ type: "risque", description: "", probabilite: "3", impact: "3", faisabilite: "3", process_id: "" });
    fetchData();
  };

  const handleEdit = (r: Risk) => {
    setEditRisk({
      id: r.id,
      type: r.type,
      description: r.description,
      probabilite: String(r.probabilite ?? 3),
      impact: String(r.impact ?? 3),
      faisabilite: String(r.faisabilite ?? 3),
      process_id: r.process_id,
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editRisk) return;
    if (!editRisk.description || !editRisk.process_id) { toast.error("Description et processus requis"); return; }
    const isOpp = editRisk.type === "opportunite";
    const impactVal = Number(editRisk.impact);
    const updateData: any = {
      type: editRisk.type as any,
      description: editRisk.description,
      process_id: editRisk.process_id,
      impact: impactVal,
    };
    if (isOpp) {
      const faisVal = Number(editRisk.faisabilite);
      updateData.faisabilite = faisVal;
      updateData.probabilite = faisVal;
    } else {
      updateData.probabilite = Number(editRisk.probabilite);
      updateData.faisabilite = null;
    }
    const { error } = await supabase.from("risks_opportunities").update(updateData).eq("id", editRisk.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Élément modifié");
    setEditDialogOpen(false);
    setEditRisk(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("risks_opportunities").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Élément supprimé");
    if (expandedId === id) setExpandedId(null);
    fetchData();
  };

  const filteredRisks = risks.filter((r) => filterProcessId === "all" || r.process_id === filterProcessId);

  // --- Form fields renderer ---
  const renderFormFields = (type: string, values: { probabilite: string; impact: string; faisabilite: string }, onChange: (field: string, value: string) => void) => {
    if (type === "opportunite") {
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Impact positif (1-5)</Label>
            <Input type="number" min="1" max="5" value={values.impact} onChange={(e) => onChange("impact", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Faisabilité (1-5)</Label>
            <Input type="number" min="1" max="5" value={values.faisabilite} onChange={(e) => onChange("faisabilite", e.target.value)} />
          </div>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Probabilité (1-5)</Label>
          <Input type="number" min="1" max="5" value={values.probabilite} onChange={(e) => onChange("probabilite", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Gravité (1-4)</Label>
          <Input type="number" min="1" max="4" value={values.impact} onChange={(e) => onChange("impact", e.target.value)} />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">Risques & Opportunités <HelpTooltip term="risques_opportunites" /></h1>
          <p className="text-muted-foreground">Évaluation par processus — cliquez pour voir les actions & moyens</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Ajouter</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ajouter un risque / opportunité</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newRisk.type} onValueChange={(v: any) => setNewRisk({ ...newRisk, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="risque">Risque</SelectItem>
                      <SelectItem value="opportunite">Opportunité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={newRisk.description} onChange={(e) => setNewRisk({ ...newRisk, description: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Processus</Label>
                  <Select value={newRisk.process_id} onValueChange={(v) => setNewRisk({ ...newRisk, process_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {renderFormFields(newRisk.type, newRisk, (field, value) => setNewRisk({ ...newRisk, [field]: value }))}
                <Button onClick={handleCreate} className="w-full">Ajouter</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <Label className="text-sm whitespace-nowrap">Filtrer par processus</Label>
          <Select value={filterProcessId} onValueChange={setFilterProcessId}>
            <SelectTrigger className="w-[250px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les processus</SelectItem>
              {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2 text-xs ml-auto">
          <div className="flex items-center gap-3">
            <span className="font-medium text-muted-foreground">Risques :</span>
            <Badge className="border bg-destructive/10 text-destructive border-destructive/30">Majeur (≥10 ou P=5 ou G=4)</Badge>
            <Badge className="border bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700">Modéré (4–9)</Badge>
            <Badge className="border bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700">Acceptable (≤3)</Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-medium text-muted-foreground">Opportunités :</span>
            <Badge className="border bg-primary/10 text-primary border-primary/30">Prioritaire (≥12)</Badge>
            <Badge className="border bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700">Intéressante (6–11)</Badge>
            <Badge className="border bg-muted text-muted-foreground border-border">Faible (≤5)</Badge>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filteredRisks.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun risque ou opportunité identifié</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filteredRisks.map((r) => {
            const isExpanded = expandedId === r.id;
            const isOpp = r.type === "opportunite";
            const cls = isOpp ? classifyOpportunity(r) : classifyRisk(r);
            const scoreDisplay = isOpp
              ? `I:${r.impact ?? 0} × F:${r.faisabilite ?? 0} = ${getOpportunityScore(r)}`
              : `P:${r.probabilite ?? 0} × G:${r.impact ?? 0} = ${r.criticite ?? "-"}`;
            const scoreValue = isOpp ? getOpportunityScore(r) : (r.criticite ?? "-");

            return (
              <Card key={r.id} className={`transition-shadow ${isExpanded ? "ring-2 ring-primary/30 shadow-md" : ""}`}>
                <CardContent className="py-4">
                  <div
                    className={`flex items-center justify-between ${(!isOnlyActeur || acteurRiskIds.has(r.id)) ? "cursor-pointer" : ""}`}
                    onClick={() => {
                      if (isOnlyActeur && !acteurRiskIds.has(r.id)) return;
                      setExpandedId(isExpanded ? null : r.id);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      {isOpp ? <Lightbulb className="h-5 w-5 text-primary" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
                      <div>
                        <p className="font-medium">{r.description}</p>
                        <p className="text-xs text-muted-foreground">{scoreDisplay}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={`border ${cls.badgeClass}`}>{cls.label} ({scoreValue})</Badge>
                      <Badge variant={isOpp ? "secondary" : "destructive"}>{r.type}</Badge>
                      {canCreate && (
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary" onClick={(e) => { e.stopPropagation(); handleEdit(r); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cet élément ?</AlertDialogTitle>
                              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-4 border-t pt-4 space-y-6">
                      <RiskMoyensActions riskId={r.id} canEdit={canEditActions} />
                      <div className="border-t pt-4">
                        <RiskIncidents riskId={r.id} canEdit={canEditActions} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditRisk(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier le risque / opportunité</DialogTitle></DialogHeader>
          {editRisk && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={editRisk.type} onValueChange={(v) => setEditRisk({ ...editRisk, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="risque">Risque</SelectItem>
                    <SelectItem value="opportunite">Opportunité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={editRisk.description} onChange={(e) => setEditRisk({ ...editRisk, description: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Processus</Label>
                <Select value={editRisk.process_id} onValueChange={(v) => setEditRisk({ ...editRisk, process_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {renderFormFields(editRisk.type, editRisk, (field, value) => setEditRisk({ ...editRisk, [field]: value }))}
              <Button onClick={handleUpdate} className="w-full">Enregistrer</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
