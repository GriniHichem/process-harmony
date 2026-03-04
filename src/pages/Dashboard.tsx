import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Network, ClipboardCheck, XCircle, Zap, AlertTriangle, BarChart3 } from "lucide-react";

interface DashboardStats {
  totalProcesses: number;
  processesByType: { pilotage: number; realisation: number; support: number };
  openAudits: number;
  openNC: number;
  overdueActions: number;
  totalRisks: number;
  totalIndicators: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProcesses: 0,
    processesByType: { pilotage: 0, realisation: 0, support: 0 },
    openAudits: 0,
    openNC: 0,
    overdueActions: 0,
    totalRisks: 0,
    totalIndicators: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [processes, audits, nc, actions, risks, indicators] = await Promise.all([
        supabase.from("processes").select("type_processus"),
        supabase.from("audits").select("statut").in("statut", ["planifie", "en_cours"]),
        supabase.from("nonconformities").select("statut").eq("statut", "ouverte"),
        supabase.from("actions").select("statut, echeance").in("statut", ["planifiee", "en_cours"]),
        supabase.from("risks_opportunities").select("id"),
        supabase.from("indicators").select("id"),
      ]);

      const p = processes.data ?? [];
      const overdueActions = (actions.data ?? []).filter(
        (a) => a.echeance && new Date(a.echeance) < new Date()
      ).length;

      setStats({
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
      });
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const cards = [
    { label: "Processus", value: stats.totalProcesses, icon: Network, desc: `P:${stats.processesByType.pilotage} R:${stats.processesByType.realisation} S:${stats.processesByType.support}`, color: "text-primary" },
    { label: "Audits en cours", value: stats.openAudits, icon: ClipboardCheck, desc: "Planifiés ou en cours", color: "text-accent" },
    { label: "NC ouvertes", value: stats.openNC, icon: XCircle, desc: "Non-conformités ouvertes", color: "text-destructive" },
    { label: "Actions en retard", value: stats.overdueActions, icon: Zap, desc: "Échéance dépassée", color: "text-warning" },
    { label: "Risques identifiés", value: stats.totalRisks, icon: AlertTriangle, desc: "Risques & opportunités", color: "text-orange-500" },
    { label: "Indicateurs", value: stats.totalIndicators, icon: BarChart3, desc: "Indicateurs définis", color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground">Vue d'ensemble du système qualité</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
