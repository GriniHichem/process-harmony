import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Save, Shield, Plus, Trash2, Copy } from "lucide-react";
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

interface CustomRole {
  id: string;
  nom: string;
  description: string;
}

export default function AdminPermissions() {
  const { hasRole } = useAuth();
  // Standard role overrides
  const [overrides, setOverrides] = useState<Record<string, ModulePermissions>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Custom roles
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [customPerms, setCustomPerms] = useState<Record<string, ModulePermissions>>({});
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [duplicateFrom, setDuplicateFrom] = useState<string>("none");
  const [deleteRole, setDeleteRole] = useState<CustomRole | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [permRes, crRes, crpRes] = await Promise.all([
      supabase.from("role_permissions").select("*"),
      supabase.from("custom_roles").select("*").order("nom"),
      supabase.from("custom_role_permissions").select("*"),
    ]);

    if (permRes.data) {
      const map: Record<string, ModulePermissions> = {};
      for (const row of permRes.data) {
        map[`${row.role}:${row.module}`] = {
          can_read: row.can_read, can_read_detail: row.can_read_detail,
          can_edit: row.can_edit, can_delete: row.can_delete,
        };
      }
      setOverrides(map);
    }

    if (crRes.data) setCustomRoles(crRes.data as CustomRole[]);

    if (crpRes.data) {
      const map: Record<string, ModulePermissions> = {};
      for (const row of crpRes.data) {
        map[`${row.custom_role_id}:${row.module}`] = {
          can_read: row.can_read, can_read_detail: row.can_read_detail,
          can_edit: row.can_edit, can_delete: row.can_delete,
        };
      }
      setCustomPerms(map);
    }

    setLoaded(true);
  };

  // --- Standard role permission helpers ---
  const getPermValue = (role: Exclude<AppRole, "admin">, module: AppModule, level: PermissionLevel): boolean => {
    const key = `${role}:${module}`;
    if (overrides[key]) return overrides[key][level];
    return DEFAULT_PERMISSIONS[role][module]?.[level] ?? false;
  };

  const isOverridden = (role: Exclude<AppRole, "admin">, module: AppModule): boolean => !!overrides[`${role}:${module}`];

  const togglePerm = (role: Exclude<AppRole, "admin">, module: AppModule, level: PermissionLevel) => {
    const key = `${role}:${module}`;
    const current = getPermValue(role, module, level);
    const existing = overrides[key] || {
      can_read: DEFAULT_PERMISSIONS[role][module]?.can_read ?? false,
      can_read_detail: DEFAULT_PERMISSIONS[role][module]?.can_read_detail ?? false,
      can_edit: DEFAULT_PERMISSIONS[role][module]?.can_edit ?? false,
      can_delete: DEFAULT_PERMISSIONS[role][module]?.can_delete ?? false,
    };
    setOverrides((prev) => ({ ...prev, [key]: { ...existing, [level]: !current } }));
  };

  const resetToDefault = (role: Exclude<AppRole, "admin">, module: AppModule) => {
    setOverrides((prev) => { const next = { ...prev }; delete next[`${role}:${module}`]; return next; });
  };

  // --- Custom role permission helpers ---
  const getCustomPermValue = (crId: string, module: AppModule, level: PermissionLevel): boolean => {
    return customPerms[`${crId}:${module}`]?.[level] ?? false;
  };

  const toggleCustomPerm = (crId: string, module: AppModule, level: PermissionLevel) => {
    const key = `${crId}:${module}`;
    const current = getCustomPermValue(crId, module, level);
    const existing = customPerms[key] || { can_read: false, can_read_detail: false, can_edit: false, can_delete: false };
    setCustomPerms((prev) => ({ ...prev, [key]: { ...existing, [level]: !current } }));
  };

  // --- Create custom role ---
  const handleCreateRole = async () => {
    if (!newRoleName.trim()) { toast.error("Le nom est requis"); return; }
    const { data, error } = await supabase.from("custom_roles").insert({ nom: newRoleName.trim(), description: newRoleDesc.trim() }).select().single();
    if (error) { toast.error(error.message); return; }

    const newRole = data as CustomRole;
    setCustomRoles((prev) => [...prev, newRole]);

    // If duplicating, copy permissions
    if (duplicateFrom !== "none" && duplicateFrom) {
      const permsToInsert: Record<string, ModulePermissions> = {};

      if (duplicateFrom.startsWith("custom:")) {
        // Duplicate from custom role
        const sourceId = duplicateFrom.replace("custom:", "");
        for (const mod of ALL_MODULES) {
          const key = `${sourceId}:${mod}`;
          if (customPerms[key]) {
            permsToInsert[`${newRole.id}:${mod}`] = { ...customPerms[key] };
          }
        }
      } else {
        // Duplicate from standard role
        const sourceRole = duplicateFrom as Exclude<AppRole, "admin">;
        const defaults = DEFAULT_PERMISSIONS[sourceRole];
        if (defaults) {
          for (const mod of ALL_MODULES) {
            // Use override if exists, else default
            const overrideKey = `${sourceRole}:${mod}`;
            const perms = overrides[overrideKey] || defaults[mod];
            if (perms) {
              permsToInsert[`${newRole.id}:${mod}`] = { ...perms };
            }
          }
        }
      }

      // Save to DB
      const rows = Object.entries(permsToInsert).map(([key, perms]) => {
        const mod = key.split(":")[1];
        return { custom_role_id: newRole.id, module: mod, ...perms };
      });

      if (rows.length > 0) {
        await supabase.from("custom_role_permissions").insert(rows);
      }

      setCustomPerms((prev) => ({ ...prev, ...permsToInsert }));
    }

    setCreateDialogOpen(false);
    setNewRoleName("");
    setNewRoleDesc("");
    setDuplicateFrom("none");
    toast.success(`Rôle "${newRole.nom}" créé`);
  };

  // --- Delete custom role ---
  const handleDeleteRole = async () => {
    if (!deleteRole) return;
    const { error } = await supabase.from("custom_roles").delete().eq("id", deleteRole.id);
    if (error) { toast.error(error.message); return; }
    setCustomRoles((prev) => prev.filter((r) => r.id !== deleteRole.id));
    setCustomPerms((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        if (key.startsWith(`${deleteRole.id}:`)) delete next[key];
      }
      return next;
    });
    setDeleteRole(null);
    toast.success("Rôle supprimé");
  };

  // --- Save all ---
  const saveAll = async () => {
    setSaving(true);
    try {
      // Save standard overrides
      await supabase.from("role_permissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const stdRows = Object.entries(overrides).map(([key, perms]) => {
        const [role, module] = key.split(":");
        return { role: role as AppRole, module, ...perms };
      });
      if (stdRows.length > 0) {
        const { error } = await supabase.from("role_permissions").insert(stdRows);
        if (error) throw error;
      }

      // Save custom role permissions
      for (const cr of customRoles) {
        await supabase.from("custom_role_permissions").delete().eq("custom_role_id", cr.id);
        const crRows = ALL_MODULES
          .filter((mod) => customPerms[`${cr.id}:${mod}`])
          .map((mod) => ({
            custom_role_id: cr.id,
            module: mod,
            ...customPerms[`${cr.id}:${mod}`],
          }));
        if (crRows.length > 0) {
          const { error } = await supabase.from("custom_role_permissions").insert(crRows);
          if (error) throw error;
        }
      }

      toast.success("Permissions sauvegardées avec succès");
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!hasRole("admin")) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">Accès réservé aux administrateurs.</CardContent></Card>
    );
  }

  if (!loaded) {
    return (
      <Card><CardContent className="py-12 text-center text-muted-foreground">Chargement...</CardContent></Card>
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

      <Tabs defaultValue="standard">
        <TabsList>
          <TabsTrigger value="standard">Rôles système</TabsTrigger>
          <TabsTrigger value="custom">Rôles personnalisés ({customRoles.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="space-y-4 mt-4">
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
                              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => resetToDefault(role, mod)}>
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
        </TabsContent>

        <TabsContent value="custom" className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" />Nouveau rôle</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Créer un rôle personnalisé</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nom du rôle *</Label>
                    <Input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Ex: Superviseur, Directeur..." />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={newRoleDesc} onChange={(e) => setNewRoleDesc(e.target.value)} placeholder="Description du rôle..." />
                  </div>
                  <div>
                    <Label>Dupliquer les permissions de</Label>
                    <Select value={duplicateFrom} onValueChange={setDuplicateFrom}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Rôle vide —</SelectItem>
                        {NON_ADMIN_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                        ))}
                        {customRoles.map((cr) => (
                          <SelectItem key={cr.id} value={`custom:${cr.id}`}>{cr.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleCreateRole}>
                    <Plus className="mr-2 h-4 w-4" />Créer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {customRoles.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Aucun rôle personnalisé créé. Cliquez sur "Nouveau rôle" pour commencer.
              </CardContent>
            </Card>
          ) : (
            customRoles.map((cr) => (
              <Card key={cr.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{cr.nom}</CardTitle>
                      {cr.description && <p className="text-sm text-muted-foreground mt-1">{cr.description}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteRole(cr)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
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
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ALL_MODULES.map((mod) => (
                          <TableRow key={mod}>
                            <TableCell className="font-medium text-sm">{MODULE_LABELS[mod]}</TableCell>
                            {PERM_LEVELS.map((p) => (
                              <TableCell key={p.key} className="text-center">
                                <Checkbox
                                  checked={getCustomPermValue(cr.id, mod, p.key)}
                                  onCheckedChange={() => toggleCustomPerm(cr.id, mod, p.key)}
                                />
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteRole} onOpenChange={(o) => !o && setDeleteRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le rôle "{deleteRole?.nom}" ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les utilisateurs ayant ce rôle le perdront.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRole} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
