import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Shield } from "lucide-react";

type UserWithRole = { id: string; nom: string; prenom: string; email: string; fonction: string; actif: boolean; role: string | null };

const roleLabels: Record<string, string> = {
  admin: "Admin",
  rmq: "RMQ",
  responsable_processus: "Resp. processus",
  consultant: "Consultant",
  auditeur: "Auditeur",
};

export default function Utilisateurs() {
  const { role } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*").order("nom");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role]));
    setUsers((profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? null })) as UserWithRole[]);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (role !== "rmq" && role !== "admin") return;
    const { data: existing } = await supabase.from("user_roles").select("id").eq("user_id", userId).single();
    let error;
    if (existing) {
      ({ error } = await supabase.from("user_roles").update({ role: newRole as any }).eq("user_id", userId));
    } else {
      ({ error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any }));
    }
    if (error) toast.error(error.message);
    else { toast.success("Rôle mis à jour"); fetchUsers(); }
  };

  const toggleActive = async (userId: string, currentActive: boolean) => {
    if (role !== "rmq") return;
    const { error } = await supabase.from("profiles").update({ actif: !currentActive }).eq("id", userId);
    if (error) toast.error(error.message);
    else { toast.success(currentActive ? "Compte désactivé" : "Compte activé"); fetchUsers(); }
  };

  if (role !== "rmq") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Utilisateurs</h1>
        <Card><CardContent className="py-12 text-center text-muted-foreground">Accès réservé au RMQ</CardContent></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Gestion des utilisateurs</h1><p className="text-muted-foreground">Administration des comptes et rôles</p></div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="grid gap-3">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                    {u.prenom?.[0]}{u.nom?.[0]}
                  </div>
                  <div>
                    <p className="font-medium">{u.prenom} {u.nom}</p>
                    <p className="text-xs text-muted-foreground">{u.email} {u.fonction ? `• ${u.fonction}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={u.role ?? ""} onValueChange={(v) => handleRoleChange(u.id, v)}>
                    <SelectTrigger className="w-[170px]"><SelectValue placeholder="Aucun rôle" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Badge className="cursor-pointer" variant={u.actif ? "default" : "destructive"} onClick={() => toggleActive(u.id, u.actif)}>
                    {u.actif ? "Actif" : "Inactif"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
