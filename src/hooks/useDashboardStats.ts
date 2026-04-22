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
    supabase.from("project_actions").select("id, project_id, statut, echeance, avancement, title, multi_tasks, poids"),
    supabase.from("project_tasks").select("id, action_id, statut, echeance, avancement"),
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

  // Build tasks-by-action map for normalized progress
  const tasksByAction: Record<string, any[]> = {};
  allProjTasks.forEach((t: any) => {
    if (!tasksByAction[t.action_id]) tasksByAction[t.action_id] = [];
    tasksByAction[t.action_id].push(t);
  });

  // Average project progress across active projects (using same weighted formula as list/planning)
  const activeProjects = allProjects.filter((pr) => pr.statut === "en_cours");
  const projectProgressMap: Record<string, number> = {};
  activeProjects.forEach((pr) => {
    const pActs = allProjActions.filter((a: any) => a.project_id === pr.id);
    projectProgressMap[pr.id] = computeProjectProgress(pActs as any, tasksByAction);
  });
  const avgAvancement = activeProjects.length > 0
    ? Math.round(Object.values(projectProgressMap).reduce((s, v) => s + v, 0) / activeProjects.length)
    : 0;

  const projOverdueTasks = allProjTasks.filter(
    (t) => t.echeance && new Date(t.echeance) < new Date() && t.statut !== "terminee"
  ).length;

  // Project summaries (active projects)
  const projectSummaries: ProjectSummary[] = activeProjects.map((pr) => {
    const pActions = allProjActions.filter((a: any) => a.project_id === pr.id);
    const overdue = pActions.filter(
      (a: any) => a.echeance && new Date(a.echeance) < new Date() && a.statut !== "terminee"
    ).length;
    return {
      id: pr.id,
      title: pr.title,
      statut: pr.statut,
      actionCount: pActions.length,
      avgAvancement: projectProgressMap[pr.id] ?? 0,
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
