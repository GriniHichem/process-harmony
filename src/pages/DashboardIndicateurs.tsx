import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, BarChart3, AlertTriangle, TrendingUp, Target } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Indicator = {
  id: string; nom: string; formule: string | null; unite: string | null;
  cible: number | null; seuil_alerte: number | null; frequence: string;
  process_id: string; type_indicateur: string; moyens?: string | null;
};
type IndValue = { id: string; indicator_id: string; valeur: number; date_mesure: string; commentaire: string | null };
type Process = { id: string; nom: string };

const TYPE_LABELS: Record<string, string> = { activite: "Activité", resultat: "Résultat", perception: "Perception", interne: "Interne" };
const FREQ_LABELS: Record<string, string> = { quotidien: "Quotidien", hebdomadaire: "Hebdomadaire", mensuel: "Mensuel", trimestriel: "Trimestriel", semestriel: "Semestriel", annuel: "Annuel" };

export default function DashboardIndicateurs() {
  const { hasRole, user } = useAuth();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [allValues, setAllValues] = useState<IndValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProcessId, setFilterProcessId] = useState("all");

  const isOnlyActeur = hasRole("acteur") && !hasRole("admin") && !hasRole("rmq") && !hasRole("responsable_processus") && !hasRole("consultant") && !hasRole("super_admin");
  const isOnlyResponsable = hasRole("responsable_processus") && !hasRole("admin") && !hasRole("rmq") && !hasRole("super_admin");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    let procQuery = supabase.from("processes").select("id, nom").order("nom");

    if (isOnlyActeur && user) {
      const { data: profileData } = await supabase.from("profiles").select("acteur_id").eq("id", user.id).single();
      const acteurId = profileData?.acteur_id;
      if (acteurId) {
        const { data: taskData } = await supabase.from("process_tasks").select("process_id").eq("responsable_id", acteurId);
        const processIds = [...new Set((taskData ?? []).map(t => t.process_id))];
        if (processIds.length > 0) {
          procQuery = procQuery.in("id", processIds);
        } else {
          setProcesses([]); setIndicators([]); setAllValues([]); setLoading(false); return;
        }
      } else {
        setProcesses([]); setIndicators([]); setAllValues([]); setLoading(false); return;
      }
    } else if (isOnlyResponsable && user) {
      procQuery = procQuery.eq("responsable_id", user.id);
    }

    const { data: procs } = await procQuery;
    const myProcesses = procs ?? [];
    setProcesses(myProcesses);

    if (myProcesses.length === 0) {
      setIndicators([]); setAllValues([]); setLoading(false); return;
    }

    const processIds = myProcesses.map(p => p.id);
    let indQuery = supabase.from("indicators").select("*").order("nom");
    if (isOnlyResponsable || isOnlyActeur) {
      indQuery = indQuery.in("process_id", processIds);
    }
    const { data: inds } = await indQuery;
    const allInds = (inds ?? []) as Indicator[];
    setIndicators(allInds);

    if (allInds.length > 0) {
      const indIds = allInds.map(i => i.id);
      // Fetch in batches of 100 to avoid URL length issues
      const batches: IndValue[] = [];
      for (let i = 0; i < indIds.length; i += 100) {
        const batch = indIds.slice(i, i + 100);
        const { data } = await supabase.from("indicator_values").select("id, indicator_id, valeur, date_mesure, commentaire").in("indicator_id", batch).order("date_mesure", { ascending: true });
        if (data) batches.push(...(data as IndValue[]));
      }
      setAllValues(batches);
    } else {
      setAllValues([]);
    }

    if (myProcesses.length === 1) {
      setFilterProcessId(myProcesses[0].id);
    }
    setLoading(false);
  };

  const processMap = Object.fromEntries(processes.map(p => [p.id, p.nom]));
  const valuesByIndicator = allValues.reduce<Record<string, IndValue[]>>((acc, v) => {
    (acc[v.indicator_id] ??= []).push(v);
    return acc;
  }, {});

  const filteredIndicators = filterProcessId === "all"
    ? indicators
    : indicators.filter(i => i.process_id === filterProcessId);

  const getLastValue = (indId: string) => {
    const vals = valuesByIndicator[indId];
    return vals?.length ? vals[vals.length - 1] : null;
  };

  const getStatus = (ind: Indicator) => {
    const last = getLastValue(ind.id);
    if (!last) return "no_measure";
    if (ind.seuil_alerte != null && last.valeur < ind.seuil_alerte) return "alert";
    if (ind.cible != null && last.valeur >= ind.cible) return "ok";
    return "warning";
  };

  const totalIndicators = filteredIndicators.length;
  const alertCount = filteredIndicators.filter(i => getStatus(i) === "alert").length;
  const okCount = filteredIndicators.filter(i => getStatus(i) === "ok").length;
  const noMeasureCount = filteredIndicators.filter(i => getStatus(i) === "no_measure").length;

  const statusBadge = (status: string) => {
    switch (status) {
      case "alert": return <Badge variant="destructive">En alerte</Badge>;
      case "ok": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">À l'objectif</Badge>;
      case "warning": return <Badge variant="secondary">Intermédiaire</Badge>;
      default: return <Badge variant="outline">Sans mesure</Badge>;
    }
  };

  const escapeCsv = (val: string | number | null | undefined) => {
    if (val == null) return '""';
    const s = String(val);
    return `"${s.replace(/"/g, '""')}"`;
  };

  const exportCSV = () => {
    const BOM = "\uFEFF";
    const sep = ";";
    const headers = ["Processus", "Indicateur", "Type", "Unité", "Cible", "Seuil d'alerte", "Fréquence", "Formule", "Date mesure", "Valeur", "Commentaire"];

    const rows: string[] = [];
    for (const ind of filteredIndicators) {
      const procName = processMap[ind.process_id] ?? "";
      const typeLbl = TYPE_LABELS[ind.type_indicateur] ?? ind.type_indicateur;
      const freqLbl = FREQ_LABELS[ind.frequence] ?? ind.frequence;
      const vals = valuesByIndicator[ind.id] ?? [];

      if (vals.length === 0) {
        rows.push([
          escapeCsv(procName), escapeCsv(ind.nom), escapeCsv(typeLbl),
          escapeCsv(ind.unite), escapeCsv(ind.cible), escapeCsv(ind.seuil_alerte),
          escapeCsv(freqLbl), escapeCsv(ind.formule), escapeCsv(""), escapeCsv(""), escapeCsv("")
        ].join(sep));
      } else {
        for (const v of vals) {
          rows.push([
            escapeCsv(procName), escapeCsv(ind.nom), escapeCsv(typeLbl),
            escapeCsv(ind.unite), escapeCsv(ind.cible), escapeCsv(ind.seuil_alerte),
            escapeCsv(freqLbl), escapeCsv(ind.formule),
            escapeCsv(v.date_mesure), escapeCsv(v.valeur), escapeCsv(v.commentaire)
          ].join(sep));
        }
      }
    }

    const csvContent = BOM + headers.join(sep) + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `indicateurs_historique_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Indicateurs</h1>
          <p className="text-muted-foreground">Vue globale de tous les indicateurs par processus</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterProcessId} onValueChange={setFilterProcessId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filtrer par processus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les processus</SelectItem>
              {processes.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={exportCSV} variant="outline" disabled={filteredIndicators.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total indicateurs</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalIndicators}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En alerte</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{alertCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">À l'objectif</CardTitle>
            <Target className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{okCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sans mesure</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{noMeasureCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Récapitulatif des indicateurs</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredIndicators.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun indicateur trouvé</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Processus</TableHead>
                    <TableHead>Indicateur</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Unité</TableHead>
                    <TableHead className="text-right">Cible</TableHead>
                    <TableHead className="text-right">Seuil</TableHead>
                    <TableHead>Fréquence</TableHead>
                    <TableHead className="text-right">Dernière valeur</TableHead>
                    <TableHead>Date dernière mesure</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIndicators.map(ind => {
                    const last = getLastValue(ind.id);
                    const status = getStatus(ind);
                    return (
                      <TableRow key={ind.id}>
                        <TableCell className="font-medium">{processMap[ind.process_id] ?? "—"}</TableCell>
                        <TableCell>{ind.nom}</TableCell>
                        <TableCell>{TYPE_LABELS[ind.type_indicateur] ?? ind.type_indicateur}</TableCell>
                        <TableCell>{ind.unite ?? "—"}</TableCell>
                        <TableCell className="text-right">{ind.cible ?? "—"}</TableCell>
                        <TableCell className="text-right">{ind.seuil_alerte ?? "—"}</TableCell>
                        <TableCell>{FREQ_LABELS[ind.frequence] ?? ind.frequence}</TableCell>
                        <TableCell className="text-right">{last ? last.valeur : "—"}</TableCell>
                        <TableCell>{last ? format(new Date(last.date_mesure), "dd/MM/yyyy", { locale: fr }) : "—"}</TableCell>
                        <TableCell>{statusBadge(status)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
