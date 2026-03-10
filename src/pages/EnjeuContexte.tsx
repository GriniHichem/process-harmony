import { useAuth } from "@/contexts/AuthContext";
import { ContextIssuesManager } from "@/components/ContextIssuesManager";

export default function EnjeuContexte() {
  const { role } = useAuth();
  const canEdit = role === "admin" || role === "rmq" || role === "responsable_processus" || role === "consultant";
  const canDelete = role === "admin" || role === "rmq";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Enjeux du contexte</h1>
        <p className="text-muted-foreground">Identification et suivi des enjeux internes et externes</p>
      </div>
      <ContextIssuesManager canEdit={canEdit} canDelete={canDelete} />
    </div>
  );
}
