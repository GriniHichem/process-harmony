import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Network, ClipboardCheck, XCircle, Zap, AlertTriangle, BarChart3, AlertOctagon } from "lucide-react";
import { HelpTooltip } from "@/components/HelpTooltip";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";

const PROCESS_COLORS = ["hsl(215, 80%, 42%)", "hsl(170, 60%, 40%)", "hsl(38, 92%, 50%)"];

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

  const cards: { label: string; value: number; icon: any; desc: string; color: string; helpTerm: string; link?: string }[] = [
    { label: "Processus", value: stats.totalProcesses, icon: Network, desc: `M:${stats.processesByType.pilotage} R:${stats.processesByType.realisation} S:${stats.processesByType.support}`, color: "text-primary", helpTerm: "processus", link: "/processus" },
    { label: "Audits en cours", value: stats.openAudits, icon: ClipboardCheck, desc: "Planifiés ou en cours", color: "text-accent", helpTerm: "audit", link: "/audits" },
    { label: "NC ouvertes", value: stats.openNC, icon: XCircle, desc: "Non-conformités ouvertes", color: "text-destructive", helpTerm: "non_conformite", link: "/non-conformites" },
    { label: "Actions en retard", value: stats.overdueActions, icon: Zap, desc: "Échéance dépassée", color: "text-warning", helpTerm: "action_amelioration", link: "/actions" },
    { label: "Risques identifiés", value: stats.totalRisks, icon: AlertTriangle, desc: "Risques & opportunités", color: "text-orange-500", helpTerm: "risques_opportunites", link: "/risques" },
    { label: "Indicateurs", value: stats.totalIndicators, icon: BarChart3, desc: "Indicateurs définis", color: "text-primary", helpTerm: "indicateur", link: "/indicateurs" },
    { label: "Incidents ouverts", value: stats.incidentsOuverts, icon: AlertOctagon, desc: `dont ${stats.incidentsCritiques} critique(s)`, color: "text-orange-600", helpTerm: "risques_opportunites", link: "/incidents" },
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
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <HelpTooltip term="tableau_bord" />
      </div>
      <p className="text-muted-foreground -mt-4">Vue d'ensemble du système qualité</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card
            key={c.label}
            className={c.link ? "cursor-pointer transition-shadow hover:shadow-md" : ""}
            onClick={() => c.link && navigate(c.link)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <HelpTooltip term={c.helpTerm} />
              </div>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Process distribution pie */}
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

        {/* Issues bar chart */}
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
                    borderRadius: "var(--radius)",
                    color: "hsl(var(--card-foreground))",
                  }}
                />
                <Bar dataKey="value" fill="hsl(215, 80%, 42%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
