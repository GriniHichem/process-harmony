import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, UserCheck, UserX, Search, Users, Eye } from "lucide-react";
import { ActeurImplicationsDialog } from "@/components/ActeurImplicationsDialog";
import { HelpTooltip } from "@/components/HelpTooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ActeurGroup {
  id: string;
  nom: string;
}

interface Acteur {
  id: string;
  fonction: string | null;
  organisation: string | null;
  type_acteur: "interne" | "externe";
  actif: boolean;
  description_poste: string | null;
  created_at: string;
  group_id: string | null;
}

interface LinkedUser {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

const emptyForm = { fonction: "", organisation: "", type_acteur: "interne" as "interne" | "externe", description_poste: "", group_id: "" };

export default function Acteurs() {
  const { hasRole, hasPermission, profile } = useAuth();
  const [acteurs, setActeurs] = useState<Acteur[]>([]);
  const [groups, setGroups] = useState<ActeurGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterGroup, setFilterGroup] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [linkedUsers, setLinkedUsers] = useState<Record<string, LinkedUser[]>>({});
  const [myProcessIds, setMyProcessIds] = useState<string[] | null>(null);

  const canEdit = hasPermission("acteurs", "can_edit");
  const canDelete = hasPermission("acteurs", "can_delete");
  // Acteur role: no implications view. Resp. processus: filtered to own processes only.
  const isOnlyActeur = hasRole("acteur") && !hasRole("admin") && !hasRole("rmq") && !hasRole("responsable_processus") && !hasRole("consultant") && !hasRole("auditeur");
  const canViewImplications = !isOnlyActeur && hasPermission("acteurs", "can_read_detail");
  const isRespProcessus = hasRole("responsable_processus") && !hasRole("admin") && !hasRole("rmq");
  const [implicationActeur, setImplicationActeur] = useState<{ id: string; label: string } | null>(null);

  const fetchActeurs = async () => {
    const { data } = await supabase.from("acteurs").select("*").order("fonction");
    if (data) setActeurs(data as Acteur[]);
    setLoading(false);
  };

  const fetchGroups = async () => {
    const { data } = await supabase.from("acteur_groups").select("id, nom").order("nom");
    if (data) setGroups(data as ActeurGroup[]);
  };

  const fetchLinkedUsers = async () => {
    const { data } = await supabase.from("profiles").select("id, nom, prenom, email, acteur_id").not("acteur_id", "is", null);
    if (data) {
      const map: Record<string, LinkedUser[]> = {};
      for (const p of data) {
        const aid = (p as any).acteur_id as string;
        if (!map[aid]) map[aid] = [];
        map[aid].push({ id: p.id, nom: p.nom, prenom: p.prenom, email: p.email });
      }
      setLinkedUsers(map);
    }
  };

  const fetchMyProcessIds = async () => {
    if (!isRespProcessus || !profile?.acteur_id) {
      setMyProcessIds(null);
      return;
    }
    const { data } = await supabase.from("processes").select("id").eq("responsable_id", profile.acteur_id);
    setMyProcessIds(data ? data.map(p => p.id) : []);
  };

  useEffect(() => { fetchActeurs(); fetchGroups(); fetchLinkedUsers(); fetchMyProcessIds(); }, [profile?.acteur_id]);

  const getGroupName = (groupId: string | null) => {
    if (!groupId) return null;
    return groups.find(g => g.id === groupId)?.nom ?? null;
  };

  const handleSubmit = async () => {
    if (!form.fonction.trim()) { toast.error("La fonction est obligatoire"); return; }
    const payload = {
      fonction: form.fonction, organisation: form.organisation,
      type_acteur: form.type_acteur, description_poste: form.description_poste,
      group_id: form.group_id || null,
    };
    if (editId) {
      const { error } = await supabase.from("acteurs").update(payload).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Acteur modifié");
    } else {
      const { error } = await supabase.from("acteurs").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Acteur ajouté");
    }
    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
    fetchActeurs();
  };

  const handleEdit = (a: Acteur) => {
    setEditId(a.id);
    setForm({ fonction: a.fonction ?? "", organisation: a.organisation ?? "", type_acteur: a.type_acteur, description_poste: a.description_poste ?? "", group_id: a.group_id ?? "" });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("acteurs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Acteur supprimé");
    fetchActeurs();
  };

  const handleToggleActif = async (a: Acteur) => {
    const { error } = await supabase.from("acteurs").update({ actif: !a.actif }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    toast.success(a.actif ? "Acteur désactivé" : "Acteur activé");
    fetchActeurs();
  };

  const filtered = acteurs.filter(a => {
    const matchSearch = `${a.fonction ?? ""} ${a.organisation ?? ""} ${a.description_poste ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || a.type_acteur === filterType;
    const matchGroup = filterGroup === "all" || (filterGroup === "none" ? !a.group_id : a.group_id === filterGroup);
    return matchSearch && matchType && matchGroup;
  });

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">Acteurs <HelpTooltip term="acteur" /></h1>
          <p className="text-muted-foreground text-sm">Référentiel des fonctions et postes de l'organisation</p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Nouvel acteur</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Modifier l'acteur" : "Nouvel acteur"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Fonction *</Label><Input value={form.fonction} onChange={e => setForm({ ...form, fonction: e.target.value })} /></div>
                <div className="space-y-2"><Label>Organisation</Label><Input value={form.organisation} onChange={e => setForm({ ...form, organisation: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type_acteur} onValueChange={v => setForm({ ...form, type_acteur: v as "interne" | "externe" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interne">Interne</SelectItem>
                      <SelectItem value="externe">Externe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Groupe</Label>
                  <Select value={form.group_id || "none"} onValueChange={v => setForm({ ...form, group_id: v === "none" ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Aucun groupe" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun groupe</SelectItem>
                      {groups.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Description de poste</Label><Textarea value={form.description_poste} onChange={e => setForm({ ...form, description_poste: e.target.value })} rows={3} /></div>
                <Button onClick={handleSubmit} className="w-full">{editId ? "Modifier" : "Ajouter"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="interne">Interne</SelectItem>
            <SelectItem value="externe">Externe</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Tous les groupes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les groupes</SelectItem>
            <SelectItem value="none">Sans groupe</SelectItem>
            {groups.map(g => (
              <SelectItem key={g.id} value={g.id}>{g.nom}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fonction</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Groupe</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Utilisateurs liés</TableHead>
                {(canEdit || canDelete || canViewImplications) && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucun acteur trouvé</TableCell></TableRow>
              ) : filtered.map(a => {
                const users = linkedUsers[a.id] || [];
                const groupName = getGroupName(a.group_id);
                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.fonction || "—"}</TableCell>
                    <TableCell>{a.organisation || "—"}</TableCell>
                    <TableCell>{groupName ? <Badge variant="outline">{groupName}</Badge> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                    <TableCell><Badge variant={a.type_acteur === "interne" ? "default" : "secondary"}>{a.type_acteur}</Badge></TableCell>
                    <TableCell><Badge variant={a.actif ? "default" : "outline"}>{a.actif ? "Actif" : "Inactif"}</Badge></TableCell>
                    <TableCell>
                      {users.length === 0 ? (
                        <span className="text-muted-foreground text-xs">Aucun</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {users.map(u => (
                            <Badge key={u.id} variant="outline" className="text-xs">
                              <Users className="h-3 w-3 mr-1" />{u.prenom} {u.nom}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    {(canEdit || canDelete || canViewImplications) && (
                      <TableCell className="text-right space-x-1">
                        {canViewImplications && (
                          <Button variant="ghost" size="icon" onClick={() => setImplicationActeur({ id: a.id, label: a.fonction || a.organisation || "Acteur" })} title="Voir les implications">
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {canEdit && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(a)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleToggleActif(a)}>
                              {a.actif ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>
                          </>
                        )}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer cet acteur ?</AlertDialogTitle>
                                <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(a.id)}>Supprimer</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {implicationActeur && (
        <ActeurImplicationsDialog
          acteurId={implicationActeur.id}
          acteurLabel={implicationActeur.label}
          open={!!implicationActeur}
          onOpenChange={(o) => { if (!o) setImplicationActeur(null); }}
          allowedProcessIds={isRespProcessus ? myProcessIds : null}
        />
      )}
    </div>
  );
}
