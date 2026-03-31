import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Network, ClipboardCheck, XCircle, Zap, AlertTriangle, BarChart3, AlertOctagon } from "lucide-react";
import { HelpTooltip } from "@/components/HelpTooltip";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";

const PROCESS_COLORS = ["hsl(221, 83%, 53%)", "hsl(172, 66%, 50%)", "hsl(38, 92%, 50%)"];

export default function Dashboard() {
  const { data: stats, isLoading } = useDashboardStats();
  const navigate = useNavigate();

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const cards: { label: string; value: number; icon: any; desc: string; color: string; bg: string; helpTerm: string; link?: string }[] = [
    { label: "Processus", value: stats.totalProcesses, icon: Network, desc: `M:${stats.processesByType.pilotage} R:${stats.processesByType.realisation} S:${stats.processesByType.support}`, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", helpTerm: "processus", link: "/processus" },
    { label: "Audits en cours", value: stats.openAudits, icon: ClipboardCheck, desc: "Planifiés ou en cours", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", helpTerm: "audit", link: "/audits" },
    { label: "NC ouvertes", value: stats.openNC, icon: XCircle, desc: "Non-conformités ouvertes", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", helpTerm: "non_conformite", link: "/non-conformites" },
    { label: "Actions en retard", value: stats.overdueActions, icon: Zap, desc: "Échéance dépassée", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", helpTerm: "action_amelioration", link: "/actions" },
    { label: "Risques identifiés", value: stats.totalRisks, icon: AlertTriangle, desc: "Risques & opportunités", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10", helpTerm: "risques_opportunites", link: "/risques" },
    { label: "Indicateurs", value: stats.totalIndicators, icon: BarChart3, desc: "Indicateurs définis", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", helpTerm: "indicateur", link: "/indicateurs" },
    { label: "Incidents ouverts", value: stats.incidentsOuverts, icon: AlertOctagon, desc: `dont ${stats.incidentsCritiques} critique(s)`, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", helpTerm: "risques_opportunites", link: "/incidents" },
  ];

  const pieData = [
    { name: "Pilotage", value: stats.processesByType.pilotage },
    { name: "Réalisation", value: stats.processesByType.realisation },
    { name: "Support", value: stats.processesByType.support },
  ].filter(d => d.value > 0);

  const barData = [
    { name: "Audits", value: stats.openAudits },
    { name: "NC", value: stats.openNC },
    { name: "Actions retard", value: stats.overdueActions },
    { name: "Risques", value: stats.totalRisks },
    { name: "Incidents", value: stats.incidentsOuverts },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 page-enter">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
          <HelpTooltip term="tableau_bord" />
        </div>
        <p className="text-muted-foreground mt-1">Vue d'ensemble du système qualité</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card
            key={c.label}
            className={c.link ? "cursor-pointer group hover:border-primary/20" : ""}
            onClick={() => c.link && navigate(c.link)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <HelpTooltip term={c.helpTerm} />
              </div>
              <div className={`h-9 w-9 rounded-xl ${c.bg} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                <c.icon className={`h-4.5 w-4.5 ${c.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tracking-tight">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition des processus</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PROCESS_COLORS[i % PROCESS_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun processus défini</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Synthèse qualité</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.75rem",
                    color: "hsl(var(--card-foreground))",
                    boxShadow: "var(--shadow-md)",
                  }}
                />
                <Bar dataKey="value" fill="hsl(221, 83%, 53%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
