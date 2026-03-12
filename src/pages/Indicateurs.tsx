import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, BarChart3, AlertTriangle, TrendingUp, ChevronLeft, Trash2, Pencil, Target, Activity, Gauge, Hash } from "lucide-react";
import { IndicatorMoyensActions } from "@/components/IndicatorMoyensActions";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Area, ComposedChart } from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { HelpTooltip } from "@/components/HelpTooltip";

type IndicatorType = "activite" | "resultat" | "perception" | "interne";
type Indicator = { id: string; nom: string; formule: string | null; unite: string | null; cible: number | null; seuil_alerte: number | null; frequence: string; process_id: string; type_indicateur: IndicatorType; moyens?: string | null };
type IndicatorValue = { id: string; indicator_id: string; valeur: number; date_mesure: string; commentaire: string | null; saisi_par: string | null; created_at: string };

const TYPE_CONFIG: Record<IndicatorType, { label: string; icon: React.ReactNode; color: string }> = {
  activite: { label: "Activité", icon: <Activity className="h-4 w-4" />, color: "bg-primary/10 text-primary border-primary/20" },
  resultat: { label: "Résultat", icon: <Target className="h-4 w-4" />, color: "bg-success/10 text-success border-success/20" },
  perception: { label: "Perception", icon: <Gauge className="h-4 w-4" />, color: "bg-accent/10 text-accent border-accent/20" },
  interne: { label: "Interne", icon: <Hash className="h-4 w-4" />, color: "bg-warning/10 text-warning border-warning/20" },
};

const TYPE_LABELS: Record<IndicatorType, string> = { activite: "Activité", resultat: "Résultat", perception: "Perception", interne: "Interne" };

export default function Indicateurs() {
  const { hasRole, hasPermission, user } = useAuth();
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [processes, setProcesses] = useState<{ id: string; nom: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newInd, setNewInd] = useState({ nom: "", formule: "", unite: "", cible: "", seuil_alerte: "", frequence: "mensuel", process_id: "", type_indicateur: "activite" as IndicatorType });

  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [values, setValues] = useState<IndicatorValue[]>([]);
  const [loadingValues, setLoadingValues] = useState(false);
  const [valueDialogOpen, setValueDialogOpen] = useState(false);
  const [newValue, setNewValue] = useState({ valeur: "", date_mesure: format(new Date(), "yyyy-MM-dd"), commentaire: "" });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editInd, setEditInd] = useState({ nom: "", formule: "", unite: "", cible: "", seuil_alerte: "", frequence: "mensuel", process_id: "", type_indicateur: "activite" as IndicatorType, moyens: "" });

  const [filterProcessId, setFilterProcessId] = useState<string>("all");
  const isOnlyActeur = hasRole("acteur") && !hasRole("admin") && !hasRole("rmq") && !hasRole("responsable_processus") && !hasRole("consultant");
  const canCreate = hasPermission("indicateurs", "can_edit");
  const canDelete = hasPermission("indicateurs", "can_delete");
  const isOnlyResponsable = hasRole("responsable_processus") && !hasRole("admin") && !hasRole("rmq");
  const [acteurProcessIds, setActeurProcessIds] = useState<string[]>([]);
  const [acteurIndicatorIds, setActeurIndicatorIds] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    let procQuery = supabase.from("processes").select("id, nom").order("nom");
    
    if (isOnlyActeur && user) {
      const { data: profileData } = await supabase.from("profiles").select("acteur_id").eq("id", user.id).single();
      const acteurId = profileData?.acteur_id;
      if (acteurId) {
        const { data: taskData } = await supabase.from("process_tasks").select("process_id").eq("responsable_id", acteurId);
        const processIds = [...new Set((taskData ?? []).map(t => t.process_id))];
        setActeurProcessIds(processIds);
        if (processIds.length > 0) {
          procQuery = procQuery.in("id", processIds);
        } else {
          setProcesses([]); setIndicators([]); setLoading(false); return;
        }
      } else {
        setProcesses([]); setIndicators([]); setLoading(false); return;
      }
    } else if (isOnlyResponsable && user) {
      procQuery = procQuery.eq("responsable_id", user.id);
    }
    const procRes = await procQuery;
    const myProcesses = procRes.data ?? [];
    setProcesses(myProcesses);

    let indQuery = supabase.from("indicators").select("*").order("nom");
    if ((isOnlyResponsable || isOnlyActeur) && myProcesses.length > 0) {
      indQuery = indQuery.in("process_id", myProcesses.map(p => p.id));
    } else if (isOnlyResponsable || isOnlyActeur) {
      indQuery = indQuery.in("process_id", ["__none__"]);
    }
    const indRes = await indQuery;
    const allIndicators = (indRes.data ?? []) as Indicator[];
    setIndicators(allIndicators);

    if (isOnlyActeur && user) {
      const { data: profileData } = await supabase.from("profiles").select("acteur_id").eq("id", user.id).single();
      const acteurId = profileData?.acteur_id;
      const indicatorIds = allIndicators.map(i => i.id);
      if (indicatorIds.length > 0 && acteurId) {
        const [actionsRes, moyensRes] = await Promise.all([
          supabase.from("indicator_actions").select("indicator_id").in("indicator_id", indicatorIds).eq("responsable", acteurId),
          supabase.from("indicator_moyens" as any).select("indicator_id").in("indicator_id", indicatorIds).eq("responsable", acteurId),
        ]);
        const ids = new Set<string>();
        (actionsRes.data ?? []).forEach((a: any) => ids.add(a.indicator_id));
        (moyensRes.data ?? []).forEach((m: any) => ids.add(m.indicator_id));
        setActeurIndicatorIds(ids);
      }
    }

    setLoading(false);
  };

  const fetchValues = useCallback(async (indicatorId: string) => {
    setLoadingValues(true);
    const { data } = await supabase
      .from("indicator_values")
      .select("*")
      .eq("indicator_id", indicatorId)
      .order("date_mesure", { ascending: true });
    setValues((data ?? []) as IndicatorValue[]);
    setLoadingValues(false);
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const indicatorId = searchParams.get("indicator");
    if (indicatorId && indicators.length > 0 && !selectedIndicator) {
      const found = indicators.find(i => i.id === indicatorId);
      if (found) {
        setSelectedIndicator(found);
        setSearchParams({}, { replace: true });
      }
    }
  }, [indicators, searchParams]);

  useEffect(() => {
    if (selectedIndicator) fetchValues(selectedIndicator.id);
  }, [selectedIndicator, fetchValues]);

  const handleCreate = async () => {
    if (!newInd.nom || !newInd.process_id) { toast.error("Nom et processus requis"); return; }
    const { error } = await supabase.from("indicators").insert({
      nom: newInd.nom, formule: newInd.formule || null, unite: newInd.unite || null,
      cible: newInd.cible ? Number(newInd.cible) : null, seuil_alerte: newInd.seuil_alerte ? Number(newInd.seuil_alerte) : null,
      frequence: newInd.frequence as any, process_id: newInd.process_id, type_indicateur: newInd.type_indicateur as any,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Indicateur créé");
    setDialogOpen(false);
    setNewInd({ nom: "", formule: "", unite: "", cible: "", seuil_alerte: "", frequence: "mensuel", process_id: "", type_indicateur: "activite" });
    fetchData();
  };

  const handleDeleteIndicator = async (id: string) => {
    await supabase.from("indicator_values").delete().eq("indicator_id", id);
    const { error } = await supabase.from("indicators").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Indicateur supprimé");
    setSelectedIndicator(null);
    fetchData();
  };

  const handleAddValue = async () => {
    if (!selectedIndicator || !newValue.valeur) { toast.error("Valeur requise"); return; }
    const { error } = await supabase.from("indicator_values").insert({
      indicator_id: selectedIndicator.id, valeur: Number(newValue.valeur),
      date_mesure: newValue.date_mesure, commentaire: newValue.commentaire || null,
      saisi_par: user?.id ?? null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Valeur enregistrée");
    setValueDialogOpen(false);
    setNewValue({ valeur: "", date_mesure: format(new Date(), "yyyy-MM-dd"), commentaire: "" });
    fetchValues(selectedIndicator.id);
  };

  const getProcessName = (id: string) => processes.find((p) => p.id === id)?.nom ?? "";

  const openEditDialog = (ind: Indicator) => {
    setEditInd({
      nom: ind.nom, formule: ind.formule ?? "", unite: ind.unite ?? "",
      cible: ind.cible != null ? String(ind.cible) : "", seuil_alerte: ind.seuil_alerte != null ? String(ind.seuil_alerte) : "",
      frequence: ind.frequence, process_id: ind.process_id, type_indicateur: ind.type_indicateur, moyens: (ind as any).moyens ?? "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedIndicator || !editInd.nom || !editInd.process_id) { toast.error("Nom et processus requis"); return; }
    const { error } = await supabase.from("indicators").update({
      nom: editInd.nom, formule: editInd.formule || null, unite: editInd.unite || null,
      cible: editInd.cible ? Number(editInd.cible) : null, seuil_alerte: editInd.seuil_alerte ? Number(editInd.seuil_alerte) : null,
      frequence: editInd.frequence as any, process_id: editInd.process_id, type_indicateur: editInd.type_indicateur as any,
    }).eq("id", selectedIndicator.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Indicateur mis à jour");
    setEditDialogOpen(false);
    const updated = { ...selectedIndicator, ...editInd, cible: editInd.cible ? Number(editInd.cible) : null, seuil_alerte: editInd.seuil_alerte ? Number(editInd.seuil_alerte) : null, formule: editInd.formule || null, unite: editInd.unite || null };
    setSelectedIndicator(updated as Indicator);
    fetchData();
  };

  const chartData = values.map((v) => ({
    date: format(new Date(v.date_mesure), "dd MMM yy", { locale: fr }),
    valeur: v.valeur,
    commentaire: v.commentaire,
  }));

  const lastValue = values.length > 0 ? values[values.length - 1].valeur : null;

  // ════════════════════════════════════════════
  //  DETAIL VIEW
  // ════════════════════════════════════════════
  if (selectedIndicator) {
    const isAlert = selectedIndicator.seuil_alerte != null && lastValue != null && lastValue < selectedIndicator.seuil_alerte;
    const isAboveTarget = selectedIndicator.cible != null && lastValue != null && lastValue >= selectedIndicator.cible;
    const typeConf = TYPE_CONFIG[selectedIndicator.type_indicateur];

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 via-card to-accent/5 border border-border/50 p-6" style={{ boxShadow: 'var(--shadow-md)' }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-primary/5 -translate-y-1/2 translate-x-1/4" />
          <div className="relative flex items-start gap-4">
            <Button variant="ghost" size="icon" className="shrink-0 mt-1 hover:bg-primary/10" onClick={() => setSelectedIndicator(null)}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border", typeConf.color)}>
                  {typeConf.icon} {typeConf.label}
                </span>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-md">{selectedIndicator.frequence}</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{selectedIndicator.nom}</h1>
              <p className="text-sm text-muted-foreground mt-1">{getProcessName(selectedIndicator.process_id)}</p>
            </div>
            {canCreate && (
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(selectedIndicator)} className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Button>
                <Dialog open={valueDialogOpen} onOpenChange={setValueDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> Saisir une valeur</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Nouvelle mesure</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Valeur {selectedIndicator.unite ? `(${selectedIndicator.unite})` : ""}</Label>
                        <Input type="number" value={newValue.valeur} onChange={(e) => setNewValue({ ...newValue, valeur: e.target.value })} placeholder="0" />
                      </div>
                      <div className="space-y-2">
                        <Label>Date de mesure</Label>
                        <Input type="date" value={newValue.date_mesure} onChange={(e) => setNewValue({ ...newValue, date_mesure: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Commentaire</Label>
                        <Textarea value={newValue.commentaire} onChange={(e) => setNewValue({ ...newValue, commentaire: e.target.value })} placeholder="Optionnel" rows={2} />
                      </div>
                      <Button onClick={handleAddValue} className="w-full">Enregistrer</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>

        {/* Edit indicator dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Modifier l'indicateur</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nom</Label><Input value={editInd.nom} onChange={(e) => setEditInd({ ...editInd, nom: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Type d'indicateur</Label>
                <Select value={editInd.type_indicateur} onValueChange={(v) => setEditInd({ ...editInd, type_indicateur: v as IndicatorType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(TYPE_LABELS) as [IndicatorType, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Processus</Label>
                <Select value={editInd.process_id} onValueChange={(v) => setEditInd({ ...editInd, process_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                  <SelectContent>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Cible</Label><Input type="number" value={editInd.cible} onChange={(e) => setEditInd({ ...editInd, cible: e.target.value })} /></div>
                <div className="space-y-2"><Label>Seuil d'alerte</Label><Input type="number" value={editInd.seuil_alerte} onChange={(e) => setEditInd({ ...editInd, seuil_alerte: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Unité</Label><Input value={editInd.unite} onChange={(e) => setEditInd({ ...editInd, unite: e.target.value })} placeholder="%" /></div>
                <div className="space-y-2"><Label>Formule</Label><Input value={editInd.formule} onChange={(e) => setEditInd({ ...editInd, formule: e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <Label>Fréquence</Label>
                <Select value={editInd.frequence} onValueChange={(v) => setEditInd({ ...editInd, frequence: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quotidien">Quotidien</SelectItem>
                    <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                    <SelectItem value="mensuel">Mensuel</SelectItem>
                    <SelectItem value="trimestriel">Trimestriel</SelectItem>
                    <SelectItem value="semestriel">Semestriel</SelectItem>
                    <SelectItem value="annuel">Annuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpdate} className="w-full">Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* KPI Cards */}
        {!isOnlyActeur && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Dernière valeur</p>
              <div className="flex items-baseline gap-1.5">
                <p className={cn("text-3xl font-bold tracking-tight", isAlert ? "text-destructive" : isAboveTarget ? "text-success" : "text-foreground")}>
                  {lastValue != null ? lastValue : "—"}
                </p>
                <span className="text-sm text-muted-foreground">{selectedIndicator.unite}</span>
              </div>
              {isAlert && <div className="flex items-center gap-1 mt-1.5"><span className="status-dot-danger" /><span className="text-[11px] text-destructive font-medium">Sous le seuil</span></div>}
              {isAboveTarget && <div className="flex items-center gap-1 mt-1.5"><span className="status-dot-active" /><span className="text-[11px] text-success font-medium">Objectif atteint</span></div>}
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Cible</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-bold tracking-tight text-primary">{selectedIndicator.cible ?? "—"}</p>
                <span className="text-sm text-muted-foreground">{selectedIndicator.unite}</span>
              </div>
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Seuil d'alerte</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-3xl font-bold tracking-tight text-warning">{selectedIndicator.seuil_alerte ?? "—"}</p>
                <span className="text-sm text-muted-foreground">{selectedIndicator.unite}</span>
              </div>
            </div>
            <div className="stat-card">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Nb mesures</p>
              <p className="text-3xl font-bold tracking-tight">{values.length}</p>
            </div>
          </div>
        )}

        {/* Moyens & Actions */}
        <IndicatorMoyensActions indicatorId={selectedIndicator.id} moyens={null} canEdit={canCreate} onMoyensUpdate={() => {}} />

        {/* Chart */}
        {!isOnlyActeur && (
          <Card className="card-elevated border-border/50 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="section-header text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Historique des valeurs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingValues ? (
                <div className="flex justify-center py-16">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                </div>
              ) : chartData.length === 0 ? (
                <div className="text-center py-16">
                  <BarChart3 className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground">Aucune mesure enregistrée</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 13, boxShadow: 'var(--shadow-lg)' }}
                      labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                      formatter={(value: number, _name: string, props: any) => {
                        const comment = props.payload?.commentaire;
                        return [
                          <span key="v">{value} {selectedIndicator.unite}{comment ? ` — ${comment}` : ""}</span>,
                          "Valeur",
                        ];
                      }}
                    />
                    <Area type="monotone" dataKey="valeur" fill="url(#colorVal)" stroke="none" />
                    <Line type="monotone" dataKey="valeur" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--card))" }} activeDot={{ r: 6 }} />
                    {selectedIndicator.cible != null && (
                      <ReferenceLine y={selectedIndicator.cible} stroke="hsl(var(--primary))" strokeDasharray="6 3" label={{ value: "Cible", position: "right", fontSize: 11, fill: "hsl(var(--primary))" }} />
                    )}
                    {selectedIndicator.seuil_alerte != null && (
                      <ReferenceLine y={selectedIndicator.seuil_alerte} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: "Seuil", position: "right", fontSize: 11, fill: "hsl(var(--destructive))" }} />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* Values table */}
        {!isOnlyActeur && values.length > 0 && (
          <Card className="card-elevated border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="section-header text-base">Historique détaillé</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="pb-3 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Valeur</th>
                      <th className="pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Commentaire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...values].reverse().map((v) => {
                      const belowAlert = selectedIndicator.seuil_alerte != null && v.valeur < selectedIndicator.seuil_alerte;
                      return (
                        <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="py-3 pr-4">{format(new Date(v.date_mesure), "dd/MM/yyyy")}</td>
                          <td className={cn("py-3 pr-4 font-semibold", belowAlert ? "text-destructive" : "")}>
                            {v.valeur} {selectedIndicator.unite}
                            {belowAlert && <AlertTriangle className="inline ml-1 h-3 w-3" />}
                          </td>
                          <td className="py-3 text-muted-foreground">{v.commentaire ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════
  //  LIST VIEW
  // ════════════════════════════════════════════
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Indicateurs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Suivi de la performance des processus</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button className="gap-1.5"><Plus className="h-4 w-4" /> Nouvel indicateur</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer un indicateur</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Nom</Label><Input value={newInd.nom} onChange={(e) => setNewInd({ ...newInd, nom: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Type d'indicateur</Label>
                  <Select value={newInd.type_indicateur} onValueChange={(v) => setNewInd({ ...newInd, type_indicateur: v as IndicatorType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(TYPE_LABELS) as [IndicatorType, string][]).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Processus</Label>
                  <Select value={newInd.process_id} onValueChange={(v) => setNewInd({ ...newInd, process_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Cible</Label><Input type="number" value={newInd.cible} onChange={(e) => setNewInd({ ...newInd, cible: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Seuil d'alerte</Label><Input type="number" value={newInd.seuil_alerte} onChange={(e) => setNewInd({ ...newInd, seuil_alerte: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Unité</Label><Input value={newInd.unite} onChange={(e) => setNewInd({ ...newInd, unite: e.target.value })} placeholder="%" /></div>
                  <div className="space-y-2"><Label>Formule</Label><Input value={newInd.formule} onChange={(e) => setNewInd({ ...newInd, formule: e.target.value })} /></div>
                </div>
                <Button onClick={handleCreate} className="w-full">Créer</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm whitespace-nowrap text-muted-foreground">Filtrer par processus</Label>
        <Select value={filterProcessId} onValueChange={setFilterProcessId}>
          <SelectTrigger className="w-[250px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les processus</SelectItem>
            {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Chargement…</p>
          </div>
        </div>
      ) : indicators.filter((ind) => filterProcessId === "all" || ind.process_id === filterProcessId).length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Aucun indicateur défini</p>
          <p className="text-sm text-muted-foreground mt-1">Créez votre premier indicateur pour commencer le suivi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {indicators.filter((ind) => filterProcessId === "all" || ind.process_id === filterProcessId).map((ind) => {
            const acteurCanAccessDetail = !isOnlyActeur || acteurIndicatorIds.has(ind.id);
            const typeConf = TYPE_CONFIG[ind.type_indicateur];
            return (
              <div
                key={ind.id}
                className={cn(
                  "group relative rounded-xl border bg-card p-5 transition-all duration-200",
                  acteurCanAccessDetail
                    ? "cursor-pointer hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5"
                    : "opacity-70",
                )}
                style={{ boxShadow: 'var(--shadow-sm)' }}
                onClick={() => {
                  if (acteurCanAccessDetail) setSelectedIndicator(ind);
                  else if (isOnlyActeur) toast.info("Vous n'êtes responsable d'aucune action/moyen sur cet indicateur");
                }}
              >
                {/* Type badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md border", typeConf.color)}>
                    {typeConf.icon} {typeConf.label}
                  </span>
                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cet indicateur ?</AlertDialogTitle>
                          <AlertDialogDescription>Cette action supprimera l'indicateur « {ind.nom} » et tout son historique de valeurs.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteIndicator(ind.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                {/* Name */}
                <h3 className="font-semibold text-foreground text-sm leading-snug mb-2 line-clamp-2">{ind.nom}</h3>

                {/* Process name */}
                <p className="text-xs text-muted-foreground mb-3 truncate">{getProcessName(ind.process_id)}</p>

                {/* Metrics row */}
                <div className="flex items-center gap-3 pt-3 border-t border-border/50">
                  {ind.cible != null && (
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3 text-primary" />
                      <span className="text-xs font-medium text-primary">{ind.cible}{ind.unite ? ` ${ind.unite}` : ""}</span>
                    </div>
                  )}
                  {ind.seuil_alerte != null && (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-warning" />
                      <span className="text-xs font-medium text-warning">{ind.seuil_alerte}{ind.unite ? ` ${ind.unite}` : ""}</span>
                    </div>
                  )}
                  <span className="text-[11px] text-muted-foreground ml-auto">{ind.frequence}</span>
                </div>

                {/* Hover arrow */}
                {acteurCanAccessDetail && (
                  <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-primary font-medium">→</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
