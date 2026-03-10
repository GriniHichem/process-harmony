import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, UserCheck, UserX, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Acteur {
  id: string;
  nom: string;
  prenom: string;
  fonction: string | null;
  organisation: string | null;
  type_acteur: "interne" | "externe";
  actif: boolean;
  created_at: string;
}

const emptyForm = { nom: "", prenom: "", fonction: "", organisation: "", type_acteur: "interne" as const };

export default function Acteurs() {
  const { role } = useAuth();
  const [acteurs, setActeurs] = useState<Acteur[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const canEdit = role === "rmq" || role === "admin" || role === "responsable_processus" || role === "consultant";
  const canDelete = role === "rmq" || role === "admin";

  const fetchActeurs = async () => {
    const { data } = await supabase.from("acteurs").select("*").order("nom");
    if (data) setActeurs(data as Acteur[]);
    setLoading(false);
  };

  useEffect(() => { fetchActeurs(); }, []);

  const handleSubmit = async () => {
    if (!form.nom.trim()) { toast.error("Le nom est obligatoire"); return; }
    if (editId) {
      const { error } = await supabase.from("acteurs").update({
        nom: form.nom, prenom: form.prenom, fonction: form.fonction,
        organisation: form.organisation, type_acteur: form.type_acteur,
      }).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Acteur modifié");
    } else {
      const { error } = await supabase.from("acteurs").insert({
        nom: form.nom, prenom: form.prenom, fonction: form.fonction,
        organisation: form.organisation, type_acteur: form.type_acteur,
      });
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
    setForm({ nom: a.nom, prenom: a.prenom, fonction: a.fonction ?? "", organisation: a.organisation ?? "", type_acteur: a.type_acteur });
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
    const matchSearch = `${a.nom} ${a.prenom} ${a.fonction ?? ""} ${a.organisation ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || a.type_acteur === filterType;
    return matchSearch && matchType;
  });

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Acteurs</h1>
          <p className="text-muted-foreground text-sm">Liste référentielle des acteurs de l'organisation</p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Nouvel acteur</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editId ? "Modifier l'acteur" : "Nouvel acteur"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nom *</Label><Input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Prénom</Label><Input value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Fonction</Label><Input value={form.fonction} onChange={e => setForm({ ...form, fonction: e.target.value })} /></div>
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
                <Button onClick={handleSubmit} className="w-full">{editId ? "Modifier" : "Ajouter"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-4">
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
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Prénom</TableHead>
                <TableHead>Fonction</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                {(canEdit || canDelete) && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Aucun acteur trouvé</TableCell></TableRow>
              ) : filtered.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nom}</TableCell>
                  <TableCell>{a.prenom}</TableCell>
                  <TableCell>{a.fonction}</TableCell>
                  <TableCell>{a.organisation}</TableCell>
                  <TableCell><Badge variant={a.type_acteur === "interne" ? "default" : "secondary"}>{a.type_acteur}</Badge></TableCell>
                  <TableCell><Badge variant={a.actif ? "default" : "outline"}>{a.actif ? "Actif" : "Inactif"}</Badge></TableCell>
                  {(canEdit || canDelete) && (
                    <TableCell className="text-right space-x-1">
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
