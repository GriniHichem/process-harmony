import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList, BarChart3, AlertTriangle, Globe } from "lucide-react";

interface Props {
  acteurId: string;
  acteurLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If set, only show implications related to these process IDs */
  allowedProcessIds?: string[] | null;
}

interface ImplicationItem {
  label: string;
  context: string;
  navigateTo: string;
}

interface SectionData {
  title: string;
  icon: React.ReactNode;
  items: ImplicationItem[];
}

export function ActeurImplicationsDialog({ acteurId, acteurLabel, open, onOpenChange, allowedProcessIds }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<SectionData[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    loadData();
  }, [open, acteurId]);

  const loadData = async () => {
    // Load reference data + implications in parallel
    const [
      { data: processes },
      { data: indicators },
      { data: risks },
      { data: issues },
      { data: tasks },
      { data: indActions },
      { data: indMoyens },
      { data: riskActions },
      { data: riskMoyens },
      { data: ctxActions },
    ] = await Promise.all([
      supabase.from("processes").select("id, nom"),
      supabase.from("indicators").select("id, nom, process_id"),
      supabase.from("risks_opportunities").select("id, description, process_id, type"),
      supabase.from("context_issues").select("id, intitule"),
      supabase.from("process_tasks").select("id, description, process_id").eq("responsable_id", acteurId),
      supabase.from("indicator_actions").select("id, description, indicator_id").eq("responsable", acteurId),
      supabase.from("indicator_moyens").select("id, description, indicator_id").eq("responsable", acteurId),
      supabase.from("risk_actions").select("id, description, risk_id").eq("responsable", acteurId),
      supabase.from("risk_moyens").select("id, description, risk_id").eq("responsable", acteurId),
      supabase.from("context_issue_actions").select("id, description, context_issue_id").eq("responsable", acteurId),
    ]);

    const procMap = Object.fromEntries((processes ?? []).map(p => [p.id, p.nom]));
    const indMap = Object.fromEntries((indicators ?? []).map(i => [i.id, i]));
    const riskMap = Object.fromEntries((risks ?? []).map(r => [r.id, r]));
    const issueMap = Object.fromEntries((issues ?? []).map(i => [i.id, i]));

    // Helper: check if a process ID is allowed
    const isAllowed = (processId: string | null | undefined) => {
      if (!allowedProcessIds) return true; // no filter
      return processId ? allowedProcessIds.includes(processId) : false;
    };

    const result: SectionData[] = [];

    // 1. Process tasks — filter by allowed processes
    const taskItems: ImplicationItem[] = (tasks ?? [])
      .filter(t => isAllowed(t.process_id))
      .map(t => ({
        label: t.description || "Activité",
        context: procMap[t.process_id] || "Processus",
        navigateTo: `/processus/${t.process_id}`,
      }));
    if (taskItems.length > 0) {
      result.push({ title: "Activités processus", icon: <ClipboardList className="h-4 w-4" />, items: taskItems });
    }

    // 2. Indicator actions & moyens
    const indItems: ImplicationItem[] = [];
    for (const a of (indActions ?? [])) {
      const ind = indMap[a.indicator_id];
      if (!isAllowed(ind?.process_id)) continue;
      const procName = ind ? procMap[ind.process_id] : "";
      indItems.push({
        label: `Action: ${a.description || "—"}`,
        context: `${ind?.nom || "Indicateur"} (${procName || "—"})`,
        navigateTo: `/indicateurs?indicator=${a.indicator_id}`,
      });
    }
    for (const m of (indMoyens ?? [])) {
      const ind = indMap[m.indicator_id];
      if (!isAllowed(ind?.process_id)) continue;
      const procName = ind ? procMap[ind.process_id] : "";
      indItems.push({
        label: `Moyen: ${m.description || "—"}`,
        context: `${ind?.nom || "Indicateur"} (${procName || "—"})`,
        navigateTo: `/indicateurs?indicator=${m.indicator_id}`,
      });
    }
    if (indItems.length > 0) {
      result.push({ title: "Indicateurs (Actions & Moyens)", icon: <BarChart3 className="h-4 w-4" />, items: indItems });
    }

    // 3. Risk actions & moyens
    const riskItems: ImplicationItem[] = [];
    for (const a of (riskActions ?? [])) {
      const r = riskMap[a.risk_id];
      if (!isAllowed(r?.process_id)) continue;
      const procName = r ? procMap[r.process_id] : "";
      riskItems.push({
        label: `Action: ${a.description || "—"}`,
        context: `${r?.description?.substring(0, 60) || "Risque"} (${procName || "—"})`,
        navigateTo: `/risques?risk=${a.risk_id}`,
      });
    }
    for (const m of (riskMoyens ?? [])) {
      const r = riskMap[m.risk_id];
      if (!isAllowed(r?.process_id)) continue;
      const procName = r ? procMap[r.process_id] : "";
      riskItems.push({
        label: `Moyen: ${m.description || "—"}`,
        context: `${r?.description?.substring(0, 60) || "Risque"} (${procName || "—"})`,
        navigateTo: `/risques?risk=${m.risk_id}`,
      });
    }
    if (riskItems.length > 0) {
      result.push({ title: "Risques & Opportunités (Actions & Moyens)", icon: <AlertTriangle className="h-4 w-4" />, items: riskItems });
    }

    // 4. Context issue actions
    const ctxItems: ImplicationItem[] = (ctxActions ?? []).map(a => {
      const issue = issueMap[a.context_issue_id];
      return {
        label: `Action: ${a.description || "—"}`,
        context: issue?.intitule || "Enjeu",
        navigateTo: `/enjeux-contexte?issue=${a.context_issue_id}`,
      };
    });
    if (ctxItems.length > 0) {
      result.push({ title: "Enjeux du contexte (Actions)", icon: <Globe className="h-4 w-4" />, items: ctxItems });
    }

    setSections(result);
    setLoading(false);
  };

  const handleClick = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const totalItems = sections.reduce((s, sec) => s + sec.items.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Implications de : {acteurLabel}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : totalItems === 0 ? (
          <p className="text-muted-foreground text-center py-8">Aucune implication trouvée pour cet acteur.</p>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {sections.map((sec) => (
                <div key={sec.title}>
                  <div className="flex items-center gap-2 mb-2">
                    {sec.icon}
                    <h3 className="font-semibold text-sm">{sec.title}</h3>
                    <Badge variant="secondary" className="ml-auto">{sec.items.length}</Badge>
                  </div>
                  <div className="space-y-1">
                    {sec.items.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => handleClick(item.navigateTo)}
                        className="w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors group"
                      >
                        <span className="text-sm">{item.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">({item.context})</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
