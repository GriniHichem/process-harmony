import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Copy, RotateCcw, Save, History, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ALL_ROLES, ROLE_LABELS, type AppRole } from "@/lib/defaultPermissions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ProcessInfo {
  id: string;
  code: string;
  nom: string;
  type_processus: string;
  statut: string;
}

interface CustomRoleInfo {
  id: string;
  nom: string;
}

interface PermRow {
  id?: string;
  role: string | null;
  custom_role_id: string | null;
  process_id: string;
  can_read: boolean;
  can_detail: boolean;
  can_comment: boolean;
  can_edit: boolean;
  can_version: boolean;
}

interface AuditEntry {
  id: string;
  changed_by: string;
  target_role: string | null;
  target_custom_role_id: string | null;
  process_id: string | null;
  old_perms: any;
  new_perms: any;
  changed_at: string;
  profiles?: { nom: string; prenom: string } | null;
}

const LEVELS = ["can_read", "can_detail", "can_comment", "can_edit", "can_version"] as const;
const LEVEL_LABELS: Record<string, string> = {
  can_read: "Lecture",
  can_detail: "Détail",
  can_comment: "Commenter",
  can_edit: "Modifier",
  can_version: "Version",
};

const TEMPLATES: Record<string, Record<string, boolean>> = {
  lecture_seule: { can_read: true, can_detail: false, can_comment: false, can_edit: false, can_version: false },
  lecture_detail: { can_read: true, can_detail: true, can_comment: false, can_edit: false, can_version: false },
  consultation: { can_read: true, can_detail: true, can_comment: true, can_edit: false, can_version: false },
  modification: { can_read: true, can_detail: true, can_comment: true, can_edit: true, can_version: false },
  acces_complet: { can_read: true, can_detail: true, can_comment: true, can_edit: true, can_version: true },
  aucun: { can_read: false, can_detail: false, can_comment: false, can_edit: false, can_version: false },
};

const TEMPLATE_LABELS: Record<string, string> = {
  lecture_seule: "Lecture seule",
  lecture_detail: "Lecture + Détail",
  consultation: "Consultation (+ Commenter)",
  modification: "Modification complète",
  acces_complet: "Accès complet",
  aucun: "Aucun accès (héritage global)",
};

export default function AdminProcessPermissions() {
  const { user } = useAuth();
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRoleInfo[]>([]);
  const [perms, setPerms] = useState<PermRow[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [copySource, setCopySource] = useState<string>("");
  const [copyTarget, setCopyTarget] = useState<string>("");

  const roleOptions: { key: string; label: string; isCustom: boolean }[] = [
    ...ALL_ROLES.filter((r) => r !== "super_admin" && r !== "admin").map((r) => ({
      key: `role:${r}`,
      label: ROLE_LABELS[r],
      isCustom: false,
    })),
    ...customRoles.map((cr) => ({
      key: `custom:${cr.id}`,
      label: cr.nom,
      isCustom: true,
    })),
  ];

  const fetchData = useCallback(async () => {
    const [procRes, crRes, permRes] = await Promise.all([
      supabase.from("processes").select("id, code, nom, type_processus, statut").neq("statut", "archive").order("code"),
      supabase.from("custom_roles").select("id, nom").order("nom"),
      supabase.from("process_role_permissions").select("*"),
    ]);
    setProcesses((procRes.data ?? []) as ProcessInfo[]);
    setCustomRoles((crRes.data ?? []) as CustomRoleInfo[]);
    setPerms((permRes.data ?? []) as PermRow[]);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getPermKey = (roleKey: string, processId: string) => `${roleKey}:${processId}`;

  const findPerm = (roleKey: string, processId: string): PermRow | undefined => {
    const [type, id] = roleKey.split(":");
    return perms.find((p) =>
      p.process_id === processId &&
      (type === "role" ? p.role === id && !p.custom_role_id : p.custom_role_id === id)
    );
  };

  const getPermValue = (roleKey: string, processId: string, level: string): boolean => {
    const perm = findPerm(roleKey, processId);
    return perm ? (perm as any)[level] : false;
  };

  const hasOverride = (roleKey: string, processId: string): boolean => {
    return !!findPerm(roleKey, processId);
  };

  const togglePerm = (roleKey: string, processId: string, level: string) => {
    const [type, id] = roleKey.split(":");
    const existing = findPerm(roleKey, processId);

    if (existing) {
      const updated = { ...existing, [level]: !(existing as any)[level] };
      setPerms((prev) => prev.map((p) => (p === existing ? updated : p)));
    } else {
      const newPerm: PermRow = {
        role: type === "role" ? id : null,
        custom_role_id: type === "custom" ? id : null,
        process_id: processId,
        can_read: false,
        can_detail: false,
        can_comment: false,
        can_edit: false,
        can_version: false,
        [level]: true,
      };
      setPerms((prev) => [...prev, newPerm]);
    }
    setDirty((prev) => new Set(prev).add(getPermKey(roleKey, processId)));
  };

  const applyTemplate = (roleKey: string, processId: string, templateKey: string) => {
    const template = TEMPLATES[templateKey];
    if (!template) return;
    const [type, id] = roleKey.split(":");
    const existing = findPerm(roleKey, processId);

    if (templateKey === "aucun" && existing) {
      setPerms((prev) => prev.filter((p) => p !== existing));
    } else if (existing) {
      const updated = { ...existing, ...template };
      setPerms((prev) => prev.map((p) => (p === existing ? updated : p)));
    } else if (templateKey !== "aucun") {
      const newPerm: PermRow = {
        role: type === "role" ? id : null,
        custom_role_id: type === "custom" ? id : null,
        process_id: processId,
        ...template as any,
      };
      setPerms((prev) => [...prev, newPerm]);
    }
    setDirty((prev) => new Set(prev).add(getPermKey(roleKey, processId)));
  };

  const handleCopyRole = async () => {
    if (!copySource || !copyTarget || copySource === copyTarget) return;
    const sourcePerms = perms.filter((p) => {
      const [type, id] = copySource.split(":");
      return type === "role" ? p.role === id && !p.custom_role_id : p.custom_role_id === id;
    });
    const [targetType, targetId] = copyTarget.split(":");

    for (const sp of sourcePerms) {
      const newPerm: PermRow = {
        ...sp,
        id: undefined,
        role: targetType === "role" ? targetId : null,
        custom_role_id: targetType === "custom" ? targetId : null,
      };
      const existing = findPerm(copyTarget, sp.process_id);
      if (existing) {
        setPerms((prev) => prev.map((p) => (p === existing ? { ...existing, ...newPerm } : p)));
      } else {
        setPerms((prev) => [...prev, newPerm]);
      }
      setDirty((prev) => new Set(prev).add(getPermKey(copyTarget, sp.process_id)));
    }
    toast.success("Permissions copiées (non enregistrées)");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Delete all existing and re-insert (simpler for batch update)
      const dirtyPerms = perms.filter((p) => {
        const roleKey = p.role ? `role:${p.role}` : `custom:${p.custom_role_id}`;
        return dirty.has(getPermKey(roleKey, p.process_id));
      });

      for (const p of dirtyPerms) {
        if (p.id) {
          // Update existing
          await supabase
            .from("process_role_permissions")
            .update({
              can_read: p.can_read,
              can_detail: p.can_detail,
              can_comment: p.can_comment,
              can_edit: p.can_edit,
              can_version: p.can_version,
            })
            .eq("id", p.id);
        } else {
          // Insert new
          const { data } = await supabase
            .from("process_role_permissions")
            .insert({
              role: p.role as any,
              custom_role_id: p.custom_role_id,
              process_id: p.process_id,
              can_read: p.can_read,
              can_detail: p.can_detail,
              can_comment: p.can_comment,
              can_edit: p.can_edit,
              can_version: p.can_version,
            } as any)
            .select()
            .single();
          if (data) {
            setPerms((prev) => prev.map((pp) => (pp === p ? { ...pp, id: data.id } : pp)));
          }
        }

        // Audit log
        if (user) {
          await supabase.from("permission_audit_log").insert({
            changed_by: user.id,
            target_role: p.role as any,
            target_custom_role_id: p.custom_role_id,
            process_id: p.process_id,
            new_perms: {
              can_read: p.can_read,
              can_detail: p.can_detail,
              can_comment: p.can_comment,
              can_edit: p.can_edit,
              can_version: p.can_version,
            },
          } as any);
        }
      }

      // Handle deletions (perms that were in dirty but no longer exist)
      setDirty(new Set());
      toast.success("Permissions enregistrées");
      fetchData();
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = (roleKey: string, processId: string) => {
    const existing = findPerm(roleKey, processId);
    if (existing) {
      if (existing.id) {
        supabase.from("process_role_permissions").delete().eq("id", existing.id).then(() => {
          setPerms((prev) => prev.filter((p) => p !== existing));
          toast.success("Override supprimé — héritage global rétabli");
        });
      } else {
        setPerms((prev) => prev.filter((p) => p !== existing));
      }
    }
  };

  const fetchAuditLog = async () => {
    const { data } = await supabase
      .from("permission_audit_log")
      .select("*, profiles:changed_by(nom, prenom)")
      .order("changed_at", { ascending: false })
      .limit(50);
    setAuditLog((data ?? []) as AuditEntry[]);
  };

  const filteredProcesses = processes.filter((p) => typeFilter === "all" || p.type_processus === typeFilter);
  const filteredRoles = selectedRole === "all" ? roleOptions : roleOptions.filter((r) => r.key === selectedRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Permissions par processus
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez les accès granulaires par rôle et par processus
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchAuditLog(); setHistoryOpen(true); }}
          >
            <History className="h-4 w-4 mr-1" /> Historique
          </Button>
          <Button onClick={handleSave} disabled={dirty.size === 0 || saving}>
            <Save className="h-4 w-4 mr-1" /> Enregistrer ({dirty.size})
          </Button>
        </div>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium">Filtrer par rôle</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  {roleOptions.map((r) => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.label} {r.isCustom && "(personnalisé)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Type processus</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="pilotage">Management</SelectItem>
                  <SelectItem value="realisation">Réalisation</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="border-l pl-4 flex items-end gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Copier de</label>
                <Select value={copySource} onValueChange={setCopySource}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((r) => (
                      <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Vers</label>
                <Select value={copyTarget} onValueChange={setCopyTarget}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Cible" /></SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((r) => (
                      <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyRole} disabled={!copySource || !copyTarget}>
                <Copy className="h-4 w-4 mr-1" /> Copier
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matrix */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10 min-w-[180px]">Rôle</TableHead>
                  {filteredProcesses.map((p) => (
                    <TableHead key={p.id} className="text-center min-w-[200px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-mono text-xs">{p.code}</span>
                        <span className="text-xs truncate max-w-[180px]">{p.nom}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRoles.map((role) => (
                  <TableRow key={role.key}>
                    <TableCell className="sticky left-0 bg-background z-10 font-medium">
                      <div className="flex items-center gap-1">
                        {role.label}
                        {role.isCustom && <Badge variant="outline" className="text-[10px] px-1">Custom</Badge>}
                      </div>
                    </TableCell>
                    {filteredProcesses.map((proc) => {
                      const override = hasOverride(role.key, proc.id);
                      return (
                        <TableCell key={proc.id} className={cn("text-center", override && "bg-primary/5")}>
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-2 flex-wrap justify-center">
                              {LEVELS.map((level) => (
                                <label key={level} className="flex items-center gap-1 text-[11px] cursor-pointer">
                                  <Checkbox
                                    checked={getPermValue(role.key, proc.id, level)}
                                    onCheckedChange={() => togglePerm(role.key, proc.id, level)}
                                    className="h-3.5 w-3.5"
                                  />
                                  {LEVEL_LABELS[level].slice(0, 3)}
                                </label>
                              ))}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <Select
                                value=""
                                onValueChange={(v) => applyTemplate(role.key, proc.id, v)}
                              >
                                <SelectTrigger className="h-6 text-[10px] w-28">
                                  <SelectValue placeholder="Modèle..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(TEMPLATE_LABELS).map(([k, v]) => (
                                    <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {override && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => handleReset(role.key, proc.id)}
                                  title="Réinitialiser (héritage global)"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                            {override && (
                              <Badge variant="secondary" className="text-[9px] px-1">Override</Badge>
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Audit History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historique des permissions</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Par</TableHead>
                  <TableHead>Rôle cible</TableHead>
                  <TableHead>Nouvelles permissions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLog.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs">
                      {format(new Date(entry.changed_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell className="text-xs">
                      {entry.profiles ? `${entry.profiles.prenom} ${entry.profiles.nom}` : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {entry.target_role || entry.target_custom_role_id || "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {entry.new_perms && Object.entries(entry.new_perms)
                        .filter(([, v]) => v)
                        .map(([k]) => LEVEL_LABELS[k] || k)
                        .join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
