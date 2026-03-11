import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Import, CheckCircle2, Clock, Circle, Link2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useActeurs } from "@/hooks/useActeurs";
import { ActeurSelect } from "@/components/ActeurSelect";
import { format } from "date-fns";

interface ReviewDecision {
  id: string;
  review_id: string;
  input_item_id: string | null;
  type: string;
  description: string;
  responsable_id: string | null;
  echeance: string | null;
  statut: string;
  source_entity_type: string | null;
  source_entity_id: string | null;
  ordre: number;
  created_at: string;
  updated_at: string;
}

interface ReviewInputItem {
  id: string;
  type: string;
  label: string;
  entity_id: string | null;
}

const STATUT_CONFIG: Record<string, { label: string; color: string; icon: typeof Circle }> = {
  a_faire: { label: "À faire", color: "bg-muted text-muted-foreground", icon: Circle },
  en_cours: { label: "En cours", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", icon: Clock },
  terminee: { label: "Terminée", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", icon: CheckCircle2 },
};

const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  decision: { label: "Décision", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  action: { label: "Action", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
};

// Fetch importable actions from linked entities
async function fetchImportableActions(inputItems: ReviewInputItem[]) {
  const importable: { inputItem: ReviewInputItem; sourceType: string; sourceId: string; description: string; responsable: string | null; deadline: string | null }[] = [];

  const riskItems = inputItems.filter(i => i.type === "risque" && i.entity_id);
  const indicatorItems = inputItems.filter(i => i.type === "indicateur" && i.entity_id);
  const enjeuItems = inputItems.filter(i => i.type === "enjeu" && i.entity_id);

  // Risk actions + moyens
  for (const item of riskItems) {
    const [{ data: actions }, { data: moyens }] = await Promise.all([
      supabase.from("risk_actions").select("id, description, responsable, deadline, statut").eq("risk_id", item.entity_id!),
      supabase.from("risk_moyens").select("id, description, responsable, deadline, statut").eq("risk_id", item.entity_id!),
    ]);
    (actions || []).forEach(a => importable.push({ inputItem: item, sourceType: "risk_action", sourceId: a.id, description: a.description, responsable: a.responsable, deadline: a.deadline }));
    (moyens || []).forEach(m => importable.push({ inputItem: item, sourceType: "risk_moyen", sourceId: m.id, description: m.description, responsable: m.responsable, deadline: m.deadline }));
  }

  // Indicator actions + moyens
  for (const item of indicatorItems) {
    const [{ data: actions }, { data: moyens }] = await Promise.all([
      supabase.from("indicator_actions").select("id, description, responsable, deadline, statut").eq("indicator_id", item.entity_id!),
      supabase.from("indicator_moyens").select("id, description, responsable, deadline, statut").eq("indicator_id", item.entity_id!),
    ]);
    (actions || []).forEach(a => importable.push({ inputItem: item, sourceType: "indicator_action", sourceId: a.id, description: a.description, responsable: a.responsable, deadline: a.deadline }));
    (moyens || []).forEach(m => importable.push({ inputItem: item, sourceType: "indicator_moyen", sourceId: m.id, description: m.description, responsable: m.responsable, deadline: m.deadline }));
  }

  // Context issue actions
  for (const item of enjeuItems) {
    const { data: actions } = await supabase.from("context_issue_actions").select("id, description, responsable, statut").eq("context_issue_id", item.entity_id!);
    (actions || []).forEach(a => importable.push({ inputItem: item, sourceType: "context_issue_action", sourceId: a.id, description: a.description, responsable: a.responsable, deadline: null }));
  }

  return importable;
}

// Add decision/action form
function AddDecisionForm({ reviewId, inputItems, existingDecisions, onAdded, filterType }: {
  reviewId: string;
  inputItems: ReviewInputItem[];
  existingDecisions: ReviewDecision[];
  onAdded: () => void;
  filterType?: "decision" | "action";
}) {
  const { acteurs } = useActeurs();
  const [type, setType] = useState<string>(filterType || "decision");
  const [description, setDescription] = useState("");
  const [responsableId, setResponsableId] = useState("");
  const [echeance, setEcheance] = useState("");
  const [inputItemId, setInputItemId] = useState<string>("none");
  const [showImport, setShowImport] = useState(false);

  const { data: importableActions = [] } = useQuery({
    queryKey: ["importable_actions", reviewId, inputItems.map(i => i.id).join(",")],
    queryFn: () => fetchImportableActions(inputItems),
    enabled: showImport && inputItems.length > 0,
  });

  // Filter out already imported
  const alreadyImported = new Set(existingDecisions.filter(d => d.source_entity_id).map(d => `${d.source_entity_type}:${d.source_entity_id}`));
  const availableImports = importableActions.filter(a => !alreadyImported.has(`${a.sourceType}:${a.sourceId}`));

  const addMut = useMutation({
    mutationFn: async () => {
      if (!description.trim()) throw new Error("Description requise");
      const { error } = await supabase.from("review_decisions").insert({
        review_id: reviewId,
        input_item_id: inputItemId !== "none" ? inputItemId : null,
        type,
        description: description.trim(),
        responsable_id: responsableId || null,
        echeance: echeance || null,
        ordre: 999,
      });
      if (error) throw error;
    },
    onSuccess: () => { setDescription(""); setResponsableId(""); setEcheance(""); setInputItemId("none"); onAdded(); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const importMut = useMutation({
    mutationFn: async (item: typeof importableActions[0]) => {
      const { error } = await supabase.from("review_decisions").insert({
        review_id: reviewId,
        input_item_id: item.inputItem.id,
        type: "action",
        description: item.description,
        responsable_id: null,
        echeance: item.deadline || null,
        source_entity_type: item.sourceType,
        source_entity_id: item.sourceId,
        ordre: 999,
      });
      if (error) throw error;
    },
    onSuccess: () => { onAdded(); toast({ title: "Action importée" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const sourceTypeLabels: Record<string, string> = {
    risk_action: "Action risque",
    risk_moyen: "Moyen risque",
    indicator_action: "Action indicateur",
    indicator_moyen: "Moyen indicateur",
    context_issue_action: "Action enjeu",
  };

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg border border-dashed border-border bg-muted/20 space-y-2">
        <div className="flex flex-wrap gap-2 items-end">
          {!filterType && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="decision">Décision</SelectItem>
                  <SelectItem value="action">Action</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex-1 min-w-[200px] space-y-1">
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Input
              className="h-8 text-sm"
              placeholder="Saisir la décision ou action..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && description.trim()) addMut.mutate(); }}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Responsable</Label>
            <div className="w-44">
              <ActeurSelect value={responsableId} onChange={setResponsableId} acteurs={acteurs} placeholder="Responsable" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Échéance</Label>
            <Input type="date" className="w-36 h-8 text-xs" value={echeance} onChange={e => setEcheance(e.target.value)} />
          </div>

          {inputItems.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Élément lié</Label>
              <Select value={inputItemId} onValueChange={setInputItemId}>
                <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="Aucun" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {inputItems.map(item => (
                    <SelectItem key={item.id} value={item.id} className="text-xs">
                      {item.label.slice(0, 50)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button size="sm" variant="outline" className="h-8" disabled={!description.trim()} onClick={() => addMut.mutate()}>
            <Plus className="h-3.5 w-3.5 mr-1" />Ajouter
          </Button>
        </div>
      </div>

      {/* Import from linked entities */}
      {inputItems.some(i => ["risque", "indicateur", "enjeu"].includes(i.type) && i.entity_id) && (
        <div>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => setShowImport(!showImport)}>
            <Import className="h-3.5 w-3.5" />
            {showImport ? "Masquer" : "Importer"} des actions existantes
          </Button>

          {showImport && (
            <div className="mt-2 border border-border rounded-lg overflow-hidden">
              {availableImports.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 text-center">Aucune action/moyen disponible à importer.</p>
              ) : (
                <div className="divide-y divide-border max-h-60 overflow-y-auto">
                  {availableImports.map((a, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors">
                      <Badge className="text-[10px] bg-muted text-muted-foreground shrink-0">{sourceTypeLabels[a.sourceType] || a.sourceType}</Badge>
                      <span className="text-xs flex-1 min-w-0 truncate">{a.description}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{a.inputItem.label.slice(0, 30)}</span>
                      {a.deadline && <span className="text-[10px] text-muted-foreground">{format(new Date(a.deadline), "dd/MM/yy")}</span>}
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => importMut.mutate(a)}>
                        <Import className="h-3 w-3 mr-1" />Importer
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Single decision row
function DecisionRow({ item, inputItems, canEdit, onRefresh }: {
  item: ReviewDecision;
  inputItems: ReviewInputItem[];
  canEdit: boolean;
  onRefresh: () => void;
}) {
  const { acteurs, getActeurLabel } = useActeurs();
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(item.description);
  const [resp, setResp] = useState(item.responsable_id || "");
  const [ech, setEch] = useState(item.echeance || "");
  const [statut, setStatut] = useState(item.statut);

  const typeConf = TYPE_CONFIG[item.type] || TYPE_CONFIG.decision;
  const statutConf = STATUT_CONFIG[item.statut] || STATUT_CONFIG.a_faire;
  const linkedInput = inputItems.find(i => i.id === item.input_item_id);

  const updateMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("review_decisions").update({
        description: desc,
        responsable_id: resp || null,
        echeance: ech || null,
        statut,
      }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => { setEditing(false); onRefresh(); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("review_decisions").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: onRefresh,
  });

  if (editing && canEdit) {
    return (
      <div className="p-2 rounded border border-border bg-muted/10 space-y-2">
        <Input className="h-8 text-sm" value={desc} onChange={e => setDesc(e.target.value)} />
        <div className="flex flex-wrap gap-2 items-end">
          <div className="w-40">
            <ActeurSelect value={resp} onChange={setResp} acteurs={acteurs} placeholder="Responsable" />
          </div>
          <Input type="date" className="w-36 h-8 text-xs" value={ech} onChange={e => setEch(e.target.value)} />
          <Select value={statut} onValueChange={setStatut}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUT_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" className="h-8" onClick={() => updateMut.mutate()}>Sauver</Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditing(false)}>Annuler</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-muted/40 transition-colors group">
      <Badge className={`${typeConf.color} text-[10px] shrink-0 mt-0.5`}>{typeConf.label}</Badge>
      <Badge className={`${statutConf.color} text-[10px] shrink-0 mt-0.5`}>{statutConf.label}</Badge>

      <div className="flex-1 min-w-0">
        <span className="text-sm">{item.description}</span>
        <div className="flex flex-wrap gap-2 mt-0.5">
          {item.responsable_id && (
            <span className="text-[10px] text-muted-foreground">👤 {getActeurLabel(item.responsable_id)}</span>
          )}
          {item.echeance && (
            <span className="text-[10px] text-muted-foreground">📅 {format(new Date(item.echeance), "dd/MM/yyyy")}</span>
          )}
          {linkedInput && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Link2 className="h-2.5 w-2.5" />{linkedInput.label.slice(0, 40)}
            </span>
          )}
          {item.source_entity_type && (
            <Badge variant="outline" className="text-[9px] h-4">importé</Badge>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(true)}>
            <span className="text-xs">✏️</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteMut.mutate()}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Main editor
export function ReviewDecisionsEditor({ reviewId, canEdit, filterType }: {
  reviewId: string;
  canEdit: boolean;
  filterType?: "decision" | "action";
}) {
  const qc = useQueryClient();

  const { data: decisions = [], refetch } = useQuery({
    queryKey: ["review_decisions", reviewId],
    queryFn: async () => {
      const { data, error } = await supabase.from("review_decisions").select("*").eq("review_id", reviewId).order("ordre");
      if (error) throw error;
      return data as ReviewDecision[];
    },
    enabled: !!reviewId,
  });

  const { data: inputItems = [] } = useQuery({
    queryKey: ["review_input_items", reviewId],
    queryFn: async () => {
      const { data, error } = await supabase.from("review_input_items").select("id, type, label, entity_id").eq("review_id", reviewId).order("ordre");
      if (error) throw error;
      return data as ReviewInputItem[];
    },
    enabled: !!reviewId,
  });

  const filtered = filterType ? decisions.filter(d => d.type === filterType) : decisions;
  const refresh = () => { refetch(); qc.invalidateQueries({ queryKey: ["review_decisions", reviewId] }); };

  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucune {filterType === "action" ? "action" : filterType === "decision" ? "décision" : "décision ou action"} enregistrée.
          </p>
        )}
        {filtered.map(d => (
          <DecisionRow key={d.id} item={d} inputItems={inputItems} canEdit={canEdit} onRefresh={refresh} />
        ))}
      </div>
      {canEdit && (
        <AddDecisionForm
          reviewId={reviewId}
          inputItems={inputItems}
          existingDecisions={decisions}
          onAdded={refresh}
          filterType={filterType}
        />
      )}
    </div>
  );
}

// Read-only viewer
export function ReviewDecisionsView({ reviewId, filterType }: { reviewId: string; filterType?: "decision" | "action" }) {
  const { getActeurLabel } = useActeurs();

  const { data: decisions = [] } = useQuery({
    queryKey: ["review_decisions", reviewId],
    queryFn: async () => {
      const { data, error } = await supabase.from("review_decisions").select("*").eq("review_id", reviewId).order("ordre");
      if (error) throw error;
      return data as ReviewDecision[];
    },
    enabled: !!reviewId,
  });

  const filtered = filterType ? decisions.filter(d => d.type === filterType) : decisions;

  if (filtered.length === 0) return <span className="text-sm text-muted-foreground">—</span>;

  return (
    <div className="space-y-1">
      {filtered.map(d => {
        const typeConf = TYPE_CONFIG[d.type] || TYPE_CONFIG.decision;
        const statutConf = STATUT_CONFIG[d.statut] || STATUT_CONFIG.a_faire;
        return (
          <div key={d.id} className="flex items-start gap-1.5 py-1">
            <Badge className={`${typeConf.color} text-[10px] shrink-0`}>{typeConf.label}</Badge>
            <Badge className={`${statutConf.color} text-[10px] shrink-0`}>{statutConf.label}</Badge>
            <div className="min-w-0">
              <span className="text-sm">{d.description}</span>
              <div className="flex flex-wrap gap-2">
                {d.responsable_id && <span className="text-[10px] text-muted-foreground">👤 {getActeurLabel(d.responsable_id)}</span>}
                {d.echeance && <span className="text-[10px] text-muted-foreground">📅 {format(new Date(d.echeance), "dd/MM/yyyy")}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
