import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Check, X, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Acteur {
  id: string;
  fonction: string | null;
  organisation: string | null;
  type_acteur: "interne" | "externe";
}

interface ActeurGroup {
  id: string;
  nom: string;
}

interface PartiePrenanteAdderProps {
  existingDescriptions: string[];
  onAdd: (description: string) => Promise<void>;
}

export function PartiePrenanteAdder({ existingDescriptions, onAdd }: PartiePrenanteAdderProps) {
  const [open, setOpen] = useState(false);
  const [acteurs, setActeurs] = useState<Acteur[]>([]);
  const [groups, setGroups] = useState<ActeurGroup[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [customText, setCustomText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      const [acteursRes, groupsRes] = await Promise.all([
        supabase.from("acteurs").select("id, fonction, organisation, type_acteur").eq("actif", true).order("fonction"),
        supabase.from("acteur_groups").select("id, nom").order("nom"),
      ]);
      if (acteursRes.data) setActeurs(acteursRes.data);
      if (groupsRes.data) setGroups(groupsRes.data as ActeurGroup[]);
    };
    fetchData();
  }, [open]);

  const getActeurLabel = (a: Acteur) => a.fonction || "—";

  const filteredActeurs = acteurs.filter((a) => {
    const label = getActeurLabel(a).toLowerCase();
    return label.includes(search.toLowerCase());
  });

  const filteredGroups = groups.filter((g) =>
    g.nom.toLowerCase().includes(search.toLowerCase())
  );

  const toggleActeur = (label: string) => {
    setSelected((prev) => prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label]);
  };

  const toggleGroup = (groupName: string) => {
    setSelectedGroups((prev) => prev.includes(groupName) ? prev.filter((s) => s !== groupName) : [...prev, groupName]);
  };

  const handleConfirm = async () => {
    const items = [...selected, ...selectedGroups.map(g => `[Groupe] ${g}`)];
    if (customText.trim()) items.push(customText.trim());

    if (items.length === 0) {
      toast.error("Sélectionnez au moins un acteur, un groupe ou saisissez un texte");
      return;
    }

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
    setSelectedGroups([]);
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
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs pl-7"
        />
      </div>

      <Tabs defaultValue="acteurs" className="w-full">
        <TabsList className="h-7 w-full">
          <TabsTrigger value="acteurs" className="text-xs h-6 flex-1">Acteurs</TabsTrigger>
          <TabsTrigger value="groupes" className="text-xs h-6 flex-1">Groupes</TabsTrigger>
        </TabsList>

        <TabsContent value="acteurs" className="mt-2">
          <ScrollArea className="max-h-40">
            <div className="space-y-1">
              {filteredActeurs.map((a) => {
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
              {filteredActeurs.length === 0 && (
                <p className="text-xs text-muted-foreground italic px-2 py-1">Aucun acteur trouvé</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="groupes" className="mt-2">
          <ScrollArea className="max-h-40">
            <div className="space-y-1">
              {filteredGroups.map((g) => {
                const groupLabel = `[Groupe] ${g.nom}`;
                const alreadyExists = existingDescriptions.includes(groupLabel);
                return (
                  <label
                    key={g.id}
                    className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs cursor-pointer hover:bg-muted/50 ${alreadyExists ? "opacity-50" : ""}`}
                  >
                    <Checkbox
                      checked={selectedGroups.includes(g.nom) || alreadyExists}
                      disabled={alreadyExists}
                      onCheckedChange={() => toggleGroup(g.nom)}
                      className="h-3.5 w-3.5"
                    />
                    <span className="flex-1">{g.nom}</span>
                    <span className="text-muted-foreground text-[10px]">Groupe</span>
                  </label>
                );
              })}
              {filteredGroups.length === 0 && (
                <p className="text-xs text-muted-foreground italic px-2 py-1">Aucun groupe trouvé</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

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
          {selected.length + selectedGroups.length} sélectionné{(selected.length + selectedGroups.length) > 1 ? "s" : ""}
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
