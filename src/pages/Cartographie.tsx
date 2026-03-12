import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { HelpTooltip } from "@/components/HelpTooltip";

type Process = { id: string; code: string; nom: string; type_processus: string; statut: string };

const columnConfig = [
  { type: "pilotage", label: "Processus de management", color: "bg-primary/10 border-primary/30" },
  { type: "realisation", label: "Processus de réalisation", color: "bg-accent/10 border-accent/30" },
  { type: "support", label: "Processus support", color: "bg-secondary border-secondary" },
];

export default function Cartographie() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("processes").select("id, code, nom, type_processus, statut").order("code").then(({ data }) => {
      setProcesses((data ?? []) as Process[]);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">Cartographie des processus <HelpTooltip term="cartographie" /></h1>
        <p className="text-muted-foreground">Vue d'ensemble organisée par type</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {columnConfig.map((col) => {
          const items = processes.filter((p) => p.type_processus === col.type);
          return (
            <div key={col.type} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{col.label}</h2>
              <div className={`rounded-xl border-2 border-dashed p-4 min-h-[200px] space-y-2 ${col.color}`}>
                {items.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Aucun processus</p>}
                {items.map((p) => (
                  <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/processus/${p.id}`)}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-xs text-primary">{p.code}</span>
                          <p className="font-medium text-sm">{p.nom}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs">{p.statut.replace("_", " ")}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
