import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ContextIssuesManager } from "@/components/ContextIssuesManager";
import { supabase } from "@/integrations/supabase/client";

export default function EnjeuContexte() {
  const { hasRole, user } = useAuth();
  const isOnlyActeur = hasRole("acteur") && !hasRole("admin") && !hasRole("rmq") && !hasRole("responsable_processus") && !hasRole("consultant");
  const canEdit = !isOnlyActeur && (hasRole("admin") || hasRole("rmq") || hasRole("responsable_processus") || hasRole("consultant"));
  const canDelete = hasRole("admin") || hasRole("rmq");
  const isOnlyResponsable = hasRole("responsable_processus") && !hasRole("admin") && !hasRole("rmq");

  const [acteurProcessIds, setActeurProcessIds] = useState<string[] | undefined>(undefined);
  const [acteurId, setActeurId] = useState<string | null>(null);
  const [ready, setReady] = useState(!isOnlyActeur);

  useEffect(() => {
    if (!isOnlyActeur || !user) return;
    (async () => {
      const { data: profileData } = await supabase.from("profiles").select("acteur_id").eq("id", user.id).single();
      const acteurId = profileData?.acteur_id;
      if (acteurId_) {
        setActeurId(acteurId_);
        const { data: taskData } = await supabase.from("process_tasks").select("process_id").eq("responsable_id", acteurId);
        setActeurProcessIds([...new Set((taskData ?? []).map(t => t.process_id))]);
      } else {
        setActeurProcessIds([]);
      }
      setReady(true);
    })();
  }, [isOnlyActeur, user]);

  if (!ready) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enjeux du contexte</h1>
        <p className="text-muted-foreground">Identification et suivi des enjeux internes et externes</p>
      </div>
      <ContextIssuesManager
        canEdit={canEdit}
        canDelete={canDelete}
        userId={user?.id}
        isOnlyResponsable={isOnlyResponsable || isOnlyActeur}
        filterProcessIds={acteurProcessIds}
      />
    </div>
  );
}
