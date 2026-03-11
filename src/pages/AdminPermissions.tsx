import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Save, Shield } from "lucide-react";
import {
  ALL_MODULES,
  ALL_ROLES,
  MODULE_LABELS,
  ROLE_LABELS,
  DEFAULT_PERMISSIONS,
  type AppRole,
  type AppModule,
  type ModulePermissions,
  type PermissionLevel,
} from "@/lib/defaultPermissions";

const PERM_LEVELS: { key: PermissionLevel; label: string }[] = [
  { key: "can_read", label: "Lecture" },
  { key: "can_read_detail", label: "Détail" },
  { key: "can_edit", label: "Modifier" },
  { key: "can_delete", label: "Supprimer" },
];

const NON_ADMIN_ROLES = ALL_ROLES.filter((r) => r !== "admin") as Exclude<AppRole, "admin">[];

export default function AdminPermissions() {
  const { hasRole } = useAuth();
  // State: role:module -> ModulePermissions (only overrides loaded from DB)
  const [overrides, setOverrides] = useState<Record<string, ModulePermissions>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadOverrides();
  }, []);

  const loadOverrides = async () => {
    const { data } = await supabase.from("role_permissions").select("*");
    if (data) {
      const map: Record<string, ModulePermissions> = {};
      for (const row of data) {
        map[`${row.role}:${row.module}`] = {
          can_read: row.can_read,
          can_read_detail: row.can_read_detail,
          can_edit: row.can_edit,
          can_delete: row.can_delete,
        };
      }
      setOverrides(map);
    }
    setLoaded(true);
  };

  const getPermValue = (role: Exclude<AppRole, "admin">, module: AppModule, level: PermissionLevel): boolean => {
    const key = `${role}:${module}`;
    if (overrides[key]) return overrides[key][level];
    return DEFAULT_PERMISSIONS[role][module]?.[level] ?? false;
  };

  const isOverridden = (role: Exclude<AppRole, "admin">, module: AppModule): boolean => {
    return !!overrides[`${role}:${module}`];
  };

  const togglePerm = (role: Exclude<AppRole, "admin">, module: AppModule, level: PermissionLevel) => {
    const key = `${role}:${module}`;
    const current = getPermValue(role, module, level);
    const existing = overrides[key] || {
      can_read: DEFAULT_PERMISSIONS[role][module]?.can_read ?? false,
      can_read_detail: DEFAULT_PERMISSIONS[role][module]?.can_read_detail ?? false,
      can_edit: DEFAULT_PERMISSIONS[role][module]?.can_edit ?? false,
      can_delete: DEFAULT_PERMISSIONS[role][module]?.can_delete ?? false,
    };
    setOverrides((prev) => ({
      ...prev,
      [key]: { ...existing, [level]: !current },
    }));
  };

  const resetToDefault = (role: Exclude<AppRole, "admin">, module: AppModule) => {
    const key = `${role}:${module}`;
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Delete all existing overrides, then insert current ones
      await supabase.from("role_permissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const rows = Object.entries(overrides).map(([key, perms]) => {
        const [role, module] = key.split(":");
        return {
          role: role as AppRole,
          module,
          can_read: perms.can_read,
          can_read_detail: perms.can_read_detail,
          can_edit: perms.can_edit,
          can_delete: perms.can_delete,
        };
      });

      if (rows.length > 0) {
        const { error } = await supabase.from("role_permissions").insert(rows);
        if (error) throw error;
      }

      toast.success("Permissions sauvegardées avec succès");
    } catch (err: any) {
      toast.error("Erreur lors de la sauvegarde : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!hasRole("admin")) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Accès réservé aux administrateurs.
        </CardContent>
      </Card>
    );
  }

  if (!loaded) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Chargement...</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gestion des permissions</h1>
            <p className="text-sm text-muted-foreground">
              Configurez les droits d'accès par rôle et par module. Le rôle Admin a toujours un accès complet.
            </p>
          </div>
        </div>
        <Button onClick={saveAll} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </Button>
      </div>

      {NON_ADMIN_ROLES.map((role) => (
        <Card key={role}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{ROLE_LABELS[role]}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Module</TableHead>
                    {PERM_LEVELS.map((p) => (
                      <TableHead key={p.key} className="text-center w-24">{p.label}</TableHead>
                    ))}
                    <TableHead className="text-center w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ALL_MODULES.map((mod) => (
                    <TableRow key={mod} className={isOverridden(role, mod) ? "bg-accent/30" : ""}>
                      <TableCell className="font-medium text-sm">{MODULE_LABELS[mod]}</TableCell>
                      {PERM_LEVELS.map((p) => (
                        <TableCell key={p.key} className="text-center">
                          <Checkbox
                            checked={getPermValue(role, mod, p.key)}
                            onCheckedChange={() => togglePerm(role, mod, p.key)}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        {isOverridden(role, mod) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => resetToDefault(role, mod)}
                          >
                            Réinitialiser
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
