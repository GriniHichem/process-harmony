import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  ClipboardCheck, XCircle, AlertTriangle, CheckCircle2, Clock, TrendingUp,
} from "lucide-react";

type AuditRow = { id: string; statut: string; type_audit: string; date_audit: string | null };
type NCRow = {
  id: string; statut: string; gravite: string; criticite: number | null;
  date_detection: string; audit_id: string | null;
};

const COLORS_GRAVITE = {
  mineure: "hsl(var(--warning))",
  majeure: "hsl(var(--destructive))",
  critique: "#7f1d1d",
};

const COLORS_AUDIT = {
  planifie: "hsl(var(--muted-foreground))",
  en_cours: "hsl(var(--primary))",
  termine: "hsl(142 71% 45%)",
  cloture: "hsl(var(--secondary-foreground))",
};

const PIE_COLORS = ["#3b82f6", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#6b7280"];

export default function DashboardAuditNC() {
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [ncs, setNcs] = useState<NCRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("audits").select("id, statut, type_audit, date_audit"),
      supabase.from("nonconformities").select("id, statut, gravite, criticite, date_detection, audit_id"),
    ]).then(([aRes, nRes]) => {
      setAudits((aRes.data ?? []) as AuditRow[]);
      setNcs((nRes.data ?? []) as NCRow[]);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // KPIs
  const totalAudits = audits.length;
  const auditsClotures = audits.filter(a => a.statut === "cloture").length;
  const auditsEnCours = audits.filter(a => a.statut === "en_cours").length;
  const totalNC = ncs.length;
  const ncCloturees = ncs.filter(n => n.statut === "cloturee").length;
  const ncOuvertes = ncs.filter(n => n.statut === "ouverte").length;
  const ncCritiques = ncs.filter(n => n.gravite === "critique").length;
  const ncLieesAudit = ncs.filter(n => n.audit_id).length;
  const tauxClotureNC = totalNC > 0 ? Math.round((ncCloturees / totalNC) * 100) : 0;
  const tauxClotureAudit = totalAudits > 0 ? Math.round((auditsClotures / totalAudits) * 100) : 0;

  // Chart data: audits par statut
  const auditsByStatus = [
    { name: "Planifié", value: audits.filter(a => a.statut === "planifie").length, fill: COLORS_AUDIT.planifie },
    { name: "En cours", value: audits.filter(a => a.statut === "en_cours").length, fill: COLORS_AUDIT.en_cours },
    { name: "Terminé", value: audits.filter(a => a.statut === "termine").length, fill: COLORS_AUDIT.termine },
    { name: "Clôturé", value: audits.filter(a => a.statut === "cloture").length, fill: COLORS_AUDIT.cloture },
  ].filter(d => d.value > 0);

  // Chart data: NC par gravité
  const ncByGravite = [
    { name: "Mineure", value: ncs.filter(n => n.gravite === "mineure").length, fill: COLORS_GRAVITE.mineure },
    { name: "Majeure", value: ncs.filter(n => n.gravite === "majeure").length, fill: COLORS_GRAVITE.majeure },
    { name: "Critique", value: ncs.filter(n => n.gravite === "critique").length, fill: COLORS_GRAVITE.critique },
  ].filter(d => d.value > 0);

  // Chart data: NC par statut workflow
  const ncStatutLabels: Record<string, string> = {
    ouverte: "Ouverte", correction: "Correction", analyse_cause: "Analyse",
    action_corrective: "Action", en_traitement: "Traitement", verification: "Vérification", cloturee: "Clôturée",
  };
  const ncByStatut = Object.entries(
    ncs.reduce((acc, n) => { acc[n.statut] = (acc[n.statut] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([key, value], i) => ({ name: ncStatutLabels[key] ?? key, value, fill: PIE_COLORS[i % PIE_COLORS.length] }));

  // Chart data: audits par type
  const auditsByType = [
    { name: "Interne", value: audits.filter(a => a.type_audit === "interne").length },
    { name: "Externe", value: audits.filter(a => a.type_audit === "externe").length },
  ].filter(d => d.value > 0);

  const kpis = [
    { label: "Audits total", value: totalAudits, icon: ClipboardCheck, color: "text-primary", sub: `${auditsEnCours} en cours` },
    { label: "Taux clôture audits", value: `${tauxClotureAudit}%`, icon: CheckCircle2, color: "text-success", sub: `${auditsClotures}/${totalAudits}` },
    { label: "NC total", value: totalNC, icon: XCircle, color: "text-destructive", sub: `${ncOuvertes} ouverte(s)` },
    { label: "Taux clôture NC", value: `${tauxClotureNC}%`, icon: TrendingUp, color: "text-success", sub: `${ncCloturees}/${totalNC}` },
    { label: "NC critiques", value: ncCritiques, icon: AlertTriangle, color: "text-destructive", sub: "attention requise" },
    { label: "NC issues d'audit", value: ncLieesAudit, icon: Clock, color: "text-primary", sub: `${totalNC > 0 ? Math.round((ncLieesAudit / totalNC) * 100) : 0}% du total` },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord Audits & NC</h1>
        <p className="text-muted-foreground">Vue d'ensemble de la performance qualité</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground truncate">{kpi.label}</span>
              </div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Taux de clôture des audits</CardTitle></CardHeader>
          <CardContent>
            <Progress value={tauxClotureAudit} className="h-3 mb-2" />
            <p className="text-xs text-muted-foreground">{auditsClotures} clôturé(s) sur {totalAudits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Taux de clôture des NC</CardTitle></CardHeader>
          <CardContent>
            <Progress value={tauxClotureNC} className="h-3 mb-2" />
            <p className="text-xs text-muted-foreground">{ncCloturees} clôturée(s) sur {totalNC}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Audits par statut */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Audits par statut</CardTitle></CardHeader>
          <CardContent>
            {auditsByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={auditsByStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {auditsByStatus.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">Aucun audit</p>
            )}
          </CardContent>
        </Card>

        {/* NC par gravité */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Non-conformités par gravité</CardTitle></CardHeader>
          <CardContent>
            {ncByGravite.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={ncByGravite} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                    {ncByGravite.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">Aucune NC</p>
            )}
          </CardContent>
        </Card>

        {/* NC par statut workflow */}
        <Card>
          <CardHeader><CardTitle className="text-sm">NC par étape du workflow</CardTitle></CardHeader>
          <CardContent>
            {ncByStatut.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={ncByStatut}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="NC" radius={[4, 4, 0, 0]}>
                    {ncByStatut.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">Aucune NC</p>
            )}
          </CardContent>
        </Card>

        {/* Audits par type */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Audits par type</CardTitle></CardHeader>
          <CardContent>
            {auditsByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={auditsByType}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Audits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-muted-foreground py-12">Aucun audit</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* NC critiques en cours */}
      {ncCritiques > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" /> NC critiques ouvertes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ncs.filter(n => n.gravite === "critique" && n.statut !== "cloturee").map(nc => (
                <div key={nc.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm font-medium">NC détectée le {nc.date_detection}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Critique</Badge>
                    <Badge variant="outline">{nc.statut}</Badge>
                  </div>
                </div>
              ))}
              {ncs.filter(n => n.gravite === "critique" && n.statut !== "cloturee").length === 0 && (
                <p className="text-sm text-muted-foreground">Toutes les NC critiques sont clôturées ✓</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
