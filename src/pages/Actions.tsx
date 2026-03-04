import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Action = { id: string; description: string; type_action: string; statut: string; echeance: string | null; responsable_id: string | null; source_type: string };

const statusColors: Record<string, string> = {
  planifiee: "bg-muted text-muted-foreground",
  en_cours: "bg-primary/20 text-primary",
  realisee: "bg-success/20 text-success",
  verifiee: "bg-accent/20 text-accent",
  cloturee: "bg-secondary text-secondary-foreground",
  en_retard: "bg-destructive/20 text-destructive",
};

export default function Actions() {
  const { role } = useAuth();
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAction, setNewAction] = useState({ description: "", type_action: "corrective", echeance: "", source_type: "manuelle" });

  const canCreate = role === "rmq" || role === "responsable_processus" || role === "auditeur";

  const fetchActions = async () => {
    const { data } = await supabase.from("actions").select("*").order("echeance", { ascending: true });
    setActions((data ?? []) as Action[]);
    setLoading(false);
  };

  useEffect(() => { fetchActions(); }, []);

  const handleCreate = async () => {
    if (!newAction.description) { toast.error("Description requise"); return; }
    const { error } = await supabase.from("actions").insert({
      description: newAction.description,
      type_action: newAction.type_action as any,
      echeance: newAction.echeance || null,
      source_type: newAction.source_type,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Action créée");
    setDialogOpen(false);
    setNewAction({ description: "", type_action: "corrective", echeance: "", source_type: "manuelle" });
    fetchActions();
  };

  const isOverdue = (a: Action) => a.echeance && new Date(a.echeance) < new Date() && !["cloturee", "verifiee"].includes(a.statut);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Actions</h1><p className="text-muted-foreground">Actions correctives, préventives et d'amélioration</p></div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nouvelle action</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Créer une action</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Description</Label><Textarea value={newAction.description} onChange={(e) => setNewAction({ ...newAction, description: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newAction.type_action} onValueChange={(v) => setNewAction({ ...newAction, type_action: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corrective">Corrective</SelectItem>
                      <SelectItem value="preventive">Préventive</SelectItem>
                      <SelectItem value="amelioration">Amélioration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Échéance</Label><Input type="date" value={newAction.echeance} onChange={(e) => setNewAction({ ...newAction, echeance: e.target.value })} /></div>
                <Button onClick={handleCreate} className="w-full">Créer</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : actions.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune action</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {actions.map((a) => (
            <Card key={a.id} className={isOverdue(a) ? "border-destructive/50" : ""}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Zap className={`h-5 w-5 ${isOverdue(a) ? "text-destructive" : "text-primary"}`} />
                  <div>
                    <p className="font-medium line-clamp-1">{a.description}</p>
                    <p className="text-xs text-muted-foreground">{a.type_action} • {a.echeance ?? "Sans échéance"}</p>
                  </div>
                </div>
                <Badge className={statusColors[a.statut] ?? ""}>{a.statut.replace("_", " ")}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
