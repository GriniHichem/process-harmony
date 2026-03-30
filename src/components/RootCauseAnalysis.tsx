import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Save, RotateCcw } from "lucide-react";

interface RCA {
  id: string;
  nc_id: string;
  methode: string;
  data: any;
  conclusion: string | null;
}

const METHODES: { value: string; label: string; description: string }[] = [
  { value: "ishikawa_5m", label: "Ishikawa 5M", description: "Diagramme causes-effet : Matière, Milieu, Méthodes, Matériel, Main-d'œuvre" },
  { value: "ishikawa_7m", label: "Ishikawa 7M", description: "5M étendu avec Management et Mesure" },
  { value: "5_pourquoi", label: "5 Pourquoi", description: "Chaîne de questions successives jusqu'à la cause racine" },
  { value: "qqoqcp", label: "QQOQCP", description: "Qui, Quoi, Où, Quand, Comment, Combien, Pourquoi" },
  { value: "pareto", label: "Pareto", description: "Analyse des causes par fréquence / impact" },
  { value: "amdec", label: "AMDEC", description: "Analyse des modes de défaillance, effets et criticité" },
];

const ISHIKAWA_5M = ["Matière", "Milieu", "Méthodes", "Matériel", "Main-d'œuvre"];
const ISHIKAWA_7M = [...ISHIKAWA_5M, "Management", "Mesure"];
const QQOQCP_FIELDS = [
  { key: "qui", label: "Qui ?" },
  { key: "quoi", label: "Quoi ?" },
  { key: "ou", label: "Où ?" },
  { key: "quand", label: "Quand ?" },
  { key: "comment", label: "Comment ?" },
  { key: "combien", label: "Combien ?" },
  { key: "pourquoi", label: "Pourquoi ?" },
];

function getDefaultData(methode: string): any {
  if (methode === "ishikawa_5m") {
    return { categories: Object.fromEntries(ISHIKAWA_5M.map(c => [c, [""]])) };
  }
  if (methode === "ishikawa_7m") {
    return { categories: Object.fromEntries(ISHIKAWA_7M.map(c => [c, [""]])) };
  }
  if (methode === "5_pourquoi") {
    return { pourquois: ["", ""] };
  }
  if (methode === "qqoqcp") {
    return Object.fromEntries(QQOQCP_FIELDS.map(f => [f.key, ""]));
  }
  if (methode === "pareto") {
    return { items: [{ cause: "", frequence: 0 }] };
  }
  if (methode === "amdec") {
    return { items: [{ mode: "", effet: "", cause: "", gravite: 1, occurrence: 1, detection: 1 }] };
  }
  return {};
}

interface RootCauseAnalysisProps {
  ncId: string;
  canEdit: boolean;
}

export function RootCauseAnalysis({ ncId, canEdit }: RootCauseAnalysisProps) {
  const [rca, setRca] = useState<RCA | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethode, setSelectedMethode] = useState("");
  const [data, setData] = useState<any>({});
  const [conclusion, setConclusion] = useState("");
  const [dirty, setDirty] = useState(false);

  const fetchRCA = async () => {
    const { data: rows } = await supabase.from("nc_root_cause_analyses").select("*").eq("nc_id", ncId).limit(1);
    const row = (rows ?? [])[0] as RCA | undefined;
    if (row) {
      setRca(row);
      setSelectedMethode(row.methode);
      setData(row.data);
      setConclusion(row.conclusion || "");
    }
    setLoading(false);
  };

  useEffect(() => { fetchRCA(); }, [ncId]);

  const handleCreate = async (methode: string) => {
    const defaultData = getDefaultData(methode);
    const { data: inserted, error } = await supabase.from("nc_root_cause_analyses")
      .insert({ nc_id: ncId, methode, data: defaultData })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setRca(inserted as RCA);
    setSelectedMethode(methode);
    setData(defaultData);
    setConclusion("");
    toast.success("Analyse créée");
  };

  const handleSave = async () => {
    if (!rca) return;
    const { error } = await supabase.from("nc_root_cause_analyses")
      .update({ data, conclusion: conclusion || null })
      .eq("id", rca.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Analyse sauvegardée");
    setDirty(false);
  };

  const handleDelete = async () => {
    if (!rca) return;
    const { error } = await supabase.from("nc_root_cause_analyses").delete().eq("id", rca.id);
    if (error) { toast.error(error.message); return; }
    setRca(null);
    setSelectedMethode("");
    setData({});
    setConclusion("");
    toast.success("Analyse supprimée");
  };

  const updateData = (newData: any) => {
    setData(newData);
    setDirty(true);
  };

  if (loading) return <div className="text-xs text-muted-foreground">Chargement...</div>;

  // No analysis yet — choose method
  if (!rca) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Aucune analyse de cause racine. Choisissez une méthode pour commencer :</p>
        {canEdit && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {METHODES.map(m => (
              <Card key={m.value} className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary/40" onClick={() => handleCreate(m.value)}>
                <CardContent className="p-4">
                  <p className="font-semibold text-sm">{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {!canEdit && <p className="text-xs text-muted-foreground italic">Aucune analyse définie</p>}
      </div>
    );
  }

  const methodeLabel = METHODES.find(m => m.value === selectedMethode)?.label || selectedMethode;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">{methodeLabel}</Badge>
          {dirty && <Badge variant="outline" className="text-xs text-warning">Non sauvegardé</Badge>}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSave} disabled={!dirty}>
              <Save className="h-3 w-3 mr-1" />Sauvegarder
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive hover:text-destructive" onClick={handleDelete}>
              <RotateCcw className="h-3 w-3 mr-1" />Recommencer
            </Button>
          </div>
        )}
      </div>

      {/* Dynamic form based on method */}
      {(selectedMethode === "ishikawa_5m" || selectedMethode === "ishikawa_7m") && (
        <IshikawaForm categories={selectedMethode === "ishikawa_5m" ? ISHIKAWA_5M : ISHIKAWA_7M} data={data} onChange={updateData} canEdit={canEdit} />
      )}
      {selectedMethode === "5_pourquoi" && (
        <CinqPourquoiForm data={data} onChange={updateData} canEdit={canEdit} />
      )}
      {selectedMethode === "qqoqcp" && (
        <QqoqcpForm data={data} onChange={updateData} canEdit={canEdit} />
      )}
      {selectedMethode === "pareto" && (
        <ParetoForm data={data} onChange={updateData} canEdit={canEdit} />
      )}
      {selectedMethode === "amdec" && (
        <AmdecForm data={data} onChange={updateData} canEdit={canEdit} />
      )}

      {/* Conclusion */}
      <div className="space-y-1">
        <Label className="text-sm font-semibold">Conclusion / Cause racine identifiée</Label>
        {canEdit ? (
          <Textarea value={conclusion} onChange={(e) => { setConclusion(e.target.value); setDirty(true); }} rows={3} placeholder="Synthèse de l'analyse..." />
        ) : (
          <p className="text-sm whitespace-pre-wrap bg-muted/30 rounded p-3">{conclusion || "Non renseignée"}</p>
        )}
      </div>
    </div>
  );
}

// === Ishikawa Form ===
function IshikawaForm({ categories, data, onChange, canEdit }: { categories: string[]; data: any; onChange: (d: any) => void; canEdit: boolean }) {
  const cats = data.categories || {};
  const setCause = (cat: string, idx: number, val: string) => {
    const updated = { ...cats, [cat]: [...(cats[cat] || [])].map((c: string, i: number) => i === idx ? val : c) };
    onChange({ ...data, categories: updated });
  };
  const addCause = (cat: string) => {
    const updated = { ...cats, [cat]: [...(cats[cat] || []), ""] };
    onChange({ ...data, categories: updated });
  };
  const removeCause = (cat: string, idx: number) => {
    const updated = { ...cats, [cat]: (cats[cat] || []).filter((_: string, i: number) => i !== idx) };
    onChange({ ...data, categories: updated });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {categories.map(cat => (
        <Card key={cat} className="border">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs font-semibold">{cat}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-1">
            {(cats[cat] || []).map((cause: string, i: number) => (
              <div key={i} className="flex gap-1">
                <Input
                  value={cause}
                  onChange={(e) => setCause(cat, i, e.target.value)}
                  placeholder={`Cause ${i + 1}`}
                  className="h-7 text-xs"
                  disabled={!canEdit}
                />
                {canEdit && (cats[cat] || []).length > 1 && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeCause(cat, i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
            {canEdit && (
              <Button variant="ghost" size="sm" className="h-6 text-xs w-full" onClick={() => addCause(cat)}>
                <Plus className="h-3 w-3 mr-1" />Ajouter
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// === 5 Pourquoi Form ===
function CinqPourquoiForm({ data, onChange, canEdit }: { data: any; onChange: (d: any) => void; canEdit: boolean }) {
  const pourquois: string[] = data.pourquois || ["", ""];
  const setPourquoi = (idx: number, val: string) => {
    onChange({ ...data, pourquois: pourquois.map((p, i) => i === idx ? val : p) });
  };
  const addPourquoi = () => {
    if (pourquois.length >= 7) return;
    onChange({ ...data, pourquois: [...pourquois, ""] });
  };
  const removePourquoi = (idx: number) => {
    if (pourquois.length <= 2) return;
    onChange({ ...data, pourquois: pourquois.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-3">
      {pourquois.map((p, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
            {i + 1}
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-muted-foreground">Pourquoi {i + 1} ?</Label>
            {canEdit ? (
              <Textarea value={p} onChange={(e) => setPourquoi(i, e.target.value)} rows={2} className="text-sm" placeholder={`Réponse au pourquoi ${i + 1}...`} />
            ) : (
              <p className="text-sm bg-muted/30 rounded p-2">{p || "—"}</p>
            )}
          </div>
          {canEdit && pourquois.length > 2 && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive mt-6" onClick={() => removePourquoi(i)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      ))}
      {canEdit && pourquois.length < 7 && (
        <Button variant="outline" size="sm" className="text-xs" onClick={addPourquoi}>
          <Plus className="h-3 w-3 mr-1" />Ajouter un pourquoi
        </Button>
      )}
    </div>
  );
}

// === QQOQCP Form ===
function QqoqcpForm({ data, onChange, canEdit }: { data: any; onChange: (d: any) => void; canEdit: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {QQOQCP_FIELDS.map(f => (
        <div key={f.key} className="space-y-1">
          <Label className="text-xs font-semibold">{f.label}</Label>
          {canEdit ? (
            <Textarea value={data[f.key] || ""} onChange={(e) => onChange({ ...data, [f.key]: e.target.value })} rows={2} className="text-sm" />
          ) : (
            <p className="text-sm bg-muted/30 rounded p-2">{data[f.key] || "—"}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// === Pareto Form ===
function ParetoForm({ data, onChange, canEdit }: { data: any; onChange: (d: any) => void; canEdit: boolean }) {
  const items: { cause: string; frequence: number }[] = data.items || [{ cause: "", frequence: 0 }];
  const sorted = [...items].sort((a, b) => b.frequence - a.frequence);
  const totalFreq = items.reduce((s, it) => s + (it.frequence || 0), 0);

  const setItem = (idx: number, field: string, val: any) => {
    const updated = items.map((it, i) => i === idx ? { ...it, [field]: val } : it);
    onChange({ ...data, items: updated });
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Cause</th>
              <th className="text-left p-2 w-24">Fréquence</th>
              <th className="text-left p-2 w-20">% cumulé</th>
              {canEdit && <th className="w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, i) => {
              const origIdx = items.indexOf(item);
              const cumul = sorted.slice(0, i + 1).reduce((s, it) => s + (it.frequence || 0), 0);
              const pct = totalFreq > 0 ? Math.round((cumul / totalFreq) * 100) : 0;
              return (
                <tr key={origIdx} className="border-b">
                  <td className="p-2">
                    {canEdit ? <Input value={item.cause} onChange={(e) => setItem(origIdx, "cause", e.target.value)} className="h-7 text-xs" /> : item.cause || "—"}
                  </td>
                  <td className="p-2">
                    {canEdit ? <Input type="number" min={0} value={item.frequence} onChange={(e) => setItem(origIdx, "frequence", parseInt(e.target.value) || 0)} className="h-7 text-xs w-20" /> : item.frequence}
                  </td>
                  <td className="p-2">
                    <Badge variant={pct <= 80 ? "default" : "outline"} className="text-xs">{pct}%</Badge>
                  </td>
                  {canEdit && (
                    <td className="p-2">
                      {items.length > 1 && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"
                          onClick={() => onChange({ ...data, items: items.filter((_, idx) => idx !== origIdx) })}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <Button variant="outline" size="sm" className="text-xs" onClick={() => onChange({ ...data, items: [...items, { cause: "", frequence: 0 }] })}>
          <Plus className="h-3 w-3 mr-1" />Ajouter une cause
        </Button>
      )}
    </div>
  );
}

// === AMDEC Form ===
function AmdecForm({ data, onChange, canEdit }: { data: any; onChange: (d: any) => void; canEdit: boolean }) {
  const items: any[] = data.items || [{ mode: "", effet: "", cause: "", gravite: 1, occurrence: 1, detection: 1 }];

  const setItem = (idx: number, field: string, val: any) => {
    const updated = items.map((it, i) => i === idx ? { ...it, [field]: val } : it);
    onChange({ ...data, items: updated });
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Mode défaillance</th>
              <th className="text-left p-2">Effet</th>
              <th className="text-left p-2">Cause</th>
              <th className="text-center p-2 w-14">G</th>
              <th className="text-center p-2 w-14">O</th>
              <th className="text-center p-2 w-14">D</th>
              <th className="text-center p-2 w-16">IPR</th>
              {canEdit && <th className="w-10"></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const ipr = (item.gravite || 1) * (item.occurrence || 1) * (item.detection || 1);
              return (
                <tr key={i} className="border-b">
                  <td className="p-2">
                    {canEdit ? <Input value={item.mode} onChange={(e) => setItem(i, "mode", e.target.value)} className="h-7 text-xs" placeholder="Mode" /> : item.mode || "—"}
                  </td>
                  <td className="p-2">
                    {canEdit ? <Input value={item.effet} onChange={(e) => setItem(i, "effet", e.target.value)} className="h-7 text-xs" placeholder="Effet" /> : item.effet || "—"}
                  </td>
                  <td className="p-2">
                    {canEdit ? <Input value={item.cause} onChange={(e) => setItem(i, "cause", e.target.value)} className="h-7 text-xs" placeholder="Cause" /> : item.cause || "—"}
                  </td>
                  <td className="p-2 text-center">
                    {canEdit ? <Input type="number" min={1} max={10} value={item.gravite} onChange={(e) => setItem(i, "gravite", parseInt(e.target.value) || 1)} className="h-7 text-xs w-14" /> : item.gravite}
                  </td>
                  <td className="p-2 text-center">
                    {canEdit ? <Input type="number" min={1} max={10} value={item.occurrence} onChange={(e) => setItem(i, "occurrence", parseInt(e.target.value) || 1)} className="h-7 text-xs w-14" /> : item.occurrence}
                  </td>
                  <td className="p-2 text-center">
                    {canEdit ? <Input type="number" min={1} max={10} value={item.detection} onChange={(e) => setItem(i, "detection", parseInt(e.target.value) || 1)} className="h-7 text-xs w-14" /> : item.detection}
                  </td>
                  <td className="p-2 text-center">
                    <Badge variant={ipr >= 100 ? "destructive" : ipr >= 50 ? "secondary" : "outline"} className="text-xs">{ipr}</Badge>
                  </td>
                  {canEdit && (
                    <td className="p-2">
                      {items.length > 1 && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive"
                          onClick={() => onChange({ ...data, items: items.filter((_, idx) => idx !== i) })}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <Button variant="outline" size="sm" className="text-xs"
          onClick={() => onChange({ ...data, items: [...items, { mode: "", effet: "", cause: "", gravite: 1, occurrence: 1, detection: 1 }] })}>
          <Plus className="h-3 w-3 mr-1" />Ajouter une ligne
        </Button>
      )}
    </div>
  );
}
