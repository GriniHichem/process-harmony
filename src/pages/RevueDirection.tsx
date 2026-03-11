import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Eye, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import RichTextEditor from "@/components/RichTextEditor";
import ParticipantSelector, { formatParticipantsDisplay, parseParticipants } from "@/components/ParticipantSelector";

const statutColors: Record<string, string> = {
  planifiee: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  realisee: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cloturee: "bg-muted text-muted-foreground",
};
const statutLabels: Record<string, string> = { planifiee: "Planifiée", realisee: "Réalisée", cloturee: "Clôturée" };

const emptyForm = { reference: "", date_revue: "", participants: "", elements_entree: "", decisions: "", actions_decidees: "", statut: "planifiee", compte_rendu: "", prochaine_revue: "" };

const RICH_FIELDS = [
  { key: "elements_entree", label: "Éléments d'entrée", placeholder: "État des actions, performance des processus, résultats d'audit..." },
  { key: "decisions", label: "Décisions", placeholder: "Décisions prises lors de la revue..." },
  { key: "actions_decidees", label: "Actions décidées", placeholder: "Actions à mettre en œuvre..." },
  { key: "compte_rendu", label: "Compte rendu", placeholder: "Compte rendu détaillé de la revue..." },
] as const;

const ALL_SECTIONS = [
  { key: "participants", label: "Participants", isRich: false },
  ...RICH_FIELDS.map(f => ({ ...f, isRich: true })),
] as const;

export default function RevueDirection() {
  const { hasRole } = useAuth();
  const canEdit = hasRole("admin") || hasRole("rmq");
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [viewing, setViewing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [activeField, setActiveField] = useState<string>("participants");

  const { data: reviews = [] } = useQuery({
    queryKey: ["management_reviews"],
    queryFn: async () => {
      const { data, error } = await supabase.from("management_reviews").select("*").order("date_revue", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMut = useMutation({
    mutationFn: async (f: typeof form & { id?: string }) => {
      const payload = { reference: f.reference, date_revue: f.date_revue || null, participants: f.participants, elements_entree: f.elements_entree, decisions: f.decisions, actions_decidees: f.actions_decidees, statut: f.statut, compte_rendu: f.compte_rendu, prochaine_revue: f.prochaine_revue || null };
      if (f.id) {
        const { error } = await supabase.from("management_reviews").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("management_reviews").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["management_reviews"] }); setDialog(false); toast({ title: "Revue de direction enregistrée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("management_reviews").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["management_reviews"] }); toast({ title: "Revue supprimée" }); },
  });

  const openNew = () => { setEditing(null); setForm(emptyForm); setActiveField("participants"); setDialog(true); };
  const openEdit = (r: any) => {
    setEditing(r);
    setForm({ reference: r.reference, date_revue: r.date_revue || "", participants: r.participants, elements_entree: r.elements_entree, decisions: r.decisions, actions_decidees: r.actions_decidees, statut: r.statut, compte_rendu: r.compte_rendu, prochaine_revue: r.prochaine_revue || "" });
    setActiveField("participants");
    setDialog(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <h1 className="text-3xl font-bold tracking-tight">Revue de direction</h1>
        {canEdit && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nouvelle revue</Button>}
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Réf.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Participants</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Prochaine revue</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Aucune revue de direction enregistrée.</TableCell></TableRow>
            ) : reviews.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.reference}</TableCell>
                <TableCell>{r.date_revue ? format(new Date(r.date_revue), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell className="max-w-[200px] truncate">{formatParticipantsDisplay(r.participants)}</TableCell>
                <TableCell><Badge className={statutColors[r.statut]}>{statutLabels[r.statut]}</Badge></TableCell>
                <TableCell>{r.prochaine_revue ? format(new Date(r.prochaine_revue), "dd/MM/yyyy") : "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => { setViewing(r); setViewDialog(true); }}><Eye className="h-4 w-4" /></Button>
                    {canEdit && <>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                    </>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Revue de direction — {viewing?.reference}</DialogTitle></DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-xs text-muted-foreground">Date</Label><p className="text-sm">{viewing.date_revue ? format(new Date(viewing.date_revue), "dd/MM/yyyy") : "—"}</p></div>
                <div><Label className="text-xs text-muted-foreground">Statut</Label><Badge className={statutColors[viewing.statut]}>{statutLabels[viewing.statut]}</Badge></div>
              </div>
              {/* Participants display */}
              <div>
                <Label className="text-xs text-muted-foreground">Participants</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {parseParticipants(viewing.participants).length === 0 ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : parseParticipants(viewing.participants).map((p, i) => (
                    <Badge key={i} variant={p.type === "user" ? "default" : "secondary"} className="text-xs">
                      {p.name} {p.fonction ? `(${p.fonction})` : ""} {p.type === "guest" ? "[Invité]" : ""}
                    </Badge>
                  ))}
                </div>
              </div>
              {RICH_FIELDS.map(f => (
                <div key={f.key}>
                  <Label className="text-xs text-muted-foreground">{f.label}</Label>
                  <div className="prose prose-sm max-w-none text-sm mt-1" dangerouslySetInnerHTML={{ __html: viewing[f.key] || "—" }} />
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit - Fullscreen */}
      {dialog && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/30">
            <h2 className="text-lg font-semibold">{editing ? "Modifier" : "Nouvelle"} revue de direction</h2>
            <div className="flex items-center gap-3">
              <Input placeholder="Réf." className="w-32 h-8" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
              <Input type="date" className="w-40 h-8" value={form.date_revue} onChange={e => setForm(f => ({ ...f, date_revue: e.target.value }))} />
              <Select value={form.statut} onValueChange={v => setForm(f => ({ ...f, statut: v }))}>
                <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planifiee">Planifiée</SelectItem>
                  <SelectItem value="realisee">Réalisée</SelectItem>
                  <SelectItem value="cloturee">Clôturée</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Prochaine</Label>
                <Input type="date" className="w-40 h-8" value={form.prochaine_revue} onChange={e => setForm(f => ({ ...f, prochaine_revue: e.target.value }))} />
              </div>
              <Button size="sm" variant="outline" onClick={() => setDialog(false)}>Annuler</Button>
              <Button size="sm" onClick={() => saveMut.mutate({ ...form, id: editing?.id })} disabled={saveMut.isPending}>Enregistrer</Button>
              <Button size="sm" variant="ghost" onClick={() => setDialog(false)}><X className="h-4 w-4" /></Button>
            </div>
          </div>

          {/* Content with sidebar tabs */}
          <div className="flex-1 flex overflow-hidden">
            {/* Section selector */}
            <div className="w-56 border-r border-border bg-muted/20 py-2 flex-shrink-0 overflow-y-auto">
              {ALL_SECTIONS.map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActiveField(f.key)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    activeField === f.key
                      ? "bg-accent text-accent-foreground font-medium border-r-2 border-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Editor area */}
            <div className="flex-1 overflow-y-auto">
              {/* Participants section */}
              <div className={`p-6 ${activeField === "participants" ? "" : "hidden"}`}>
                <div className="max-w-2xl mx-auto">
                  <h3 className="text-lg font-semibold mb-4">Participants</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sélectionnez les utilisateurs participant à la revue ou ajoutez des invités externes.
                  </p>
                  <ParticipantSelector
                    value={form.participants}
                    onChange={v => setForm(prev => ({ ...prev, participants: v }))}
                  />
                </div>
              </div>

              {/* Rich text sections */}
              {RICH_FIELDS.map(f => (
                <div key={f.key} className={`h-full ${activeField === f.key ? "" : "hidden"}`}>
                  <RichTextEditor
                    value={(form as any)[f.key]}
                    onChange={v => setForm(prev => ({ ...prev, [f.key]: v }))}
                    placeholder={f.placeholder}
                    a4
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
