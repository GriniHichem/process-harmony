import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  type AppModule,
  type PermissionLevel,
  type ModulePermissions,
  type AppRole,
  getEffectivePermission,
} from "@/lib/defaultPermissions";

interface Profile {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  fonction: string;
  actif: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
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
  const [loading, setLoading] = useState(true);
  const [permOverrides, setPermOverrides] = useState<Record<string, ModulePermissions>>({});

  const hasRole = useCallback((role: AppRole) => roles.includes(role), [roles]);

  const hasPermission = useCallback(
    (module: AppModule, level: PermissionLevel): boolean => {
      if (roles.length === 0) return false;
      return getEffectivePermission(roles, module, level, permOverrides);
    },
    [roles, permOverrides]
  );

  const fetchUserData = async (userId: string) => {
    try {
      const [profileRes, rolesRes, permRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("role_permissions").select("*"),
      ]);
      if (profileRes.data) setProfile(profileRes.data as Profile);
      if (rolesRes.data) {
        setRoles(rolesRes.data.map((r) => r.role as AppRole));
      }
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
    } catch (err) {
      console.error("Error fetching user data:", err);
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
          setPermOverrides({});
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
    setPermOverrides({});
  };

  // Backward compat: role = first role (priority: admin > rmq > others)
  const priorityOrder: AppRole[] = ["admin", "rmq", "responsable_processus", "consultant", "auditeur", "acteur"];
  const role = priorityOrder.find((r) => roles.includes(r)) ?? null;

  return (
    <AuthContext.Provider value={{ user, session, profile, roles, role, loading, hasRole, hasPermission, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
