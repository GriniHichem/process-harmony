import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Download, BarChart3, AlertTriangle, TrendingUp, Target, Minus, Percent, ArrowUp, ArrowDown, ArrowRight, CalendarIcon, RotateCcw, Activity } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Label } from "recharts";

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
  const [dateDebut, setDateDebut] = useState<Date | undefined>();
  const [dateFin, setDateFin] = useState<Date | undefined>();

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

  // Filter values by date range
  const filteredValues = useMemo(() => {
    if (!dateDebut && !dateFin) return allValues;
    return allValues.filter(v => {
      const d = new Date(v.date_mesure);
      if (dateDebut && d < dateDebut) return false;
      if (dateFin) {
        const endOfDay = new Date(dateFin);
        endOfDay.setHours(23, 59, 59, 999);
        if (d > endOfDay) return false;
      }
      return true;
    });
  }, [allValues, dateDebut, dateFin]);

  const valuesByIndicator = useMemo(() => filteredValues.reduce<Record<string, IndValue[]>>((acc, v) => {
    (acc[v.indicator_id] ??= []).push(v);
    return acc;
  }, {}), [filteredValues]);

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

  const hasDateFilter = !!dateDebut || !!dateFin;

  // Critical indicators
  const criticalIndicators = useMemo(() =>
    filteredIndicators
      .filter(i => getStatus(i) === "alert")
      .map(ind => {
        const last = getLastValue(ind.id)!;
        const ecart = ind.cible ? Math.round(((last.valeur - ind.cible) / ind.cible) * 100) : null;
        const trend = getTrend(ind.id);
        return { ...ind, lastValue: last.valeur, lastDate: last.date_mesure, ecart, trend, processName: processMap[ind.process_id] ?? "—" };
      }),
    [filteredIndicators, valuesByIndicator]
  );

  // Donut data
  const donutData = useMemo(() => [
    { name: "À l'objectif", value: okCount, color: STATUS_COLORS.ok },
    { name: "Intermédiaire", value: warningCount, color: STATUS_COLORS.warning },
    { name: "En alerte", value: alertCount, color: STATUS_COLORS.alert },
    { name: "Sans mesure", value: noMeasureCount, color: STATUS_COLORS.no_measure },
  ].filter(d => d.value > 0), [okCount, warningCount, alertCount, noMeasureCount]);

  // Stacked bar by process
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

  // Grouped bar by type
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

  const getValueCellClass = (status: string) => {
    switch (status) {
      case "ok": return "text-right font-semibold text-emerald-600 bg-emerald-500/5";
      case "alert": return "text-right font-semibold text-destructive bg-destructive/5";
      case "warning": return "text-right font-semibold text-yellow-600 bg-yellow-500/5";
      default: return "text-right text-muted-foreground";
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
      <div className="rounded-lg border bg-background p-2.5 shadow-lg text-xs">
        <p className="font-semibold mb-1 text-foreground">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: p.fill || p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium text-foreground">{p.value}</span>
          </p>
        ))}
      </div>
    );
  };

  const truncateName = (name: string, max = 18) => name.length > max ? name.slice(0, max) + "…" : name;

  const resetFilters = () => {
    setDateDebut(undefined);
    setDateFin(undefined);
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
          <p className="text-sm text-muted-foreground">
            Vue globale de la performance — tous processus
            {hasDateFilter && (
              <span className="ml-2 text-primary font-medium">
                (Période : {dateDebut ? format(dateDebut, "dd/MM/yyyy", { locale: fr }) : "…"} → {dateFin ? format(dateFin, "dd/MM/yyyy", { locale: fr }) : "…"})
              </span>
            )}
          </p>
        </div>
        <Button onClick={exportCSV} variant="outline" disabled={filteredIndicators.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Exporter CSV
        </Button>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Processus</label>
              <Select value={filterProcessId} onValueChange={setFilterProcessId}>
                <SelectTrigger>
                  <SelectValue placeholder="Processus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les processus</SelectItem>
                  {processes.map(p => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Type d'indicateur</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Date début</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateDebut && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateDebut ? format(dateDebut, "dd/MM/yyyy", { locale: fr }) : "Sélectionner"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateDebut} onSelect={setDateDebut} initialFocus className="p-3 pointer-events-auto" locale={fr} />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Date fin</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("flex-1 justify-start text-left font-normal", !dateFin && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFin ? format(dateFin, "dd/MM/yyyy", { locale: fr }) : "Sélectionner"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFin} onSelect={setDateFin} initialFocus className="p-3 pointer-events-auto" locale={fr} />
                  </PopoverContent>
                </Popover>
                {hasDateFilter && (
                  <Button variant="ghost" size="icon" onClick={resetFilters} title="Réinitialiser les dates">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards — 6 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Total</span>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{totalIndicators}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{processes.length} processus</p>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: STATUS_COLORS.ok }}>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">À l'objectif</span>
              <Target className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-600">{okCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">sur {measuredCount} mesurés</p>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: STATUS_COLORS.warning }}>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Intermédiaire</span>
              <TrendingUp className="h-4 w-4 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">entre seuil et cible</p>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: STATUS_COLORS.alert }}>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">En alerte</span>
              <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
            </div>
            <div className="text-2xl font-bold text-destructive">{alertCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">sous le seuil</p>
          </CardContent>
        </Card>
        <Card className="border-l-4" style={{ borderLeftColor: STATUS_COLORS.no_measure }}>
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Sans mesure</span>
              <Minus className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold text-muted-foreground">{noMeasureCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">aucune donnée</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary bg-primary/5">
          <CardContent className="pt-5 pb-4 px-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Conformité</span>
              <Percent className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-primary">{complianceRate}%</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{okCount}/{measuredCount} mesurés</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      {totalIndicators > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Donut */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Répartition par statut</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="45%" innerRadius={60} outerRadius={95} dataKey="value" paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {donutData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                    <Label value={`${complianceRate}%`} position="center" className="fill-foreground text-xl font-bold" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Stacked Bar: By Process */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Performance par processus</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={processBarsData} layout="vertical" margin={{ left: 10, right: 16, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} domain={[0, "auto"]} tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10 }} tickFormatter={(v) => truncateName(v, 16)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                  <Bar dataKey="ok" stackId="a" fill={STATUS_COLORS.ok} name="À l'objectif" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="warning" stackId="a" fill={STATUS_COLORS.warning} name="Intermédiaire" />
                  <Bar dataKey="alert" stackId="a" fill={STATUS_COLORS.alert} name="En alerte" />
                  <Bar dataKey="no_measure" stackId="a" fill={STATUS_COLORS.no_measure} name="Sans mesure" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Grouped Bar: By Type */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Répartition par type</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={typeBarsData} margin={{ left: 0, right: 16, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} domain={[0, "auto"]} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={(value) => <span className="text-xs">{value}</span>} />
                  <Bar dataKey="ok" fill={STATUS_COLORS.ok} name="À l'objectif" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="warning" fill={STATUS_COLORS.warning} name="Intermédiaire" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="alert" fill={STATUS_COLORS.alert} name="En alerte" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="no_measure" fill={STATUS_COLORS.no_measure} name="Sans mesure" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Critical Indicators */}
      {criticalIndicators.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/[0.02]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4 animate-pulse" />
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
                    <TableHead>Date</TableHead>
                    <TableHead>Tendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalIndicators.map(ind => (
                    <TableRow key={ind.id}>
                      <TableCell className="font-medium">{ind.processName}</TableCell>
                      <TableCell>{ind.nom}</TableCell>
                      <TableCell className="text-right text-destructive font-semibold">{ind.lastValue} {ind.unite ?? ""}</TableCell>
                      <TableCell className="text-right">{ind.cible ?? "—"} {ind.unite ?? ""}</TableCell>
                      <TableCell className="text-right text-destructive font-semibold">{ind.ecart != null ? `${ind.ecart}%` : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(ind.lastDate), "dd/MM/yyyy", { locale: fr })}</TableCell>
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
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Récapitulatif complet des indicateurs</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredIndicators.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun indicateur trouvé</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
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
                  {filteredIndicators.map((ind, idx) => {
                    const last = getLastValue(ind.id);
                    const status = getStatus(ind);
                    const trend = getTrend(ind.id);
                    const nbMesures = (valuesByIndicator[ind.id] ?? []).length;
                    return (
                      <TableRow key={ind.id} className={idx % 2 === 0 ? "bg-muted/30" : ""}>
                        <TableCell className="font-medium">{processMap[ind.process_id] ?? "—"}</TableCell>
                        <TableCell>{ind.nom}</TableCell>
                        <TableCell>{TYPE_LABELS[ind.type_indicateur] ?? ind.type_indicateur}</TableCell>
                        <TableCell>{ind.unite ?? "—"}</TableCell>
                        <TableCell className="text-right">{ind.cible ?? "—"}</TableCell>
                        <TableCell className="text-right">{ind.seuil_alerte ?? "—"}</TableCell>
                        <TableCell>{FREQ_LABELS[ind.frequence] ?? ind.frequence}</TableCell>
                        <TableCell className={getValueCellClass(status)}>
                          {last ? last.valeur : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{last ? format(new Date(last.date_mesure), "dd/MM/yyyy", { locale: fr }) : "—"}</TableCell>
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
