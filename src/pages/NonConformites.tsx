import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, XCircle, Pencil, ChevronRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type NC = {
  id: string; reference: string; description: string; gravite: string;
  statut: string; origine: string | null; date_detection: string;
  process_id: string | null; audit_id: string | null;
  nature_nc: string | null; criticite: number | null;
  cause_racine: string | null; correction_immediate: string | null;
  plan_action: string | null; verification_efficacite: string | null;
  resultats_actions: string | null;
};

type Audit = { id: string; reference: string };
type Process = { id: string; code: string; nom: string };

const graviteColors: Record<string, string> = {
  mineure: "bg-warning/20 text-warning",
  majeure: "bg-destructive/20 text-destructive",
  critique: "bg-destructive text-destructive-foreground",
};

const statusLabels: Record<string, string> = {
  ouverte: "Ouverte",
  correction: "Correction",
  analyse_cause: "Analyse cause",
  action_corrective: "Action corrective",
  en_traitement: "En traitement",
  verification: "Vérification",
  cloturee: "Clôturée",
};

const workflowSteps = [
  { key: "ouverte", label: "Détection" },
  { key: "correction", label: "Correction" },
  { key: "analyse_cause", label: "Analyse" },
  { key: "action_corrective", label: "Action" },
  { key: "verification", label: "Vérification" },
  { key: "cloturee", label: "Clôture" },
];

export default function NonConformites() {
  const { role } = useAuth();
  const [ncs, setNcs] = useState<NC[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailNC, setDetailNC] = useState<NC | null>(null);
  const [editNC, setEditNC] = useState<NC | null>(null);
  const [newNC, setNewNC] = useState({
    reference: "", description: "", gravite: "mineure", origine: "",
    nature_nc: "", audit_id: "", process_id: "", criticite: "",
  });

  const canCreate = role === "rmq" || role === "responsable_processus" || role === "auditeur" || role === "admin";
  const canEdit = role === "rmq" || role === "responsable_processus" || role === "admin";

  const fetchNCs = async () => {
    const { data } = await supabase.from("nonconformities").select("*").order("date_detection", { ascending: false });
    setNcs((data ?? []) as NC[]);
    setLoading(false);
  };

  const fetchAudits = async () => {
    const { data } = await supabase.from("audits").select("id, reference");
    setAudits((data ?? []) as Audit[]);
  };

  const fetchProcesses = async () => {
    const { data } = await supabase.from("processes").select("id, code, nom");
    setProcesses((data ?? []) as Process[]);
  };

  useEffect(() => { fetchNCs(); fetchAudits(); fetchProcesses(); }, []);

  const handleCreate = async () => {
    if (!newNC.reference || !newNC.description) { toast.error("Référence et description requises"); return; }
    const { error } = await supabase.from("nonconformities").insert({
      reference: newNC.reference,
      description: newNC.description,
      gravite: newNC.gravite as any,
      origine: newNC.origine || null,
      nature_nc: newNC.nature_nc || null,
      audit_id: newNC.audit_id || null,
      process_id: newNC.process_id || null,
      criticite: newNC.criticite ? parseInt(newNC.criticite) : null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Non-conformité enregistrée");
    setDialogOpen(false);
    setNewNC({ reference: "", description: "", gravite: "mineure", origine: "", nature_nc: "", audit_id: "", process_id: "", criticite: "" });
    fetchNCs();
  };

  const handleUpdate = async () => {
    if (!editNC) return;
    const { error } = await supabase.from("nonconformities").update({
      reference: editNC.reference,
      description: editNC.description,
      gravite: editNC.gravite as any,
      statut: editNC.statut as any,
      origine: editNC.origine,
      nature_nc: editNC.nature_nc,
      audit_id: editNC.audit_id,
      process_id: editNC.process_id,
      criticite: editNC.criticite,
      cause_racine: editNC.cause_racine,
      correction_immediate: editNC.correction_immediate,
      plan_action: editNC.plan_action,
      verification_efficacite: editNC.verification_efficacite,
      resultats_actions: editNC.resultats_actions,
    }).eq("id", editNC.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Non-conformité mise à jour");
    setEditNC(null);
    fetchNCs();
  };

  const getStepIndex = (statut: string) => {
    const idx = workflowSteps.findIndex(s => s.key === statut);
    if (statut === "en_traitement") return 3; // map to action_corrective
    return idx >= 0 ? idx : 0;
  };
  const getProgress = (statut: string) => ((getStepIndex(statut) + 1) / workflowSteps.length) * 100;

  const getAuditRef = (id: string | null) => id ? audits.find(a => a.id === id)?.reference ?? "—" : "—";
  const getProcessName = (id: string | null) => id ? processes.find(p => p.id === id)?.nom ?? "—" : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Non-conformités</h1>
          <p className="text-muted-foreground">Suivi des écarts qualité — workflow complet</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Enregistrer NC</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Enregistrer une non-conformité</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Référence *</Label><Input value={newNC.reference} onChange={(e) => setNewNC({ ...newNC, reference: e.target.value })} placeholder="NC-2026-001" /></div>
                  <div className="space-y-2">
                    <Label>Gravité</Label>
                    <Select value={newNC.gravite} onValueChange={(v) => setNewNC({ ...newNC, gravite: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mineure">Mineure</SelectItem>
                        <SelectItem value="majeure">Majeure</SelectItem>
                        <SelectItem value="critique">Critique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2"><Label>Description *</Label><Textarea value={newNC.description} onChange={(e) => setNewNC({ ...newNC, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nature de la NC</Label><Input value={newNC.nature_nc} onChange={(e) => setNewNC({ ...newNC, nature_nc: e.target.value })} placeholder="Produit, processus, système..." /></div>
                  <div className="space-y-2"><Label>Criticité (1-5)</Label><Input type="number" min={1} max={5} value={newNC.criticite} onChange={(e) => setNewNC({ ...newNC, criticite: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Origine</Label><Input value={newNC.origine} onChange={(e) => setNewNC({ ...newNC, origine: e.target.value })} placeholder="Audit, réclamation, interne..." /></div>
                  <div className="space-y-2">
                    <Label>Audit lié</Label>
                    <Select value={newNC.audit_id} onValueChange={(v) => setNewNC({ ...newNC, audit_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                      <SelectContent>
                        {audits.map(a => <SelectItem key={a.id} value={a.id}>{a.reference}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Processus concerné</Label>
                  <Select value={newNC.process_id} onValueChange={(v) => setNewNC({ ...newNC, process_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                    <SelectContent>
                      {processes.map(p => <SelectItem key={p.id} value={p.id}>{p.code} — {p.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} className="w-full">Enregistrer</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : ncs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune non-conformité</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {ncs.map((nc) => (
            <Card key={nc.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDetailNC(nc)}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium">{nc.reference}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {nc.nature_nc && `${nc.nature_nc} • `}{nc.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden md:block w-24">
                    <Progress value={getProgress(nc.statut)} className="h-2" />
                  </div>
                  <Badge className={graviteColors[nc.gravite] ?? ""}>{nc.gravite}</Badge>
                  {nc.criticite && <Badge variant="outline">C{nc.criticite}</Badge>}
                  <Badge variant="outline">{statusLabels[nc.statut] ?? nc.statut}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailNC} onOpenChange={(o) => !o && setDetailNC(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {detailNC && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive" /> {detailNC.reference}
                  </DialogTitle>
                  {canEdit && (
                    <Button variant="outline" size="sm" onClick={() => { setEditNC({ ...detailNC }); setDetailNC(null); }}>
                      <Pencil className="mr-2 h-4 w-4" /> Modifier
                    </Button>
                  )}
                </div>
              </DialogHeader>

              {/* Workflow Progress */}
              <div className="flex items-center gap-1 mb-4 flex-wrap">
                {workflowSteps.map((step, i) => {
                  const current = getStepIndex(detailNC.statut);
                  const done = i <= current;
                  return (
                    <div key={step.key} className="flex items-center gap-1">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${done ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {done ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-3 w-3 rounded-full border border-muted-foreground" />}
                        {step.label}
                      </div>
                      {i < workflowSteps.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                    </div>
                  );
                })}
              </div>

              <Tabs defaultValue="general">
                <TabsList className="w-full justify-start flex-wrap">
                  <TabsTrigger value="general">Général</TabsTrigger>
                  <TabsTrigger value="correction">Correction</TabsTrigger>
                  <TabsTrigger value="analyse">Analyse</TabsTrigger>
                  <TabsTrigger value="action">Action & Vérification</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="text-muted-foreground text-xs">Gravité</Label><p><Badge className={graviteColors[detailNC.gravite] ?? ""}>{detailNC.gravite}</Badge></p></div>
                    <div><Label className="text-muted-foreground text-xs">Criticité</Label><p className="font-medium">{detailNC.criticite ? `${detailNC.criticite}/5` : "—"}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Nature</Label><p className="font-medium">{detailNC.nature_nc ?? "—"}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Date détection</Label><p className="font-medium">{detailNC.date_detection}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Origine</Label><p className="font-medium">{detailNC.origine ?? "—"}</p></div>
                    <div><Label className="text-muted-foreground text-xs">Audit lié</Label><p className="font-medium">{getAuditRef(detailNC.audit_id)}</p></div>
                    <div className="col-span-2"><Label className="text-muted-foreground text-xs">Processus</Label><p className="font-medium">{getProcessName(detailNC.process_id)}</p></div>
                  </div>
                  <div><Label className="text-muted-foreground text-xs">Description</Label><p className="text-sm whitespace-pre-wrap">{detailNC.description}</p></div>
                </TabsContent>

                <TabsContent value="correction" className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Correction immédiate</Label>
                    <p className="text-sm whitespace-pre-wrap">{detailNC.correction_immediate || "Non renseignée"}</p>
                  </div>
                </TabsContent>

                <TabsContent value="analyse" className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Analyse de cause racine</Label>
                    <p className="text-sm whitespace-pre-wrap">{detailNC.cause_racine || "Non renseignée"}</p>
                  </div>
                </TabsContent>

                <TabsContent value="action" className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Plan d'action corrective</Label>
                    <p className="text-sm whitespace-pre-wrap">{detailNC.plan_action || "Non renseigné"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Vérification d'efficacité</Label>
                    <p className="text-sm whitespace-pre-wrap">{detailNC.verification_efficacite || "Non renseignée"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Résultats des actions correctives</Label>
                    <p className="text-sm whitespace-pre-wrap">{detailNC.resultats_actions || "Non renseignés"}</p>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editNC} onOpenChange={(o) => !o && setEditNC(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {editNC && (
            <>
              <DialogHeader><DialogTitle>Modifier {editNC.reference}</DialogTitle></DialogHeader>
              <Tabs defaultValue="general">
                <TabsList className="w-full justify-start flex-wrap">
                  <TabsTrigger value="general">Général</TabsTrigger>
                  <TabsTrigger value="correction">Correction</TabsTrigger>
                  <TabsTrigger value="analyse">Analyse</TabsTrigger>
                  <TabsTrigger value="action">Action & Vérification</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Référence</Label><Input value={editNC.reference} onChange={(e) => setEditNC({ ...editNC, reference: e.target.value })} /></div>
                    <div className="space-y-2">
                      <Label>Statut (workflow)</Label>
                      <Select value={editNC.statut} onValueChange={(v) => setEditNC({ ...editNC, statut: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ouverte">Ouverte</SelectItem>
                          <SelectItem value="correction">Correction immédiate</SelectItem>
                          <SelectItem value="analyse_cause">Analyse de cause</SelectItem>
                          <SelectItem value="action_corrective">Action corrective</SelectItem>
                          <SelectItem value="en_traitement">En traitement</SelectItem>
                          <SelectItem value="verification">Vérification efficacité</SelectItem>
                          <SelectItem value="cloturee">Clôturée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>Description</Label><Textarea value={editNC.description} onChange={(e) => setEditNC({ ...editNC, description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Gravité</Label>
                      <Select value={editNC.gravite} onValueChange={(v) => setEditNC({ ...editNC, gravite: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mineure">Mineure</SelectItem>
                          <SelectItem value="majeure">Majeure</SelectItem>
                          <SelectItem value="critique">Critique</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Criticité (1-5)</Label><Input type="number" min={1} max={5} value={editNC.criticite ?? ""} onChange={(e) => setEditNC({ ...editNC, criticite: e.target.value ? parseInt(e.target.value) : null })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Nature</Label><Input value={editNC.nature_nc ?? ""} onChange={(e) => setEditNC({ ...editNC, nature_nc: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Origine</Label><Input value={editNC.origine ?? ""} onChange={(e) => setEditNC({ ...editNC, origine: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Audit lié</Label>
                      <Select value={editNC.audit_id ?? ""} onValueChange={(v) => setEditNC({ ...editNC, audit_id: v || null })}>
                        <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                        <SelectContent>
                          {audits.map(a => <SelectItem key={a.id} value={a.id}>{a.reference}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Processus</Label>
                      <Select value={editNC.process_id ?? ""} onValueChange={(v) => setEditNC({ ...editNC, process_id: v || null })}>
                        <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
                        <SelectContent>
                          {processes.map(p => <SelectItem key={p.id} value={p.id}>{p.code} — {p.nom}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="correction" className="space-y-4">
                  <div className="space-y-2"><Label>Correction immédiate</Label><Textarea value={editNC.correction_immediate ?? ""} onChange={(e) => setEditNC({ ...editNC, correction_immediate: e.target.value })} rows={4} placeholder="Actions immédiates pour contenir le problème..." /></div>
                </TabsContent>

                <TabsContent value="analyse" className="space-y-4">
                  <div className="space-y-2"><Label>Analyse de cause racine</Label><Textarea value={editNC.cause_racine ?? ""} onChange={(e) => setEditNC({ ...editNC, cause_racine: e.target.value })} rows={5} placeholder="5 Pourquoi, Ishikawa, arbre des causes..." /></div>
                </TabsContent>

                <TabsContent value="action" className="space-y-4">
                  <div className="space-y-2"><Label>Plan d'action corrective</Label><Textarea value={editNC.plan_action ?? ""} onChange={(e) => setEditNC({ ...editNC, plan_action: e.target.value })} rows={4} placeholder="Actions correctives planifiées..." /></div>
                  <div className="space-y-2"><Label>Vérification d'efficacité</Label><Textarea value={editNC.verification_efficacite ?? ""} onChange={(e) => setEditNC({ ...editNC, verification_efficacite: e.target.value })} rows={3} placeholder="Critères et résultats de vérification..." /></div>
                  <div className="space-y-2"><Label>Résultats des actions correctives</Label><Textarea value={editNC.resultats_actions ?? ""} onChange={(e) => setEditNC({ ...editNC, resultats_actions: e.target.value })} rows={3} placeholder="Bilan et efficacité constatée..." /></div>
                </TabsContent>
              </Tabs>
              <Button onClick={handleUpdate} className="w-full mt-4">Enregistrer</Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
