import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, AlertOctagon, Calendar, User, Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

interface Incident {
  id: string;
  risk_id: string | null;
  process_id: string | null;
  description: string;
  date_incident: string;
  gravite: string;
  statut: string;
  responsable: string | null;
  actions_correctives: string | null;
}

const GRAVITE_LABELS: Record<string, string> = { mineure: "Mineure", majeure: "Majeure", critique: "Critique" };
const STATUT_LABELS: Record<string, string> = { ouvert: "Ouvert", en_traitement: "En traitement", cloture: "Clôturé" };
const GRAVITE_COLORS: Record<string, "outline" | "secondary" | "destructive"> = { mineure: "outline", majeure: "secondary", critique: "destructive" };
const STATUT_CARD_COLORS: Record<string, string> = {
  ouvert: "border-orange-500/60 bg-orange-50 dark:bg-orange-950/20",
  en_traitement: "border-blue-500/60 bg-blue-50 dark:bg-blue-950/20",
  cloture: "border-green-500/60 bg-green-50 dark:bg-green-950/20",
};

export default function Incidents() {
  const { hasRole, user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [risks, setRisks] = useState<{ id: string; description: string; type: string }[]>([]);
  const [processes, setProcesses] = useState<{ id: string; nom: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Incident | null>(null);

  const [filterStatut, setFilterStatut] = useState("all");
  const [filterGravite, setFilterGravite] = useState("all");
  const [searchText, setSearchText] = useState("");

  const canEdit = hasRole("admin") || hasRole("rmq") || hasRole("responsable_processus");
  const isOnlyResponsable = hasRole("responsable_processus") && !hasRole("admin") && !hasRole("rmq");

  const emptyForm = { description: "", date_incident: new Date().toISOString().split("T")[0], gravite: "mineure", statut: "ouvert", responsable: "", actions_correctives: "", risk_id: "", process_id: "" };
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    let procQuery = supabase.from("processes").select("id, nom").order("nom");
    if (isOnlyResponsable && user) {
      procQuery = procQuery.eq("responsable_id", user.id);
    }
    const pRes = await procQuery;
    const myProcesses = pRes.data ?? [];
    setProcesses(myProcesses);
    const myProcessIds = myProcesses.map(p => p.id);

    let incQuery = supabase.from("risk_incidents").select("*").order("date_incident", { ascending: false });
    if (isOnlyResponsable && myProcessIds.length > 0) {
      incQuery = incQuery.in("process_id", myProcessIds);
    } else if (isOnlyResponsable) {
      incQuery = incQuery.in("process_id", ["__none__"]);
    }

    let riskQuery = supabase.from("risks_opportunities").select("id, description, type");
    if (isOnlyResponsable && myProcessIds.length > 0) {
      riskQuery = riskQuery.in("process_id", myProcessIds);
    } else if (isOnlyResponsable) {
      riskQuery = riskQuery.in("process_id", ["__none__"]);
    }

    const [iRes, rRes] = await Promise.all([incQuery, riskQuery]);
    setIncidents((iRes.data ?? []) as Incident[]);
    setRisks((rRes.data ?? []) as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openEdit = (inc: Incident) => {
    setEditing(inc);
    setForm({ description: inc.description, date_incident: inc.date_incident, gravite: inc.gravite, statut: inc.statut, responsable: inc.responsable || "", actions_correctives: inc.actions_correctives || "", risk_id: inc.risk_id || "", process_id: inc.process_id || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.description) { toast.error("Description requise"); return; }
    const data: any = { description: form.description, date_incident: form.date_incident, gravite: form.gravite, statut: form.statut, responsable: form.responsable || null, actions_correctives: form.actions_correctives || null, risk_id: form.risk_id || null, process_id: form.process_id || null };
    if (editing) {
      const { error } = await supabase.from("risk_incidents").update(data).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Incident modifié");
    } else {
      const { error } = await supabase.from("risk_incidents").insert(data);
      if (error) { toast.error(error.message); return; }
      toast.success("Incident enregistré");
    }
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("risk_incidents").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Incident supprimé");
    fetchData();
  };

  const getRiskLabel = (riskId: string | null) => {
    if (!riskId) return null;
    const r = risks.find((r) => r.id === riskId);
    return r ? r.description.substring(0, 50) : null;
  };

  const getProcessLabel = (processId: string | null) => {
    if (!processId) return null;
    const p = processes.find((p) => p.id === processId);
    return p ? p.nom : null;
  };

  const filtered = incidents.filter((inc) => {
    if (filterStatut !== "all" && inc.statut !== filterStatut) return false;
    if (filterGravite !== "all" && inc.gravite !== filterGravite) return false;
    if (searchText && !inc.description.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: incidents.length,
    ouverts: incidents.filter((i) => i.statut === "ouvert").length,
    critiques: incidents.filter((i) => i.gravite === "critique").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Incidents</h1>
          <p className="text-muted-foreground">Registre des incidents liés aux risques et processus</p>
        </div>
        {canEdit && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditing(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Déclarer un incident</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing ? "Modifier l'incident" : "Déclarer un incident"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Date de l'incident</Label><Input type="date" value={form.date_incident} onChange={(e) => setForm({ ...form, date_incident: e.target.value })} /></div>
                  <div className="space-y-1">
                    <Label>Gravité</Label>
                    <Select value={form.gravite} onValueChange={(v) => setForm({ ...form, gravite: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(GRAVITE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Statut</Label>
                    <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(STATUT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label>Responsable</Label><Input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} /></div>
                </div>
                <div className="space-y-1">
                  <Label>Risque / Opportunité associé(e)</Label>
                  <Select value={form.risk_id} onValueChange={(v) => setForm({ ...form, risk_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Aucun (optionnel)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {risks.map((r) => <SelectItem key={r.id} value={r.id}>{r.description.substring(0, 60)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Processus concerné</Label>
                  <Select value={form.process_id} onValueChange={(v) => setForm({ ...form, process_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Aucun (optionnel)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label>Actions correctives</Label><Textarea value={form.actions_correctives} onChange={(e) => setForm({ ...form, actions_correctives: e.target.value })} placeholder="Mesures prises ou à prendre..." /></div>
                <Button onClick={handleSave} className="w-full">{editing ? "Enregistrer" : "Déclarer"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></CardContent></Card>
        <Card className="border-orange-500/40"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-600">{stats.ouverts}</p><p className="text-xs text-muted-foreground">Ouverts</p></CardContent></Card>
        <Card className="border-destructive/40"><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-destructive">{stats.critiques}</p><p className="text-xs text-muted-foreground">Critiques</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        </div>
        <Select value={filterStatut} onValueChange={setFilterStatut}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(STATUT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterGravite} onValueChange={setFilterGravite}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes gravités</SelectItem>
            {Object.entries(GRAVITE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun incident trouvé</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((inc) => (
            <Card key={inc.id} className={`border-2 transition-colors ${STATUT_CARD_COLORS[inc.statut] || ""}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <AlertOctagon className="h-5 w-5 mt-0.5 text-destructive shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium">{inc.description}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {getRiskLabel(inc.risk_id) && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">🔗 {getRiskLabel(inc.risk_id)}</span>
                        )}
                        {getProcessLabel(inc.process_id) && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">📋 {getProcessLabel(inc.process_id)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={GRAVITE_COLORS[inc.gravite] || "outline"} className="text-xs">{GRAVITE_LABELS[inc.gravite] || inc.gravite}</Badge>
                    <Badge variant="outline" className="text-xs">{STATUT_LABELS[inc.statut] || inc.statut}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(inc.date_incident), "dd MMM yyyy", { locale: fr })}</span>
                  {inc.responsable && <span className="flex items-center gap-1"><User className="h-3 w-3" />{inc.responsable}</span>}
                </div>
                {inc.actions_correctives && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">💊 {inc.actions_correctives}</p>
                )}
                {canEdit && (
                  <div className="flex gap-1 pt-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => openEdit(inc)}><Pencil className="h-3 w-3 mr-1" />Modifier</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive"><Trash2 className="h-3 w-3 mr-1" />Supprimer</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cet incident ?</AlertDialogTitle>
                          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(inc.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Supprimer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
