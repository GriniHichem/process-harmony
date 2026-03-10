import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, BarChart3, AlertTriangle, TrendingUp, ChevronLeft, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Area, ComposedChart } from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type IndicatorType = "activite" | "resultat" | "perception" | "interne";
type Indicator = { id: string; nom: string; formule: string | null; unite: string | null; cible: number | null; seuil_alerte: number | null; frequence: string; process_id: string; type_indicateur: IndicatorType };
type IndicatorValue = { id: string; indicator_id: string; valeur: number; date_mesure: string; commentaire: string | null; saisi_par: string | null; created_at: string };

const TYPE_LABELS: Record<IndicatorType, string> = { activite: "Activité", resultat: "Résultat", perception: "Perception", interne: "Interne" };

export default function Indicateurs() {
  const { role, user } = useAuth();
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [processes, setProcesses] = useState<{ id: string; nom: string }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newInd, setNewInd] = useState({ nom: "", formule: "", unite: "", cible: "", seuil_alerte: "", frequence: "mensuel", process_id: "", type_indicateur: "activite" as IndicatorType });

  // Detail view state
  const [selectedIndicator, setSelectedIndicator] = useState<Indicator | null>(null);
  const [values, setValues] = useState<IndicatorValue[]>([]);
  const [loadingValues, setLoadingValues] = useState(false);
  const [valueDialogOpen, setValueDialogOpen] = useState(false);
  const [newValue, setNewValue] = useState({ valeur: "", date_mesure: format(new Date(), "yyyy-MM-dd"), commentaire: "" });

  const [filterProcessId, setFilterProcessId] = useState<string>("all");
  const canCreate = role === "admin" || role === "rmq" || role === "responsable_processus";
  const canDelete = role === "admin" || role === "rmq";

  const fetchData = async () => {
    const [indRes, procRes] = await Promise.all([
      supabase.from("indicators").select("*").order("nom"),
      supabase.from("processes").select("id, nom").order("nom"),
    ]);
    setIndicators((indRes.data ?? []) as Indicator[]);
    setProcesses(procRes.data ?? []);
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

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (selectedIndicator) fetchValues(selectedIndicator.id);
  }, [selectedIndicator, fetchValues]);

  const handleCreate = async () => {
    if (!newInd.nom || !newInd.process_id) { toast.error("Nom et processus requis"); return; }
    const { error } = await supabase.from("indicators").insert({
      nom: newInd.nom,
      formule: newInd.formule || null,
      unite: newInd.unite || null,
      cible: newInd.cible ? Number(newInd.cible) : null,
      seuil_alerte: newInd.seuil_alerte ? Number(newInd.seuil_alerte) : null,
      frequence: newInd.frequence as any,
      process_id: newInd.process_id,
      type_indicateur: newInd.type_indicateur as any,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Indicateur créé");
    setDialogOpen(false);
    setNewInd({ nom: "", formule: "", unite: "", cible: "", seuil_alerte: "", frequence: "mensuel", process_id: "", type_indicateur: "activite" });
    fetchData();
  };

  const handleAddValue = async () => {
    if (!selectedIndicator || !newValue.valeur) { toast.error("Valeur requise"); return; }
    const { error } = await supabase.from("indicator_values").insert({
      indicator_id: selectedIndicator.id,
      valeur: Number(newValue.valeur),
      date_mesure: newValue.date_mesure,
      commentaire: newValue.commentaire || null,
      saisi_par: user?.id ?? null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Valeur enregistrée");
    setValueDialogOpen(false);
    setNewValue({ valeur: "", date_mesure: format(new Date(), "yyyy-MM-dd"), commentaire: "" });
    fetchValues(selectedIndicator.id);
  };

  const getProcessName = (id: string) => processes.find((p) => p.id === id)?.nom ?? "";

  const chartData = values.map((v) => ({
    date: format(new Date(v.date_mesure), "dd MMM yy", { locale: fr }),
    valeur: v.valeur,
    commentaire: v.commentaire,
  }));

  const lastValue = values.length > 0 ? values[values.length - 1].valeur : null;

  // Detail view for a selected indicator
  if (selectedIndicator) {
    const isAlert = selectedIndicator.seuil_alerte != null && lastValue != null && lastValue < selectedIndicator.seuil_alerte;
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedIndicator(null)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              {selectedIndicator.nom}
            </h1>
            <p className="text-muted-foreground text-sm">
              {getProcessName(selectedIndicator.process_id)} · {TYPE_LABELS[selectedIndicator.type_indicateur]} · {selectedIndicator.frequence}
            </p>
          </div>
          {canCreate && (
            <Dialog open={valueDialogOpen} onOpenChange={setValueDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Saisir une valeur</Button>
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
          )}
        </div>

        {/* KPI summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Dernière valeur</p>
              <p className={`text-2xl font-bold ${isAlert ? "text-destructive" : "text-foreground"}`}>
                {lastValue != null ? lastValue : "—"} {selectedIndicator.unite}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Cible</p>
              <p className="text-2xl font-bold text-primary">{selectedIndicator.cible ?? "—"} {selectedIndicator.unite}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Seuil d'alerte</p>
              <p className="text-2xl font-bold text-warning">{selectedIndicator.seuil_alerte ?? "—"} {selectedIndicator.unite}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">Nb mesures</p>
              <p className="text-2xl font-bold">{values.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Historique des valeurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingValues ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
            ) : chartData.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">Aucune mesure enregistrée</p>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 13 }}
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
                  <Line type="monotone" dataKey="valeur" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6 }} />
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

        {/* Values table */}
        {values.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historique détaillé</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 pr-4">Valeur</th>
                      <th className="pb-2">Commentaire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...values].reverse().map((v) => {
                      const belowAlert = selectedIndicator.seuil_alerte != null && v.valeur < selectedIndicator.seuil_alerte;
                      return (
                        <tr key={v.id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{format(new Date(v.date_mesure), "dd/MM/yyyy")}</td>
                          <td className={`py-2 pr-4 font-medium ${belowAlert ? "text-destructive" : ""}`}>
                            {v.valeur} {selectedIndicator.unite}
                            {belowAlert && <AlertTriangle className="inline ml-1 h-3 w-3" />}
                          </td>
                          <td className="py-2 text-muted-foreground">{v.commentaire ?? "—"}</td>
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

  // List view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Indicateurs</h1>
          <p className="text-muted-foreground">Suivi de la performance des processus</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nouvel indicateur</Button></DialogTrigger>
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
        <Label className="text-sm whitespace-nowrap">Filtrer par processus</Label>
        <Select value={filterProcessId} onValueChange={setFilterProcessId}>
          <SelectTrigger className="w-[250px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les processus</SelectItem>
            {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : indicators.filter((ind) => filterProcessId === "all" || ind.process_id === filterProcessId).length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun indicateur défini</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {indicators.filter((ind) => filterProcessId === "all" || ind.process_id === filterProcessId).map((ind) => (
            <Card key={ind.id} className="cursor-pointer hover:ring-2 hover:ring-primary/30 transition-shadow" onClick={() => setSelectedIndicator(ind)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  {ind.nom}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Processus : {getProcessName(ind.process_id)}</p>
                  <p>Type : <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-primary font-medium">{TYPE_LABELS[ind.type_indicateur] ?? ind.type_indicateur}</span></p>
                  {ind.cible != null && <p>Cible : {ind.cible} {ind.unite}</p>}
                  {ind.seuil_alerte != null && <p className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-warning" /> Seuil : {ind.seuil_alerte} {ind.unite}</p>}
                  <p>Fréquence : {ind.frequence}</p>
                </div>
                <p className="mt-2 text-xs text-primary font-medium">Cliquer pour voir l'historique →</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
