import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Check, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Acteur {
  id: string;
  nom: string;
  prenom: string;
  fonction: string | null;
  organisation: string | null;
  type_acteur: "interne" | "externe";
}

interface PartiePrenanteAdderProps {
  existingDescriptions: string[];
  onAdd: (description: string) => Promise<void>;
}

export function PartiePrenanteAdder({ existingDescriptions, onAdd }: PartiePrenanteAdderProps) {
  const [open, setOpen] = useState(false);
  const [acteurs, setActeurs] = useState<Acteur[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [customText, setCustomText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetch = async () => {
      const { data } = await supabase.from("acteurs").select("id, nom, prenom, fonction, organisation, type_acteur").eq("actif", true).order("nom");
      if (data) setActeurs(data);
    };
    fetch();
  }, [open]);

  const getActeurLabel = (a: Acteur) => {
    const name = `${a.prenom} ${a.nom}`.trim();
    return a.fonction ? `${name} – ${a.fonction}` : name;
  };

  const filtered = acteurs.filter((a) => {
    const label = getActeurLabel(a).toLowerCase();
    return label.includes(search.toLowerCase());
  });

  const toggleActeur = (label: string) => {
    setSelected((prev) => prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]);
  };

  const handleConfirm = async () => {
    const items = [...selected];
    if (customText.trim()) items.push(customText.trim());

    if (items.length === 0) {
      toast.error("Sélectionnez au moins un acteur ou saisissez un texte");
      return;
    }

    // Filter out already existing
    const newItems = items.filter((item) => !existingDescriptions.includes(item));
    if (newItems.length === 0) {
      toast.info("Toutes les parties prenantes sélectionnées existent déjà");
      reset();
      return;
    }

    setSaving(true);
    for (const desc of newItems) {
      await onAdd(desc);
    }
    setSaving(false);
    reset();
  };

  const reset = () => {
    setOpen(false);
    setSelected([]);
    setCustomText("");
    setSearch("");
  };

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3 w-3 mr-1" />Ajouter
      </Button>
    );
  }

  return (
    <div className="rounded-md border border-dashed bg-muted/20 p-3 space-y-3">
      <div className="relative">
        <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Rechercher un acteur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs pl-7"
        />
      </div>

      <ScrollArea className="max-h-40">
        <div className="space-y-1">
          {filtered.map((a) => {
            const label = getActeurLabel(a);
            const alreadyExists = existingDescriptions.includes(label);
            return (
              <label
                key={a.id}
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs cursor-pointer hover:bg-muted/50 ${alreadyExists ? "opacity-50" : ""}`}
              >
                <Checkbox
                  checked={selected.includes(label) || alreadyExists}
                  disabled={alreadyExists}
                  onCheckedChange={() => toggleActeur(label)}
                  className="h-3.5 w-3.5"
                />
                <span className="flex-1">{label}</span>
                <span className="text-muted-foreground text-[10px]">
                  {a.type_acteur === "interne" ? "Int." : "Ext."}
                </span>
              </label>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground italic px-2 py-1">Aucun acteur trouvé</p>
          )}
        </div>
      </ScrollArea>

      <div className="border-t pt-2">
        <Input
          placeholder="Ou saisir un texte libre..."
          value={customText}
          onChange={(e) => setCustomText(e.target.value)}
          className="h-7 text-xs"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {selected.length} sélectionné{selected.length > 1 ? "s" : ""}
        </span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleConfirm} disabled={saving}>
            <Check className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={reset}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
