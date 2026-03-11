import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronRight, ChevronDown, Link2, MessageSquare, ArrowUp, ArrowDown, CornerDownRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

const ENTITY_TYPES = [
  { value: "libre", label: "Point libre", color: "bg-muted text-muted-foreground" },
  { value: "processus", label: "Processus", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  { value: "indicateur", label: "Indicateur", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" },
  { value: "risque", label: "Risque/Opportunité", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  { value: "audit", label: "Audit", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  { value: "nc", label: "Non-conformité", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  { value: "action", label: "Action", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  { value: "document", label: "Document", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200" },
  { value: "incident", label: "Incident", color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200" },
  { value: "enjeu", label: "Enjeu du contexte", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
  { value: "fournisseur", label: "Fournisseur", color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" },
  { value: "satisfaction", label: "Satisfaction client", color: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200" },
  { value: "competence", label: "Compétence", color: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200" },
] as const;

type EntityType = (typeof ENTITY_TYPES)[number]["value"];

interface ReviewItem {
  id: string;
  review_id: string;
  parent_id: string | null;
  ordre: number;
  type: string;
  label: string;
  entity_id: string | null;
  commentaire: string;
  created_at: string;
  updated_at: string;
}

function getTypeInfo(type: string) {
  return ENTITY_TYPES.find(t => t.value === type) || ENTITY_TYPES[0];
}

// Entity fetcher hook
function useEntityOptions(type: EntityType) {
  return useQuery({
    queryKey: ["entity_options", type],
    queryFn: async () => {
      switch (type) {
        case "processus": {
          const { data } = await supabase.from("processes").select("id, code, nom").order("code");
          return (data || []).map(r => ({ id: r.id, label: `${r.code} — ${r.nom}` }));
        }
        case "indicateur": {
          const { data } = await supabase.from("indicators").select("id, nom").order("nom");
          return (data || []).map(r => ({ id: r.id, label: r.nom }));
        }
        case "risque": {
          const { data } = await supabase.from("risks_opportunities").select("id, description, type").order("created_at", { ascending: false });
          return (data || []).map(r => ({ id: r.id, label: `[${r.type === "risque" ? "R" : "O"}] ${r.description.slice(0, 80)}` }));
        }
        case "audit": {
          const { data } = await supabase.from("audits").select("id, reference, type_audit").order("reference");
          return (data || []).map(r => ({ id: r.id, label: `${r.reference} (${r.type_audit})` }));
        }
        case "nc": {
          const { data } = await supabase.from("nonconformities").select("id, reference, description").order("reference");
          return (data || []).map(r => ({ id: r.id, label: `${r.reference} — ${r.description.slice(0, 60)}` }));
        }
        case "action": {
          const { data } = await supabase.from("actions").select("id, description, type_action").order("created_at", { ascending: false });
          return (data || []).map(r => ({ id: r.id, label: `[${r.type_action}] ${r.description.slice(0, 80)}` }));
        }
        case "document": {
          const { data } = await supabase.from("documents").select("id, titre").order("titre");
          return (data || []).map(r => ({ id: r.id, label: r.titre }));
        }
        case "incident": {
          const { data } = await supabase.from("risk_incidents").select("id, description").order("date_incident", { ascending: false });
          return (data || []).map(r => ({ id: r.id, label: r.description.slice(0, 80) }));
        }
        case "enjeu": {
          const { data } = await supabase.from("context_issues").select("id, reference, intitule").order("reference");
          return (data || []).map(r => ({ id: r.id, label: `${r.reference} — ${r.intitule}` }));
        }
        case "fournisseur": {
          const { data } = await supabase.from("suppliers").select("id, reference, nom").order("nom");
          return (data || []).map(r => ({ id: r.id, label: `${r.reference} — ${r.nom}` }));
        }
        case "satisfaction": {
          const { data } = await supabase.from("satisfaction_surveys").select("id, reference, titre").order("date_enquete", { ascending: false });
          return (data || []).map(r => ({ id: r.id, label: `${r.reference} — ${r.titre}` }));
        }
        case "competence": {
          const { data } = await supabase.from("competences").select("id, competence").order("competence");
          return (data || []).map(r => ({ id: r.id, label: r.competence }));
        }
        default:
          return [];
      }
    },
    enabled: type !== "libre",
  });
}

// Add item form
function AddItemForm({ reviewId, parentId, onAdded }: { reviewId: string; parentId: string | null; onAdded: () => void }) {
  const [type, setType] = useState<EntityType>("libre");
  const [label, setLabel] = useState("");
  const [entityId, setEntityId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { data: options = [] } = useEntityOptions(type);

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));

  const addMut = useMutation({
    mutationFn: async () => {
      const finalLabel = type === "libre" ? label : (options.find(o => o.id === entityId)?.label || label);
      if (!finalLabel.trim()) throw new Error("Label requis");
      const { error } = await supabase.from("review_input_items").insert({
        review_id: reviewId,
        parent_id: parentId,
        type,
        label: finalLabel,
        entity_id: type !== "libre" ? entityId : null,
        ordre: 999,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setLabel("");
      setEntityId(null);
      setSearch("");
      setType("libre");
      onAdded();
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="flex flex-wrap items-start gap-2 p-3 rounded-lg border border-dashed border-border bg-muted/20">
      <Select value={type} onValueChange={(v: EntityType) => { setType(v); setEntityId(null); setSearch(""); }}>
        <SelectTrigger className="w-44 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ENTITY_TYPES.map(t => (
            <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {type === "libre" ? (
        <Input
          className="flex-1 min-w-[200px] h-8 text-sm"
          placeholder="Saisir un point à discuter..."
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && label.trim()) addMut.mutate(); }}
        />
      ) : (
        <div className="flex-1 min-w-[200px] space-y-1">
          <Input
            className="h-8 text-sm"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {filtered.length > 0 && (
            <div className="max-h-32 overflow-y-auto border border-border rounded bg-background">
              {filtered.slice(0, 20).map(o => (
                <button
                  key={o.id}
                  type="button"
                  className={`w-full text-left px-2 py-1.5 text-xs hover:bg-accent transition-colors ${entityId === o.id ? "bg-accent font-medium" : ""}`}
                  onClick={() => setEntityId(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <Button
        size="sm"
        variant="outline"
        className="h-8"
        disabled={type === "libre" ? !label.trim() : !entityId}
        onClick={() => addMut.mutate()}
      >
        <Plus className="h-3.5 w-3.5 mr-1" />Ajouter
      </Button>
    </div>
  );
}

// Single item row
function ItemRow({
  item,
  items,
  depth,
  canEdit,
  onRefresh,
}: {
  item: ReviewItem;
  items: ReviewItem[];
  depth: number;
  canEdit: boolean;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showAddChild, setShowAddChild] = useState(false);
  const [showComment, setShowComment] = useState(!!item.commentaire);
  const [comment, setComment] = useState(item.commentaire);
  const qc = useQueryClient();

  const children = items.filter(i => i.parent_id === item.id).sort((a, b) => a.ordre - b.ordre);
  const typeInfo = getTypeInfo(item.type);

  const deleteMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("review_input_items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: onRefresh,
  });

  const updateCommentMut = useMutation({
    mutationFn: async (c: string) => {
      const { error } = await supabase.from("review_input_items").update({ commentaire: c }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: onRefresh,
  });

  const moveMut = useMutation({
    mutationFn: async (dir: "up" | "down") => {
      const siblings = items.filter(i => i.parent_id === item.parent_id).sort((a, b) => a.ordre - b.ordre);
      const idx = siblings.findIndex(s => s.id === item.id);
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= siblings.length) return;
      const other = siblings[swapIdx];
      await supabase.from("review_input_items").update({ ordre: other.ordre }).eq("id", item.id);
      await supabase.from("review_input_items").update({ ordre: item.ordre }).eq("id", other.id);
    },
    onSuccess: onRefresh,
  });

  return (
    <div>
      <div className={`flex items-start gap-1.5 py-1.5 px-2 rounded hover:bg-muted/40 transition-colors group`} style={{ paddingLeft: `${depth * 24 + 8}px` }}>
        {children.length > 0 ? (
          <button type="button" onClick={() => setExpanded(!expanded)} className="mt-0.5 p-0.5 text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-[18px]" />
        )}

        <Badge className={`${typeInfo.color} text-[10px] shrink-0 mt-0.5`}>{typeInfo.label}</Badge>

        <span className="text-sm flex-1 min-w-0">
          {item.label}
          {item.commentaire && !showComment && (
            <span className="text-xs text-muted-foreground ml-2 italic">— {item.commentaire.slice(0, 50)}…</span>
          )}
        </span>

        {canEdit && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveMut.mutate("up")}><ArrowUp className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveMut.mutate("down")}><ArrowDown className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowComment(!showComment)}><MessageSquare className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowAddChild(!showAddChild)}><CornerDownRight className="h-3 w-3" /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => deleteMut.mutate()}><Trash2 className="h-3 w-3" /></Button>
          </div>
        )}
      </div>

      {showComment && canEdit && (
        <div className="flex gap-2 py-1" style={{ paddingLeft: `${depth * 24 + 32}px` }}>
          <Textarea
            className="text-xs min-h-[40px] flex-1"
            placeholder="Commentaire / note..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            onBlur={() => { if (comment !== item.commentaire) updateCommentMut.mutate(comment); }}
          />
        </div>
      )}

      {expanded && children.map(child => (
        <ItemRow key={child.id} item={child} items={items} depth={depth + 1} canEdit={canEdit} onRefresh={onRefresh} />
      ))}

      {showAddChild && canEdit && (
        <div style={{ paddingLeft: `${(depth + 1) * 24 + 8}px` }} className="py-1">
          <AddItemForm reviewId={item.review_id} parentId={item.id} onAdded={() => { onRefresh(); setShowAddChild(false); }} />
        </div>
      )}
    </div>
  );
}

// Read-only display for view dialog
function ItemRowReadOnly({ item, items, depth }: { item: ReviewItem; items: ReviewItem[]; depth: number }) {
  const children = items.filter(i => i.parent_id === item.id).sort((a, b) => a.ordre - b.ordre);
  const typeInfo = getTypeInfo(item.type);

  return (
    <div>
      <div className="flex items-start gap-1.5 py-1" style={{ paddingLeft: `${depth * 20 + 4}px` }}>
        {children.length > 0 && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />}
        {children.length === 0 && <span className="w-[14px]" />}
        <Badge className={`${typeInfo.color} text-[10px] shrink-0`}>{typeInfo.label}</Badge>
        <span className="text-sm">{item.label}</span>
      </div>
      {item.commentaire && (
        <p className="text-xs text-muted-foreground italic" style={{ paddingLeft: `${depth * 20 + 22}px` }}>{item.commentaire}</p>
      )}
      {children.map(c => <ItemRowReadOnly key={c.id} item={c} items={items} depth={depth + 1} />)}
    </div>
  );
}

// Main editable component
export function ReviewInputItemsEditor({ reviewId, canEdit }: { reviewId: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const { data: items = [], refetch } = useQuery({
    queryKey: ["review_input_items", reviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_input_items")
        .select("*")
        .eq("review_id", reviewId)
        .order("ordre");
      if (error) throw error;
      return data as ReviewItem[];
    },
    enabled: !!reviewId,
  });

  const roots = items.filter(i => !i.parent_id).sort((a, b) => a.ordre - b.ordre);

  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        {roots.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">Aucun élément d'entrée. Ajoutez un point libre ou liez un élément existant.</p>
        )}
        {roots.map(item => (
          <ItemRow key={item.id} item={item} items={items} depth={0} canEdit={canEdit} onRefresh={() => { refetch(); qc.invalidateQueries({ queryKey: ["review_input_items", reviewId] }); }} />
        ))}
      </div>
      {canEdit && (
        <AddItemForm reviewId={reviewId} parentId={null} onAdded={() => { refetch(); qc.invalidateQueries({ queryKey: ["review_input_items", reviewId] }); }} />
      )}
    </div>
  );
}

// Read-only viewer
export function ReviewInputItemsView({ reviewId }: { reviewId: string }) {
  const { data: items = [] } = useQuery({
    queryKey: ["review_input_items", reviewId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_input_items")
        .select("*")
        .eq("review_id", reviewId)
        .order("ordre");
      if (error) throw error;
      return data as ReviewItem[];
    },
    enabled: !!reviewId,
  });

  const roots = items.filter(i => !i.parent_id).sort((a, b) => a.ordre - b.ordre);

  if (roots.length === 0) return <span className="text-sm text-muted-foreground">—</span>;

  return (
    <div className="space-y-0.5">
      {roots.map(item => <ItemRowReadOnly key={item.id} item={item} items={items} depth={0} />)}
    </div>
  );
}
