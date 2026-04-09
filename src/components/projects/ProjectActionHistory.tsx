import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface HistoryEntry {
  id: string;
  action_id: string;
  user_id: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

const FIELD_LABELS: Record<string, string> = {
  title: "Titre",
  description: "Description",
  statut: "Statut",
  avancement: "Avancement",
  echeance: "Échéance",
  date_debut: "Date début",
  responsable_id: "Responsable 1",
  responsable_id_2: "Responsable 2",
  responsable_id_3: "Responsable 3",
  responsable_user_id: "Utilisateur responsable",
  multi_tasks: "Multi-tâches",
  pinned: "Épinglé",
  poids: "Poids",
  ordre: "Ordre",
};

const STATUS_LABELS: Record<string, string> = {
  planifiee: "Planifiée",
  en_cours: "En cours",
  terminee: "Terminée",
  en_retard: "En retard",
  bloquee: "Bloquée",
  annulee: "Annulée",
};

interface Props {
  actionId: string;
  actionTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectActionHistory({ actionId, actionTitle, open, onOpenChange }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("project_action_history")
        .select("*")
        .eq("action_id", actionId)
        .order("created_at", { ascending: false })
        .limit(100);
      const items = (data ?? []) as HistoryEntry[];
      setEntries(items);

      const userIds = [...new Set(items.map(e => e.user_id).filter(Boolean))] as string[];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, nom, prenom, email")
          .in("id", userIds);
        const map: Record<string, string> = {};
        (profs ?? []).forEach((p: any) => {
          map[p.id] = `${p.prenom || ""} ${p.nom || ""}`.trim() || p.email || "Utilisateur";
        });
        setProfiles(map);
      }
    })();
  }, [open, actionId]);

  const formatValue = (field: string, value: string | null) => {
    if (value === null || value === "") return "—";
    if (field === "statut") return STATUS_LABELS[value] ?? value;
    if (field === "avancement") return `${value}%`;
    if (field === "multi_tasks" || field === "pinned") return value === "true" ? "Oui" : "Non";
    if (field === "poids") return value ? `${value}%` : "Auto";
    if (value.length > 80) return value.substring(0, 80) + "…";
    return value;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Historique — {actionTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aucune modification enregistrée</p>
          ) : (
            entries.map(entry => (
              <div key={entry.id} className="rounded-lg border border-border/30 p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{FIELD_LABELS[entry.field_name] ?? entry.field_name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(parseISO(entry.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline" className="text-destructive/80 border-destructive/20 max-w-[180px] truncate">
                    {formatValue(entry.field_name, entry.old_value)}
                  </Badge>
                  <span className="text-muted-foreground">→</span>
                  <Badge className="bg-primary/15 text-primary max-w-[180px] truncate">
                    {formatValue(entry.field_name, entry.new_value)}
                  </Badge>
                </div>
                {entry.user_id && (
                  <p className="text-[10px] text-muted-foreground">
                    Par {profiles[entry.user_id] ?? "…"}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
