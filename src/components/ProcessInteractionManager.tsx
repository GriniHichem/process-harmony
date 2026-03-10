import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, ArrowDownLeft, ArrowUpRight, Trash2, Link2 } from "lucide-react";

interface ProcessElement {
  id: string;
  code: string;
  description: string;
  type: string;
  ordre: number;
  process_id: string;
}

interface ProcessInfo {
  id: string;
  code: string;
  nom: string;
}

interface Interaction {
  id: string;
  source_process_id: string;
  target_process_id: string;
  element_id: string;
  direction: string;
}

interface Props {
  processId: string;
  processElements: ProcessElement[];
  canEdit: boolean;
  canDelete: boolean;
  onRefreshElements: () => void;
}

export function ProcessInteractionManager({ processId, processElements, canEdit, canDelete, onRefreshElements }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<string>("");
  const [selectedEntrees, setSelectedEntrees] = useState<Set<string>>(new Set());
  const [selectedSorties, setSelectedSorties] = useState<Set<string>>(new Set());
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [saving, setSaving] = useState(false);

  const entrees = processElements.filter(e => e.type === "donnee_entree");
  const sorties = processElements.filter(e => e.type === "donnee_sortie");

  const fetchInteractions = useCallback(async () => {
    const { data } = await supabase
      .from("process_interactions")
      .select("*")
      .or(`source_process_id.eq.${processId},target_process_id.eq.${processId}`);
    if (data) setInteractions(data as Interaction[]);
  }, [processId]);

  const fetchProcesses = useCallback(async () => {
    const { data } = await supabase
      .from("processes")
      .select("id, code, nom")
      .neq("id", processId)
      .order("code");
    if (data) setProcesses(data);
  }, [processId]);

  useEffect(() => {
    fetchInteractions();
    fetchProcesses();
  }, [fetchInteractions, fetchProcesses]);

  // Group interactions by target process
  const interactionsByProcess = interactions
    .filter(i => i.source_process_id === processId)
    .reduce<Record<string, Interaction[]>>((acc, i) => {
      if (!acc[i.target_process_id]) acc[i.target_process_id] = [];
      acc[i.target_process_id].push(i);
      return acc;
    }, {});

  const toggleEntree = (id: string) => {
    const next = new Set(selectedEntrees);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedEntrees(next);
  };

  const toggleSortie = (id: string) => {
    const next = new Set(selectedSorties);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedSorties(next);
  };

  const handleSave = async () => {
    if (!selectedProcessId) { toast.error("Sélectionnez un processus cible"); return; }
    if (selectedEntrees.size === 0 && selectedSorties.size === 0) { toast.error("Sélectionnez au moins une donnée"); return; }

    setSaving(true);
    try {
      // Fetch target process elements to check existing ones
      const { data: targetElements } = await supabase
        .from("process_elements")
        .select("*")
        .eq("process_id", selectedProcessId);

      const targetEls = (targetElements ?? []) as ProcessElement[];
      const insertInteractions: { source_process_id: string; target_process_id: string; element_id: string; direction: string }[] = [];

      // For each selected DE (entree) from source → create DS in target (inverse)
      for (const deId of selectedEntrees) {
        const srcEl = processElements.find(e => e.id === deId);
        if (!srcEl) continue;

        // Check if equivalent DS exists in target
        const existing = targetEls.find(e => e.type === "donnee_sortie" && e.description === srcEl.description);
        let targetElId: string;

        if (existing) {
          targetElId = existing.id;
        } else {
          const dsCount = targetEls.filter(e => e.type === "donnee_sortie").length;
          const code = `DS-${String(dsCount + 1).padStart(3, "0")}`;
          const { data: newEl, error } = await supabase.from("process_elements").insert({
            process_id: selectedProcessId,
            type: "donnee_sortie",
            code,
            description: srcEl.description,
            ordre: dsCount + 1,
          }).select().single();
          if (error) throw error;
          targetElId = (newEl as any).id;
          targetEls.push(newEl as any);
        }

        // Source interaction (entree from source perspective)
        insertInteractions.push({ source_process_id: processId, target_process_id: selectedProcessId, element_id: deId, direction: "entree" });
        // Inverse interaction on target side
        insertInteractions.push({ source_process_id: selectedProcessId, target_process_id: processId, element_id: targetElId, direction: "sortie" });
      }

      // For each selected DS (sortie) from source → create DE in target (inverse)
      for (const dsId of selectedSorties) {
        const srcEl = processElements.find(e => e.id === dsId);
        if (!srcEl) continue;

        const existing = targetEls.find(e => e.type === "donnee_entree" && e.description === srcEl.description);
        let targetElId: string;

        if (existing) {
          targetElId = existing.id;
        } else {
          const deCount = targetEls.filter(e => e.type === "donnee_entree").length;
          const code = `DE-${String(deCount + 1).padStart(3, "0")}`;
          const { data: newEl, error } = await supabase.from("process_elements").insert({
            process_id: selectedProcessId,
            type: "donnee_entree",
            code,
            description: srcEl.description,
            ordre: deCount + 1,
          }).select().single();
          if (error) throw error;
          targetElId = (newEl as any).id;
          targetEls.push(newEl as any);
        }

        insertInteractions.push({ source_process_id: processId, target_process_id: selectedProcessId, element_id: dsId, direction: "sortie" });
        insertInteractions.push({ source_process_id: selectedProcessId, target_process_id: processId, element_id: targetElId, direction: "entree" });
      }

      // Insert interactions (ignore conflicts)
      for (const row of insertInteractions) {
        await supabase.from("process_interactions").upsert(row, { onConflict: "source_process_id,target_process_id,element_id" });
      }

      toast.success("Interactions enregistrées");
      setDialogOpen(false);
      setSelectedProcessId("");
      setSelectedEntrees(new Set());
      setSelectedSorties(new Set());
      await fetchInteractions();
      onRefreshElements();
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteInteraction = async (targetProcId: string) => {
    // Delete all interactions between source and target (both directions)
    const { error: e1 } = await supabase
      .from("process_interactions")
      .delete()
      .eq("source_process_id", processId)
      .eq("target_process_id", targetProcId);

    const { error: e2 } = await supabase
      .from("process_interactions")
      .delete()
      .eq("source_process_id", targetProcId)
      .eq("target_process_id", processId);

    if (e1 || e2) { toast.error("Erreur lors de la suppression"); return; }
    toast.success("Interaction supprimée");
    fetchInteractions();
  };

  const getProcessName = (id: string) => {
    const p = processes.find(p => p.id === id);
    return p ? `${p.code} – ${p.nom}` : id;
  };

  const getElementInfo = (elId: string) => {
    const el = processElements.find(e => e.id === elId);
    return el ? { code: el.code, description: el.description, type: el.type } : null;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Link2 className="h-4 w-4 text-primary" /> Interactions
        </h3>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
          </Button>
        )}
      </div>

      {Object.keys(interactionsByProcess).length === 0 && (
        <p className="text-xs text-muted-foreground italic">Aucune interaction définie</p>
      )}

      {Object.entries(interactionsByProcess).map(([targetId, items]) => (
        <div key={targetId} className="rounded-md border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{getProcessName(targetId)}</span>
            {canDelete && (
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteInteraction(targetId)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {items.map(item => {
              const info = getElementInfo(item.element_id);
              if (!info) return null;
              return (
                <Badge key={item.id} variant="secondary" className="flex items-center gap-1 text-xs">
                  {item.direction === "entree" ? (
                    <ArrowDownLeft className="h-3 w-3 text-blue-500" />
                  ) : (
                    <ArrowUpRight className="h-3 w-3 text-green-500" />
                  )}
                  {info.code}: {info.description}
                </Badge>
              );
            })}
          </div>
        </div>
      ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Ajouter une interaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Processus cible</label>
              <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner un processus" /></SelectTrigger>
                <SelectContent>
                  {processes.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.code} – {p.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {entrees.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <ArrowDownLeft className="h-3.5 w-3.5 text-blue-500" /> Données d'entrée
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {entrees.map(el => (
                    <label key={el.id} className="flex items-center gap-2 text-sm cursor-pointer rounded px-2 py-1 hover:bg-muted">
                      <Checkbox checked={selectedEntrees.has(el.id)} onCheckedChange={() => toggleEntree(el.id)} />
                      <span className="font-mono text-xs text-muted-foreground">{el.code}</span>
                      <span>{el.description}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {sorties.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5 text-green-500" /> Données de sortie
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {sorties.map(el => (
                    <label key={el.id} className="flex items-center gap-2 text-sm cursor-pointer rounded px-2 py-1 hover:bg-muted">
                      <Checkbox checked={selectedSorties.has(el.id)} onCheckedChange={() => toggleSortie(el.id)} />
                      <span className="font-mono text-xs text-muted-foreground">{el.code}</span>
                      <span>{el.description}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {entrees.length === 0 && sorties.length === 0 && (
              <p className="text-sm text-muted-foreground">Ajoutez d'abord des données d'entrée ou de sortie dans les éléments du processus.</p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "..." : "Enregistrer"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
