import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, BarChart3, AlertTriangle, TrendingUp, TrendingDown, Target, Minus, CheckCircle2, Percent, ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Indicator = {
  id: string; nom: string; formule: string | null; unite: string | null;
  cible: number | null; seuil_alerte: number | null; frequence: string;
  process_id: string; type_indicateur: string; moyens?: string | null;
};
type IndValue = { id: string; indicator_id: string; valeur: number; date_mesure: string; commentaire: string | null };
type Process = { id: string; nom: string };

const TYPE_LABELS: Record<string, string> = { activite: "Activité", resultat: "Résultat", perception: "Perception", interne: "Interne" };
const FREQ_LABELS: Record<string, string> = { quotidien: "Quotidien", hebdomadaire: "Hebdomadaire", mensuel: "Mensuel", trimestriel: "Trimestriel", semestriel: "Semestriel", annuel: "Annuel" };

const STATUS_COLORS = {
  ok: "hsl(152, 69%, 31%)",
  warning: "hsl(45, 93%, 47%)",
  alert: "hsl(0, 72%, 51%)",
  no_measure: "hsl(215, 16%, 57%)",
};

export default function DashboardIndicateurs() {
  const { hasRole, user } = useAuth();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [allValues, setAllValues] = useState<IndValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProcessId, setFilterProcessId] = useState("all");
  const [filterType, setFilterType] = useState("all");

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
  const valuesByIndicator = useMemo(() => allValues.reduce<Record<string, IndValue[]>>((acc, v) => {
    (acc[v.indicator_id] ??= []).push(v);
    return acc;
  }, {}), [allValues]);

  const filteredIndicators = useMemo(() => {
    let result = indicators;
    if (filterProcessId !== "all") result = result.filter(i => i.process_id === filterProcessId);
    if (filterType !== "all") result = result.filter(i => i.type_indicateur === filterType);
    return result;
  }, [indicators, filterProcessId, filterType]);

  const getLastValue = (indId: string) => {
    const vals = valuesByIndicator[indId];
    return vals?.length ? vals[vals.length - 1] : null;
  };

  const getLastTwoValues = (indId: string) => {
    const vals = valuesByIndicator[indId];
    if (!vals || vals.length < 2) return null;
    return { current: vals[vals.length - 1], previous: vals[vals.length - 2] };
  };

  const getStatus = (ind: Indicator) => {
    const last = getLastValue(ind.id);
    if (!last) return "no_measure";
    if (ind.seuil_alerte != null && last.valeur < ind.seuil_alerte) return "alert";
    if (ind.cible != null && last.valeur >= ind.cible) return "ok";
    return "warning";
  };

  const getTrend = (indId: string): "up" | "down" | "stable" => {
    const pair = getLastTwoValues(indId);
    if (!pair) return "stable";
    if (pair.current.valeur > pair.previous.valeur) return "up";
    if (pair.current.valeur < pair.previous.valeur) return "down";
    return "stable";
  };

  // KPI calculations
  const totalIndicators = filteredIndicators.length;
  const alertCount = filteredIndicators.filter(i => getStatus(i) === "alert").length;
  const okCount = filteredIndicators.filter(i => getStatus(i) === "ok").length;
  const warningCount = filteredIndicators.filter(i => getStatus(i) === "warning").length;
  const noMeasureCount = filteredIndicators.filter(i => getStatus(i) === "no_measure").length;
  const measuredCount = totalIndicators - noMeasureCount;
  const complianceRate = measuredCount > 0 ? Math.round((okCount / measuredCount) * 100) : 0;

  // Critical indicators (in alert)
  const criticalIndicators = useMemo(() =>
    filteredIndicators
      .filter(i => getStatus(i) === "alert")
      .map(ind => {
        const last = getLastValue(ind.id)!;
        const ecart = ind.cible ? Math.round(((last.valeur - ind.cible) / ind.cible) * 100) : null;
        const trend = getTrend(ind.id);
        return { ...ind, lastValue: last.valeur, ecart, trend, processName: processMap[ind.process_id] ?? "—" };
      }),
    [filteredIndicators, valuesByIndicator]
  );

  // Chart data: status distribution donut
  const donutData = useMemo(() => [
    { name: "À l'objectif", value: okCount, color: STATUS_COLORS.ok },
    { name: "Intermédiaire", value: warningCount, color: STATUS_COLORS.warning },
    { name: "En alerte", value: alertCount, color: STATUS_COLORS.alert },
    { name: "Sans mesure", value: noMeasureCount, color: STATUS_COLORS.no_measure },
  ].filter(d => d.value > 0), [okCount, warningCount, alertCount, noMeasureCount]);

  // Chart data: stacked bar by process
  const processBarsData = useMemo(() => {
    const map: Record<string, { name: string; ok: number; warning: number; alert: number; no_measure: number }> = {};
    filteredIndicators.forEach(ind => {
      const pName = processMap[ind.process_id] ?? "Inconnu";
      if (!map[ind.process_id]) map[ind.process_id] = { name: pName, ok: 0, warning: 0, alert: 0, no_measure: 0 };
      const s = getStatus(ind);
      map[ind.process_id][s === "no_measure" ? "no_measure" : s]++;
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredIndicators, valuesByIndicator]);

  // Chart data: grouped bar by type
  const typeBarsData = useMemo(() => {
    const map: Record<string, { name: string; ok: number; warning: number; alert: number; no_measure: number }> = {};
    filteredIndicators.forEach(ind => {
      const tName = TYPE_LABELS[ind.type_indicateur] ?? ind.type_indicateur;
      if (!map[ind.type_indicateur]) map[ind.type_indicateur] = { name: tName, ok: 0, warning: 0, alert: 0, no_measure: 0 };
      const s = getStatus(ind);
      map[ind.type_indicateur][s === "no_measure" ? "no_measure" : s]++;
    });
    return Object.values(map);
  }, [filteredIndicators, valuesByIndicator]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "alert": return <Badge variant="destructive">En alerte</Badge>;
      case "ok": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">À l'objectif</Badge>;
      case "warning": return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Intermédiaire</Badge>;
      default: return <Badge variant="outline">Sans mesure</Badge>;
    }
  };

  const trendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up": return <ArrowUp className="h-4 w-4 text-emerald-600" />;
      case "down": return <ArrowDown className="h-4 w-4 text-destructive" />;
      default: return <ArrowRight className="h-4 w-4 text-muted-foreground" />;
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
        rows.push([escapeCsv(procName), escapeCsv(ind.nom), escapeCsv(typeLbl), escapeCsv(ind.unite), escapeCsv(ind.cible), escapeCsv(ind.seuil_alerte), escapeCsv(freqLbl), escapeCsv(ind.formule), escapeCsv(""), escapeCsv(""), escapeCsv("")].join(sep));
      } else {
        for (const v of vals) {
          rows.push([escapeCsv(procName), escapeCsv(ind.nom), escapeCsv(typeLbl), escapeCsv(ind.unite), escapeCsv(ind.cible), escapeCsv(ind.seuil_alerte), escapeCsv(freqLbl), escapeCsv(ind.formule), escapeCsv(v.date_mesure), escapeCsv(v.valeur), escapeCsv(v.commentaire)].join(sep));
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border bg-background p-2 shadow-md text-xs">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.fill || p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Indicateurs 360°</h1>
          <p className="text-muted-foreground">Vue globale de la performance — tous processus</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterProcessId} onValueChange={setFilterProcessId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Processus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les processus</SelectItem>
              {processes.map(p => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={exportCSV} variant="outline" disabled={filteredIndicators.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exporter CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards — 6 cards, 2 rows of 3 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total indicateurs</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalIndicators}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">À l'objectif</CardTitle>
            <Target className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-emerald-600">{okCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intermédiaire</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-600">{warningCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En alerte</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-destructive">{alertCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sans mesure</CardTitle>
            <Minus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-muted-foreground">{noMeasureCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de conformité</CardTitle>
            <Percent className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{complianceRate}%</div>
            <p className="text-xs text-muted-foreground">{okCount} sur {measuredCount} mesurés</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      {totalIndicators > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Donut: Status Distribution */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Répartition par statut</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                    {donutData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Stacked Bar: By Process */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Performance par processus</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={processBarsData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="ok" stackId="a" fill={STATUS_COLORS.ok} name="À l'objectif" />
                  <Bar dataKey="warning" stackId="a" fill={STATUS_COLORS.warning} name="Intermédiaire" />
                  <Bar dataKey="alert" stackId="a" fill={STATUS_COLORS.alert} name="En alerte" />
                  <Bar dataKey="no_measure" stackId="a" fill={STATUS_COLORS.no_measure} name="Sans mesure" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Grouped Bar: By Type */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium">Répartition par type</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={typeBarsData} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="ok" fill={STATUS_COLORS.ok} name="À l'objectif" />
                  <Bar dataKey="warning" fill={STATUS_COLORS.warning} name="Intermédiaire" />
                  <Bar dataKey="alert" fill={STATUS_COLORS.alert} name="En alerte" />
                  <Bar dataKey="no_measure" fill={STATUS_COLORS.no_measure} name="Sans mesure" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Critical Indicators Section */}
      {criticalIndicators.length > 0 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Indicateurs critiques ({criticalIndicators.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Processus</TableHead>
                    <TableHead>Indicateur</TableHead>
                    <TableHead className="text-right">Dernière valeur</TableHead>
                    <TableHead className="text-right">Cible</TableHead>
                    <TableHead className="text-right">Écart</TableHead>
                    <TableHead>Tendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalIndicators.map(ind => (
                    <TableRow key={ind.id}>
                      <TableCell className="font-medium">{ind.processName}</TableCell>
                      <TableCell>{ind.nom}</TableCell>
                      <TableCell className="text-right text-destructive font-medium">{ind.lastValue} {ind.unite ?? ""}</TableCell>
                      <TableCell className="text-right">{ind.cible ?? "—"} {ind.unite ?? ""}</TableCell>
                      <TableCell className="text-right text-destructive font-medium">{ind.ecart != null ? `${ind.ecart}%` : "—"}</TableCell>
                      <TableCell>{trendIcon(ind.trend)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Récapitulatif complet des indicateurs</CardTitle>
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
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Tendance</TableHead>
                    <TableHead className="text-center">Nb mesures</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIndicators.map(ind => {
                    const last = getLastValue(ind.id);
                    const status = getStatus(ind);
                    const trend = getTrend(ind.id);
                    const nbMesures = (valuesByIndicator[ind.id] ?? []).length;
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
                        <TableCell className="text-center">{trendIcon(trend)}</TableCell>
                        <TableCell className="text-center">{nbMesures}</TableCell>
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
