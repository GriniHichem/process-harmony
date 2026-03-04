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
import { Plus, ClipboardCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Audit = { id: string; reference: string; type_audit: string; perimetre: string | null; date_audit: string | null; statut: string };

const statusColors: Record<string, string> = {
  planifie: "bg-muted text-muted-foreground",
  en_cours: "bg-primary/20 text-primary",
  termine: "bg-success/20 text-success",
  cloture: "bg-secondary text-secondary-foreground",
};

export default function Audits() {
  const { role } = useAuth();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAudit, setNewAudit] = useState({ reference: "", type_audit: "interne", perimetre: "", date_audit: "" });

  const canCreate = role === "rmq" || role === "auditeur";

  const fetchAudits = async () => {
    const { data } = await supabase.from("audits").select("*").order("date_audit", { ascending: false });
    setAudits((data ?? []) as Audit[]);
    setLoading(false);
  };

  useEffect(() => { fetchAudits(); }, []);

  const handleCreate = async () => {
    if (!newAudit.reference) { toast.error("Référence requise"); return; }
    const { error } = await supabase.from("audits").insert({
      reference: newAudit.reference,
      type_audit: newAudit.type_audit as any,
      perimetre: newAudit.perimetre || null,
      date_audit: newAudit.date_audit || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Audit créé");
    setDialogOpen(false);
    setNewAudit({ reference: "", type_audit: "interne", perimetre: "", date_audit: "" });
    fetchAudits();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Audits</h1><p className="text-muted-foreground">Programme et suivi des audits</p></div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nouvel audit</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Planifier un audit</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Référence</Label><Input value={newAudit.reference} onChange={(e) => setNewAudit({ ...newAudit, reference: e.target.value })} placeholder="AUD-2026-001" /></div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newAudit.type_audit} onValueChange={(v) => setNewAudit({ ...newAudit, type_audit: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interne">Interne</SelectItem>
                      <SelectItem value="externe">Externe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Date prévue</Label><Input type="date" value={newAudit.date_audit} onChange={(e) => setNewAudit({ ...newAudit, date_audit: e.target.value })} /></div>
                <div className="space-y-2"><Label>Périmètre</Label><Textarea value={newAudit.perimetre} onChange={(e) => setNewAudit({ ...newAudit, perimetre: e.target.value })} /></div>
                <Button onClick={handleCreate} className="w-full">Créer</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : audits.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun audit</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {audits.map((a) => (
            <Card key={a.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <ClipboardCheck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{a.reference}</p>
                    <p className="text-xs text-muted-foreground">{a.type_audit} • {a.date_audit ?? "Non planifié"}</p>
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
