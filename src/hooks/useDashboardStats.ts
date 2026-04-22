import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { computeProjectProgress } from "@/lib/projectProgress";

export interface ProjectSummary {
  id: string;
  title: string;
  statut: string;
  actionCount: number;
  avgAvancement: number;
  overdueActions: number;
}

export interface DashboardStats {
  totalProcesses: number;
  processesByType: { pilotage: number; realisation: number; support: number };
  openAudits: number;
  openNC: number;
  overdueActions: number;
  totalRisks: number;
  totalIndicators: number;
  incidentsOuverts: number;
  incidentsCritiques: number;
  // Projects
  activeProjects: number;
  projectsByStatus: { en_cours: number; termine: number; suspendu: number; planifie: number };
  projectOverdueActions: number;
  avgProjectAvancement: number;
  projectOverdueTasks: number;
  projectSummaries: ProjectSummary[];
  // Modules
  totalDocuments: number;
  totalSuppliers: number;
  totalObjectives: number;
  totalContextIssues: number;
  totalFormations: number;
  totalCompetences: number;
  totalSurveys: number;
  totalReviews: number;
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const now = new Date().toISOString().split("T")[0];

  const [
    processes, audits, nc, actions, risks, indicators,
    incidentsOuverts, incidentsCritiques,
    projects, projectActions, projectTasks,
    documents, suppliers, objectives, contextIssues,
    formations, competences, surveys, reviews,
  ] = await Promise.all([
    supabase.from("processes").select("type_processus"),
    supabase.from("audits").select("statut").in("statut", ["planifie", "en_cours"]),
    supabase.from("nonconformities").select("statut").eq("statut", "ouverte"),
    supabase.from("actions").select("statut, echeance").in("statut", ["planifiee", "en_cours"]),
    supabase.from("risks_opportunities").select("id"),
    supabase.from("indicators").select("id"),
    supabase.from("risk_incidents").select("id").eq("statut", "ouvert"),
    supabase.from("risk_incidents").select("id").eq("gravite", "critique").neq("statut", "cloture"),
    // Projects
    supabase.from("projects").select("id, title, statut"),
    supabase.from("project_actions").select("id, project_id, statut, echeance, avancement, title"),
    supabase.from("project_tasks").select("id, statut, echeance"),
    // Modules
    supabase.from("documents").select("id").eq("archive", false),
    supabase.from("suppliers").select("id"),
    supabase.from("quality_objectives").select("id"),
    supabase.from("context_issues").select("id"),
    supabase.from("formations").select("id"),
    supabase.from("competences").select("id"),
    supabase.from("client_surveys").select("id").eq("status", "published"),
    supabase.from("management_reviews").select("id"),
  ]);

  const p = processes.data ?? [];
  const overdueActions = (actions.data ?? []).filter(
    (a) => a.echeance && new Date(a.echeance) < new Date()
  ).length;

  // Projects stats
  const allProjects = projects.data ?? [];
  const allProjActions = projectActions.data ?? [];
  const allProjTasks = projectTasks.data ?? [];

  const projectsByStatus = { en_cours: 0, termine: 0, suspendu: 0, planifie: 0 };
  allProjects.forEach((pr) => {
    const s = pr.statut as keyof typeof projectsByStatus;
    if (s in projectsByStatus) projectsByStatus[s]++;
  });

  const projOverdueActions = allProjActions.filter(
    (a) => a.echeance && new Date(a.echeance) < new Date() && a.statut !== "terminee"
  ).length;

  const activeProjActions = allProjActions.filter((a) => a.statut !== "terminee");
  const avgAvancement = activeProjActions.length > 0
    ? Math.round(activeProjActions.reduce((s, a) => s + (a.avancement ?? 0), 0) / activeProjActions.length)
    : 0;

  const projOverdueTasks = allProjTasks.filter(
    (t) => t.echeance && new Date(t.echeance) < new Date() && t.statut !== "terminee"
  ).length;

  // Project summaries (active projects)
  const activeProjectsList = allProjects.filter((pr) => pr.statut === "en_cours");
  const projectSummaries: ProjectSummary[] = activeProjectsList.map((pr) => {
    const pActions = allProjActions.filter((a) => a.project_id === pr.id);
    const avg = pActions.length > 0
      ? Math.round(pActions.reduce((s, a) => s + (a.avancement ?? 0), 0) / pActions.length)
      : 0;
    const overdue = pActions.filter(
      (a) => a.echeance && new Date(a.echeance) < new Date() && a.statut !== "terminee"
    ).length;
    return {
      id: pr.id,
      title: pr.title,
      statut: pr.statut,
      actionCount: pActions.length,
      avgAvancement: avg,
      overdueActions: overdue,
    };
  });

  return {
    totalProcesses: p.length,
    processesByType: {
      pilotage: p.filter((x) => x.type_processus === "pilotage").length,
      realisation: p.filter((x) => x.type_processus === "realisation").length,
      support: p.filter((x) => x.type_processus === "support").length,
    },
    openAudits: audits.data?.length ?? 0,
    openNC: nc.data?.length ?? 0,
    overdueActions,
    totalRisks: risks.data?.length ?? 0,
    totalIndicators: indicators.data?.length ?? 0,
    incidentsOuverts: incidentsOuverts.data?.length ?? 0,
    incidentsCritiques: incidentsCritiques.data?.length ?? 0,
    // Projects
    activeProjects: projectsByStatus.en_cours,
    projectsByStatus,
    projectOverdueActions: projOverdueActions,
    avgProjectAvancement: avgAvancement,
    projectOverdueTasks: projOverdueTasks,
    projectSummaries,
    // Modules
    totalDocuments: documents.data?.length ?? 0,
    totalSuppliers: suppliers.data?.length ?? 0,
    totalObjectives: objectives.data?.length ?? 0,
    totalContextIssues: contextIssues.data?.length ?? 0,
    totalFormations: formations.data?.length ?? 0,
    totalCompetences: competences.data?.length ?? 0,
    totalSurveys: surveys.data?.length ?? 0,
    totalReviews: reviews.data?.length ?? 0,
  };
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
