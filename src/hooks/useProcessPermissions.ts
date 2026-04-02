import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ProcessPermissionLevel = "can_read" | "can_detail" | "can_comment" | "can_edit" | "can_version";

interface ProcessRolePermission {
  process_id: string;
  role: string | null;
  custom_role_id: string | null;
  can_read: boolean;
  can_detail: boolean;
  can_comment: boolean;
  can_edit: boolean;
  can_version: boolean;
}

export function useProcessPermissions() {
  const { user, roles, hasRole } = useAuth();
  const [permissions, setPermissions] = useState<ProcessRolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        // Fetch all process_role_permissions (they're small enough to cache client-side)
        const { data } = await supabase
          .from("process_role_permissions")
          .select("*");
        setPermissions((data ?? []) as ProcessRolePermission[]);
      } catch (err) {
        console.error("Error fetching process permissions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user]);

  /**
   * Check if the current user has a specific permission on a process.
   * Resolution: 
   *   1. Admin/Super Admin → always true
   *   2. Check process-specific overrides for user's roles
   *   3. If no override → fallback to global module permission (handled by caller)
   * Returns: true/false if override exists, undefined if no override (use global fallback)
   */
  const hasProcessPermission = useCallback(
    (processId: string, level: ProcessPermissionLevel): boolean | undefined => {
      // Admin/Super Admin bypass
      if (hasRole("admin") || hasRole("super_admin")) return true;

      // Find matching permissions for this process and user's roles
      const matching = permissions.filter(
        (p) => p.process_id === processId && (
          (p.role && roles.includes(p.role as any)) ||
          (p.custom_role_id !== null) // Custom roles are checked separately
        )
      );

      if (matching.length === 0) return undefined; // No override → use global

      // Most permissive wins (OR logic)
      return matching.some((p) => p[level]);
    },
    [permissions, roles, hasRole]
  );

  /**
   * Check permission with fallback to global module permission.
   * If no process-specific override exists, falls back to the global "processus" module permission.
   */
  const checkProcessPermission = useCallback(
    (processId: string, level: ProcessPermissionLevel, globalFallback: boolean): boolean => {
      if (hasRole("admin") || hasRole("super_admin")) return true;
      const override = hasProcessPermission(processId, level);
      if (override !== undefined) return override;
      return globalFallback;
    },
    [hasProcessPermission, hasRole]
  );

  return {
    permissions,
    loading,
    hasProcessPermission,
    checkProcessPermission,
  };
}
