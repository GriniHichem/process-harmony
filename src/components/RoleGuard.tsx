import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import type { AppModule, PermissionLevel, AppRole } from "@/lib/defaultPermissions";

interface RoleGuardProps {
  children: React.ReactNode;
  /** User must have at least one of these roles */
  allowedRoles?: AppRole[];
  /** User must NOT have only these roles (block if all roles match) */
  blockedOnlyRoles?: AppRole[];
  /** Permission-based access: module + required level */
  requiredModule?: AppModule;
  requiredLevel?: PermissionLevel;
  /** Redirect instead of showing message */
  redirectTo?: string;
}

export function RoleGuard({ children, allowedRoles, blockedOnlyRoles, requiredModule, requiredLevel = "can_read", redirectTo }: RoleGuardProps) {
  const { roles, hasPermission, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  let allowed = true;

  // New permission-based check takes priority if specified
  if (requiredModule) {
    allowed = hasPermission(requiredModule, requiredLevel);
  } else {
    // Legacy role-based checks
    if (allowedRoles && allowedRoles.length > 0) {
      allowed = roles.some((r) => allowedRoles.includes(r));
    }

    if (blockedOnlyRoles && blockedOnlyRoles.length > 0) {
      const isOnlyBlocked = roles.length > 0 && roles.every((r) => blockedOnlyRoles.includes(r));
      if (isOnlyBlocked) allowed = false;
    }
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
