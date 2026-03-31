import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";
import {
  type AppModule,
  type PermissionLevel,
  type ModulePermissions,
  type AppRole,
  type CustomRolePermissions,
  getEffectivePermission,
} from "@/lib/defaultPermissions";

interface Profile {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  fonction: string;
  actif: boolean;
  acteur_id: string | null;
}

export interface CustomRole {
  id: string;
  nom: string;
  description: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  customRoles: CustomRole[];
  /** @deprecated use hasRole() instead */
  role: AppRole | null;
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  hasPermission: (module: AppModule, level: PermissionLevel) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  roles: [],
  customRoles: [],
  role: null,
  loading: true,
  hasRole: () => false,
  hasPermission: () => false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [customRoleIds, setCustomRoleIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [permOverrides, setPermOverrides] = useState<Record<string, ModulePermissions>>({});
  const [customRolePerms, setCustomRolePerms] = useState<CustomRolePermissions>({});

  const hasRole = useCallback((role: AppRole) => {
    if (role === "admin" && roles.includes("super_admin")) return true;
    return roles.includes(role);
  }, [roles]);

  const hasPermission = useCallback(
    (module: AppModule, level: PermissionLevel): boolean => {
      if (roles.length === 0 && customRoleIds.length === 0) return false;
      return getEffectivePermission(roles, module, level, permOverrides, customRoleIds, customRolePerms);
    },
    [roles, permOverrides, customRoleIds, customRolePerms]
  );

  const fetchUserData = async (userId: string) => {
    try {
      setDataLoaded(false);
      const [profileRes, rolesRes, permRes, userCustomRolesRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("role_permissions").select("*"),
        supabase.from("user_custom_roles").select("custom_role_id, custom_roles(id, nom, description)").eq("user_id", userId),
      ]);

      if (profileRes.data) setProfile(profileRes.data as Profile);
      if (rolesRes.data) {
        setRoles(rolesRes.data.map((r) => r.role as AppRole));
      }

      // Standard role overrides
      if (permRes.data) {
        const overrides: Record<string, ModulePermissions> = {};
        for (const row of permRes.data) {
          overrides[`${row.role}:${row.module}`] = {
            can_read: row.can_read,
            can_read_detail: row.can_read_detail,
            can_edit: row.can_edit,
            can_delete: row.can_delete,
          };
        }
        setPermOverrides(overrides);
      }

      // Custom roles
      if (userCustomRolesRes.data) {
        const crIds: string[] = [];
        const crs: CustomRole[] = [];
        for (const ucr of userCustomRolesRes.data as any[]) {
          crIds.push(ucr.custom_role_id);
          if (ucr.custom_roles) {
            crs.push(ucr.custom_roles as CustomRole);
          }
        }
        setCustomRoleIds(crIds);
        setCustomRoles(crs);

        // Load custom role permissions
        if (crIds.length > 0) {
          const { data: crpData } = await supabase
            .from("custom_role_permissions")
            .select("*")
            .in("custom_role_id", crIds);
          if (crpData) {
            const crPerms: CustomRolePermissions = {};
            for (const row of crpData) {
              crPerms[`${row.custom_role_id}:${row.module}`] = {
                can_read: row.can_read,
                can_read_detail: row.can_read_detail,
                can_edit: row.can_edit,
                can_delete: row.can_delete,
              };
            }
            setCustomRolePerms(crPerms);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching user data:", err);
    } finally {
      setDataLoaded(true);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setProfile(null);
          setRoles([]);
          setCustomRoles([]);
          setCustomRoleIds([]);
          setPermOverrides({});
          setCustomRolePerms({});
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setCustomRoles([]);
    setCustomRoleIds([]);
    setPermOverrides({});
    setCustomRolePerms({});
  };

  // Backward compat: role = first role (priority: admin > rmq > others)
  const priorityOrder: AppRole[] = ["super_admin", "admin", "rmq", "responsable_processus", "consultant", "auditeur", "acteur"];
  const role = priorityOrder.find((r) => roles.includes(r)) ?? null;

  const isFullyLoaded = !loading && (user ? dataLoaded : true);

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, customRoles, role, loading: !isFullyLoaded, hasRole, hasPermission, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
