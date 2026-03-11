import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FolderOpen } from "lucide-react";

interface ActeurGroup {
  id: string;
  nom: string;
  description: string | null;
  created_at: string;
}

const emptyForm = { nom: "", description: "" };

export default function GroupesActeurs() {
  const { hasRole } = useAuth();
  const [groups, setGroups] = useState<ActeurGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [acteurCounts, setActeurCounts] = useState<Record<string, number>>({});

  const canEdit = hasPermission("groupes_acteurs", "can_edit");

  const fetchGroups = async () => {
    const { data } = await supabase.from("acteur_groups").select("*").order("nom");
    if (data) setGroups(data as ActeurGroup[]);
    setLoading(false);
  };

  const fetchActeurCounts = async () => {
    const { data } = await supabase.from("acteurs").select("group_id").not("group_id", "is", null);
    if (data) {
      const counts: Record<string, number> = {};
      for (const row of data) {
        const gid = (row as any).group_id as string;
        counts[gid] = (counts[gid] || 0) + 1;
      }
      setActeurCounts(counts);
    }
  };

  useEffect(() => { fetchGroups(); fetchActeurCounts(); }, []);

  const handleSubmit = async () => {
    if (!form.nom.trim()) { toast.error("Le nom est obligatoire"); return; }
    if (editId) {
      const { error } = await supabase.from("acteur_groups").update({ nom: form.nom, description: form.description }).eq("id", editId);
      if (error) { toast.error(error.message); return; }
      toast.success("Groupe modifié");
    } else {
      const { error } = await supabase.from("acteur_groups").insert({ nom: form.nom, description: form.description });
      if (error) { toast.error(error.message); return; }
      toast.success("Groupe ajouté");
    }
    setDialogOpen(false);
    setEditId(null);
    setForm(emptyForm);
    fetchGroups();
  };

  const handleEdit = (g: ActeurGroup) => {
    setEditId(g.id);
    setForm({ nom: g.nom, description: g.description ?? "" });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("acteur_groups").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Groupe supprimé");
    fetchGroups();
    fetchActeurCounts();
  };

  if (!canEdit) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Groupes d'acteurs</h1>
        <Card><CardContent className="py-12 text-center text-muted-foreground">Accès réservé à l'administrateur ou au RMQ</CardContent></Card>
      </div>
    );
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Groupes d'acteurs</h1>
          <p className="text-muted-foreground text-sm">Organisez les acteurs par groupes fonctionnels</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nouveau groupe</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Modifier le groupe" : "Nouveau groupe"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nom *</Label><Input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} /></div>
              <Button onClick={handleSubmit} className="w-full">{editId ? "Modifier" : "Ajouter"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Acteurs</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucun groupe créé</TableCell></TableRow>
              ) : groups.map(g => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    {g.nom}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{g.description || "—"}</TableCell>
                  <TableCell>{acteurCounts[g.id] || 0}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(g)}><Pencil className="h-4 w-4" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer ce groupe ?</AlertDialogTitle>
                          <AlertDialogDescription>Les acteurs de ce groupe ne seront pas supprimés mais n'auront plus de groupe assigné.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(g.id)}>Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
