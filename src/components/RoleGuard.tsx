import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";

type AppRole = "admin" | "rmq" | "responsable_processus" | "consultant" | "auditeur" | "acteur";

interface RoleGuardProps {
  children: React.ReactNode;
  /** User must have at least one of these roles */
  allowedRoles?: AppRole[];
  /** User must NOT have only these roles (block if all roles match) */
  blockedOnlyRoles?: AppRole[];
  /** Redirect instead of showing message */
  redirectTo?: string;
}

export function RoleGuard({ children, allowedRoles, blockedOnlyRoles, redirectTo }: RoleGuardProps) {
  const { roles } = useAuth();

  let allowed = true;

  if (allowedRoles && allowedRoles.length > 0) {
    allowed = roles.some((r) => allowedRoles.includes(r));
  }

  if (blockedOnlyRoles && blockedOnlyRoles.length > 0) {
    const isOnlyBlocked = roles.length > 0 && roles.every((r) => blockedOnlyRoles.includes(r));
    if (isOnlyBlocked) allowed = false;
  }

  if (!allowed) {
    if (redirectTo) return <Navigate to={redirectTo} replace />;
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Vous n'avez pas les droits pour accéder à cette page.
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
