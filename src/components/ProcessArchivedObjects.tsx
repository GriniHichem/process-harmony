import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, ShieldAlert, ClipboardCheck, FileText, AlertTriangle } from "lucide-react";

interface Props {
  processId: string;
}

export function ProcessArchivedObjects({ processId }: Props) {
  const [indicators, setIndicators] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [ncs, setNcs] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const [indRes, riskRes, ncRes] = await Promise.all([
        supabase.from("indicators").select("*").eq("process_id", processId),
        supabase.from("risks_opportunities").select("*").eq("process_id", processId),
        supabase.from("nonconformities").select("*").eq("process_id", processId),
      ]);
      setIndicators(indRes.data ?? []);
      setRisks(riskRes.data ?? []);
      setNcs(ncRes.data ?? []);

      // Fetch actions linked to risks/NCs of this process
      const riskIds = (riskRes.data ?? []).map(r => r.id);
      const ncIds = (ncRes.data ?? []).map(n => n.id);
      const allSourceIds = [...riskIds, ...ncIds];
      if (allSourceIds.length > 0) {
        const { data: actionsData } = await supabase.from("actions").select("*").in("source_id", allSourceIds);
        setActions(actionsData ?? []);
      }
      setLoading(false);
    };
    fetchAll();
  }, [processId]);

  if (loading) return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;

  const severityLabels: Record<string, string> = { mineure: "Mineure", majeure: "Majeure", critique: "Critique" };
  const statusLabels: Record<string, string> = { ouverte: "Ouverte", en_traitement: "En traitement", cloturee: "Clôturée", correction: "Correction", analyse_cause: "Analyse cause", action_corrective: "Action corrective", verification: "Vérification" };
  const actionStatusLabels: Record<string, string> = { planifiee: "Planifiée", en_cours: "En cours", realisee: "Réalisée", verifiee: "Vérifiée", cloturee: "Clôturée", en_retard: "En retard" };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        Version archivée — Données en lecture seule
      </div>

      {/* Indicateurs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Indicateurs ({indicators.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {indicators.length === 0 ? <p className="text-sm text-muted-foreground">Aucun indicateur</p> : (
            <div className="space-y-2">
              {indicators.map(ind => (
                <div key={ind.id} className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm">
                  <span className="font-medium">{ind.nom}</span>
                  <div className="flex items-center gap-2">
                    {ind.cible != null && <span className="text-xs text-muted-foreground">Cible: {ind.cible} {ind.unite ?? ""}</span>}
                    <Badge variant="outline" className="text-xs">{ind.frequence}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Risques & Opportunités */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" /> Risques & Opportunités ({risks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {risks.length === 0 ? <p className="text-sm text-muted-foreground">Aucun risque ou opportunité</p> : (
            <div className="space-y-2">
              {risks.map(r => (
                <div key={r.id} className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm">
                  <span>{r.description}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.type === "risque" ? "destructive" : "default"} className="text-xs">{r.type === "risque" ? "Risque" : "Opportunité"}</Badge>
                    {r.criticite != null && <span className="text-xs text-muted-foreground">C: {r.criticite}</span>}
                    <Badge variant="outline" className="text-xs">{r.statut}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Non-conformités */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><ClipboardCheck className="h-4 w-4 text-primary" /> Non-conformités ({ncs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {ncs.length === 0 ? <p className="text-sm text-muted-foreground">Aucune non-conformité</p> : (
            <div className="space-y-2">
              {ncs.map(nc => (
                <div key={nc.id} className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm">
                  <div>
                    <span className="font-mono text-xs text-primary mr-2">{nc.reference}</span>
                    <span>{nc.description}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{severityLabels[nc.gravite] ?? nc.gravite}</Badge>
                    <Badge variant="secondary" className="text-xs">{statusLabels[nc.statut] ?? nc.statut}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Actions liées ({actions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? <p className="text-sm text-muted-foreground">Aucune action</p> : (
            <div className="space-y-2">
              {actions.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm">
                  <span>{a.description}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{a.type_action}</Badge>
                    <Badge variant="secondary" className="text-xs">{actionStatusLabels[a.statut] ?? a.statut}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
