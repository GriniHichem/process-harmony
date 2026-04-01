import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Network, ClipboardCheck, XCircle, Zap, AlertTriangle, BarChart3, AlertOctagon,
  FolderKanban, FileText, Truck, Target, BookOpen, GraduationCap, Award,
  MessageSquare, CalendarCheck, TrendingUp, ListChecks,
} from "lucide-react";
import { HelpTooltip } from "@/components/HelpTooltip";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, CartesianGrid, RadialBarChart, RadialBar, Legend,
} from "recharts";

const PROCESS_COLORS = ["hsl(221, 83%, 53%)", "hsl(172, 66%, 50%)", "hsl(38, 92%, 50%)"];
const PROJECT_STATUS_COLORS: Record<string, string> = {
  en_cours: "hsl(221, 83%, 53%)",
  termine: "hsl(142, 71%, 45%)",
  suspendu: "hsl(38, 92%, 50%)",
  planifie: "hsl(262, 83%, 58%)",
};

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

  // --- Section 1: Primary KPI Cards ---
  const primaryCards = [
    { label: "Processus", value: stats.totalProcesses, icon: Network, desc: `M:${stats.processesByType.pilotage} R:${stats.processesByType.realisation} S:${stats.processesByType.support}`, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", helpTerm: "processus", link: "/processus" },
    { label: "Projets actifs", value: stats.activeProjects, icon: FolderKanban, desc: `${stats.projectOverdueActions} action(s) en retard`, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-500/10", helpTerm: "action_amelioration", link: "/actions" },
    { label: "Audits en cours", value: stats.openAudits, icon: ClipboardCheck, desc: "Planifiés ou en cours", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", helpTerm: "audit", link: "/audits" },
    { label: "NC ouvertes", value: stats.openNC, icon: XCircle, desc: "Non-conformités ouvertes", color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10", helpTerm: "non_conformite", link: "/non-conformites" },
    { label: "Actions en retard", value: stats.overdueActions, icon: Zap, desc: "Échéance dépassée", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", helpTerm: "action_amelioration", link: "/actions" },
    { label: "Risques identifiés", value: stats.totalRisks, icon: AlertTriangle, desc: "Risques & opportunités", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10", helpTerm: "risques_opportunites", link: "/risques" },
    { label: "Indicateurs", value: stats.totalIndicators, icon: BarChart3, desc: "Indicateurs définis", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10", helpTerm: "indicateur", link: "/indicateurs" },
    { label: "Incidents ouverts", value: stats.incidentsOuverts, icon: AlertOctagon, desc: `dont ${stats.incidentsCritiques} critique(s)`, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", helpTerm: "risques_opportunites", link: "/incidents" },
  ];

  // --- Section 2: Project data ---
  const projectStatusData = Object.entries(stats.projectsByStatus)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({
      name: key === "en_cours" ? "En cours" : key === "termine" ? "Terminé" : key === "suspendu" ? "Suspendu" : "Planifié",
      value,
      fill: PROJECT_STATUS_COLORS[key] ?? "hsl(var(--muted-foreground))",
    }));

  const avancementData = [
    { name: "Avancement", value: stats.avgProjectAvancement, fill: "hsl(221, 83%, 53%)" },
  ];

  // --- Section 3: Charts ---
  const pieData = [
    { name: "Pilotage", value: stats.processesByType.pilotage },
    { name: "Réalisation", value: stats.processesByType.realisation },
    { name: "Support", value: stats.processesByType.support },
  ].filter((d) => d.value > 0);

  const barData = [
    { name: "Audits", value: stats.openAudits },
    { name: "NC", value: stats.openNC },
    { name: "Actions retard", value: stats.overdueActions },
    { name: "Risques", value: stats.totalRisks },
    { name: "Incidents", value: stats.incidentsOuverts },
    { name: "Proj. retard", value: stats.projectOverdueActions },
  ];

  // --- Section 4: Module overview ---
  const moduleCards = [
    { label: "Documents", value: stats.totalDocuments, icon: FileText, link: "/documents", color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10" },
    { label: "Fournisseurs", value: stats.totalSuppliers, icon: Truck, link: "/fournisseurs", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-500/10" },
    { label: "Objectifs qualité", value: stats.totalObjectives, icon: Target, link: "/politique-qualite", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-500/10" },
    { label: "Enjeux contexte", value: stats.totalContextIssues, icon: BookOpen, link: "/enjeux-contexte", color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Formations", value: stats.totalFormations, icon: GraduationCap, link: "/competences", color: "text-lime-600 dark:text-lime-400", bg: "bg-lime-500/10" },
    { label: "Compétences", value: stats.totalCompetences, icon: Award, link: "/competences", color: "text-fuchsia-600 dark:text-fuchsia-400", bg: "bg-fuchsia-500/10" },
    { label: "Enquêtes publiées", value: stats.totalSurveys, icon: MessageSquare, link: "/satisfaction-client", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Revues direction", value: stats.totalReviews, icon: CalendarCheck, link: "/revue-direction", color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-500/10" },
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

      {/* Section 1: Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryCards.map((c) => (
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

      {/* Section 2: Projects / Plans d'action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-indigo-500" />
              <CardTitle className="text-base">Projets en cours</CardTitle>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><TrendingUp className="h-4 w-4" /> Avancement moyen : <strong className="text-foreground">{stats.avgProjectAvancement}%</strong></span>
            </div>
          </CardHeader>
          <CardContent>
            {stats.projectSummaries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Projet</TableHead>
                    <TableHead className="w-20 text-center">Actions</TableHead>
                    <TableHead className="w-40">Avancement</TableHead>
                    <TableHead className="w-24 text-center">En retard</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.projectSummaries.slice(0, 6).map((proj) => (
                    <TableRow
                      key={proj.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/projects/${proj.id}`)}
                    >
                      <TableCell className="font-medium">{proj.title}</TableCell>
                      <TableCell className="text-center">{proj.actionCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={proj.avgAvancement} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground w-8 text-right">{proj.avgAvancement}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {proj.overdueActions > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                            <Zap className="h-3 w-3" /> {proj.overdueActions}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun projet en cours</p>
            )}
          </CardContent>
        </Card>

        {/* Project status donut + avancement radial */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statuts des projets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {projectStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {projectStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">Aucun projet</p>
            )}
            {/* Avancement radial */}
            <div className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
              <div className="relative h-14 w-14">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" data={avancementData} startAngle={90} endAngle={-270}>
                    <RadialBar dataKey="value" cornerRadius={10} background={{ fill: "hsl(var(--muted))" }} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgProjectAvancement}%</p>
                <p className="text-xs text-muted-foreground">Avancement global projets</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="rounded-lg bg-muted/30 p-2">
                <p className="text-lg font-bold text-foreground">{stats.projectOverdueActions}</p>
                <p className="text-muted-foreground">Actions retard</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-2">
                <p className="text-lg font-bold text-foreground">{stats.projectOverdueTasks}</p>
                <p className="text-muted-foreground">Tâches retard</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition des processus</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
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
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
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

      {/* Section 4: Module overview */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-muted-foreground" />
          Vue d'ensemble des modules
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {moduleCards.map((m) => (
            <Card
              key={m.label}
              className="cursor-pointer group hover:border-primary/20 text-center"
              onClick={() => navigate(m.link)}
            >
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <div className={`h-10 w-10 rounded-xl ${m.bg} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                  <m.icon className={`h-5 w-5 ${m.color}`} />
                </div>
                <p className="text-2xl font-bold">{m.value}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
