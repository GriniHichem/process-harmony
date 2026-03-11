import { useAuth } from "@/contexts/AuthContext";
import { ContextIssuesManager } from "@/components/ContextIssuesManager";

export default function EnjeuContexte() {
  const { hasRole, user } = useAuth();
  const canEdit = hasRole("admin") || hasRole("rmq") || hasRole("responsable_processus") || hasRole("consultant");
  const canDelete = hasRole("admin") || hasRole("rmq");
  const isOnlyResponsable = hasRole("responsable_processus") && !hasRole("admin") && !hasRole("rmq");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enjeux du contexte</h1>
        <p className="text-muted-foreground">Identification et suivi des enjeux internes et externes</p>
      </div>
      <ContextIssuesManager canEdit={canEdit} canDelete={canDelete} userId={user?.id} isOnlyResponsable={isOnlyResponsable} />
    </div>
  );
}
