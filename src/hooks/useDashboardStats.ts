import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
}

async function fetchDashboardStats(): Promise<DashboardStats> {
  const [processes, audits, nc, actions, risks, indicators, incidentsOuverts, incidentsCritiques] = await Promise.all([
    supabase.from("processes").select("type_processus"),
    supabase.from("audits").select("statut").in("statut", ["planifie", "en_cours"]),
    supabase.from("nonconformities").select("statut").eq("statut", "ouverte"),
    supabase.from("actions").select("statut, echeance").in("statut", ["planifiee", "en_cours"]),
    supabase.from("risks_opportunities").select("id"),
    supabase.from("indicators").select("id"),
    supabase.from("risk_incidents").select("id").eq("statut", "ouvert"),
    supabase.from("risk_incidents").select("id").eq("gravite", "critique").neq("statut", "cloture"),
  ]);

  const p = processes.data ?? [];
  const overdueActions = (actions.data ?? []).filter(
    (a) => a.echeance && new Date(a.echeance) < new Date()
  ).length;

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
