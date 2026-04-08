import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileUp, AlertTriangle, CheckCircle2, XCircle, Loader2, HelpCircle, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProcessElement {
  id: string; code: string; description: string; type: string; ordre: number; process_id: string;
}

interface CsvTaskImporterProps {
  processId: string;
  processElements: ProcessElement[];
  onComplete: () => void;
}

interface ParsedRow {
  code: string;
  description: string;
  type_flux: string;
  parent_code: string;
  condition: string;
  entrees: string[];
  sorties: string[];
  responsable: string;
  activite_suivante: string;
}

interface PreviewData {
  rows: ParsedRow[];
  existingTaskCount: number;
  overwriteCodes: string[];
  newEntrees: string[];
  newSorties: string[];
  matchedActeurs: { label: string; id: string }[];
  unmatchedActeurs: string[];
  flowErrors: string[];
}

const FLUX_MAP: Record<string, string> = {
  "séquentiel": "sequentiel", "sequentiel": "sequentiel",
  "conditionnel": "conditionnel", "xor": "conditionnel",
  "parallèle": "parallele", "parallele": "parallele", "and": "parallele",
  "inclusif": "inclusif", "or": "inclusif",
};

const FLUX_LABELS: Record<string, string> = {
  sequentiel: "→ Séquentiel",
  conditionnel: "◇ XOR",
  parallele: "═ AND",
  inclusif: "≈ OR",
};

function detectDelimiter(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; } else { inQuotes = false; }
      } else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === delimiter) { fields.push(current.trim()); current = ""; }
      else { current += ch; }
    }
  }
  fields.push(current.trim());
  return fields;
}

function splitSubValues(value: string): string[] {
  return value.split(",").map(s => s.trim()).filter(Boolean);
}

function generateExampleCsv(delimiter: string): string {
  const d = delimiter;
  const q = delimiter === "," ? '"' : '';
  const lines = [
    `Code${d}Description${d}Type de flux${d}Parent${d}Condition${d}Entrées${d}Sorties${d}Responsable${d}Activité suivante`,
    `1${d}Réceptionner la demande${d}Séquentiel${d}${d}${d}${q}Demande utilisateur${q}${d}${q}Demande qualifiée${q}${d}Help Desk${d}`,
    `2${d}Orienter la demande${d}Conditionnel${d}${d}${d}Demande qualifiée${d}${d}Responsable SI${d}`,
    `3${d}Traiter cas standard${d}Séquentiel${d}2${d}SI standard${d}${d}Résultat standard${d}Help Desk${d}`,
    `4${d}Traiter cas urgent${d}Séquentiel${d}2${d}SI urgent${d}${d}Résultat urgent${d}Admin Systèmes${d}`,
    `5${d}Préparer les accès${d}Parallèle${d}${d}${d}${d}${d}${d}`,
    `6${d}Créer compte Windows${d}Séquentiel${d}5${d}${d}${d}Compte Windows créé${d}Help Desk${d}`,
    `7${d}Créer compte ERP${d}Séquentiel${d}5${d}${d}${d}Compte ERP créé${d}Admin ERP${d}`,
    `8${d}Vérifier résultat${d}Inclusif${d}${d}${d}${d}${d}${d}`,
    `9${d}Test fonctionnel${d}Séquentiel${d}8${d}SI disponible${d}${d}Test OK${d}Help Desk${d}`,
    `10${d}Test sécurité${d}Séquentiel${d}8${d}SI critique${d}${d}Audit OK${d}Admin Systèmes${d}__end__`,
  ];
  return lines.join("\n");
}

export function CsvTaskImporter({ processId, processElements, onComplete }: CsvTaskImporterProps) {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { toast.error("Le fichier CSV doit contenir au moins un en-tête et une ligne."); return; }

      const delimiter = detectDelimiter(lines[0]);
      const headerFields = parseCsvLine(lines[0], delimiter).map(h => h.toLowerCase().trim());

      // Detect column indices dynamically
      const colMap = {
        code: headerFields.findIndex(h => h === "code"),
        description: headerFields.findIndex(h => h.includes("description")),
        type_flux: headerFields.findIndex(h => h.includes("type") && h.includes("flux")),
        parent: headerFields.findIndex(h => h === "parent" || h === "parent_code"),
        condition: headerFields.findIndex(h => h === "condition"),
        entrees: headerFields.findIndex(h => h.includes("entr")),
        sorties: headerFields.findIndex(h => h.includes("sort")),
        responsable: headerFields.findIndex(h => h.includes("responsable")),
        activite_suivante: headerFields.findIndex(h => h.includes("suivante") || h === "next_activity_code" || h.includes("activité suivante")),
      };

      const rows: ParsedRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const fields = parseCsvLine(lines[i], delimiter);
        if (fields.length < 2) continue;
        const get = (idx: number) => idx >= 0 && idx < fields.length ? fields[idx] : "";
        const code = get(colMap.code) || String(i);
        const description = get(colMap.description) || "";
        if (!description.trim()) continue;
        const typeRaw = (get(colMap.type_flux) || "séquentiel").toLowerCase().trim();
        const type_flux = FLUX_MAP[typeRaw] || "sequentiel";
        const parent_code = get(colMap.parent);
        const condition = get(colMap.condition);
        const entrees = get(colMap.entrees) ? splitSubValues(get(colMap.entrees)) : [];
        const sorties = get(colMap.sorties) ? splitSubValues(get(colMap.sorties)) : [];
        const responsable = get(colMap.responsable);
        const activite_suivante = get(colMap.activite_suivante);
        rows.push({ code, description, type_flux, parent_code, condition, entrees, sorties, responsable, activite_suivante });
      }

      // Validate flow structure
      const flowErrors: string[] = [];
      const codeSet = new Set(rows.map(r => r.code));
      const branchParents = new Map<string, number>();

      for (const row of rows) {
        if (row.parent_code && !codeSet.has(row.parent_code)) {
          flowErrors.push(`Activité ${row.code} : parent "${row.parent_code}" introuvable`);
        }
        if (row.parent_code) {
          branchParents.set(row.parent_code, (branchParents.get(row.parent_code) || 0) + 1);
        }
      }

      for (const row of rows) {
        if ((row.type_flux === "conditionnel" || row.type_flux === "parallele" || row.type_flux === "inclusif")) {
          const childCount = branchParents.get(row.code) || 0;
          if (childCount < 2) {
            flowErrors.push(`Activité ${row.code} (${FLUX_LABELS[row.type_flux]}) : ${childCount} branche(s) trouvée(s), minimum 2 requises`);
          }
        }
      }

      // Check elements
      const existingEntrees = processElements.filter(e => e.type === "donnee_entree").map(e => e.description.toLowerCase());
      const existingSorties = processElements.filter(e => e.type === "donnee_sortie").map(e => e.description.toLowerCase());
      const allEntreeDescs = new Set<string>();
      const allSortieDescs = new Set<string>();
      rows.forEach(r => { r.entrees.forEach(e => allEntreeDescs.add(e)); r.sorties.forEach(s => allSortieDescs.add(s)); });
      const newEntrees = [...allEntreeDescs].filter(d => !existingEntrees.includes(d.toLowerCase()));
      const newSorties = [...allSortieDescs].filter(d => !existingSorties.includes(d.toLowerCase()));

      // Check existing tasks
      const { data: existingTasks } = await supabase.from("process_tasks").select("code").eq("process_id", processId);
      const existingTaskCodes = new Set((existingTasks || []).map(t => t.code));
      const overwriteCodes = rows.map(r => r.code).filter(c => existingTaskCodes.has(c));

      // Resolve acteurs
      const uniqueResponsables = [...new Set(rows.map(r => r.responsable).filter(Boolean))];
      const { data: acteurs } = await supabase.from("acteurs").select("id, fonction, organisation").eq("actif", true);
      const matchedActeurs: { label: string; id: string }[] = [];
      const unmatchedActeurs: string[] = [];
      for (const resp of uniqueResponsables) {
        const parts = resp.split("/").map(p => p.trim().toLowerCase());
        const found = acteurs?.find(a => {
          const fn = (a.fonction || "").toLowerCase();
          const org = (a.organisation || "").toLowerCase();
          return parts.some(p => fn.includes(p) || org.includes(p));
        });
        if (found) matchedActeurs.push({ label: resp, id: found.id });
        else unmatchedActeurs.push(resp);
      }

      setPreview({ rows, existingTaskCount: existingTaskCodes.size, overwriteCodes, newEntrees, newSorties, matchedActeurs, unmatchedActeurs, flowErrors });
      setOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la lecture du fichier CSV.");
    }
  }, [processElements]);

  const handleImport = useCallback(async () => {
    if (!preview) return;
    setImporting(true);

    try {
      // 0. Delete existing entries/exits and tasks (full cleanup)
      const { error: delElementsError } = await supabase
        .from("process_elements")
        .delete()
        .eq("process_id", processId)
        .in("type", ["donnee_entree", "donnee_sortie"]);
      if (delElementsError) throw delElementsError;

      // 1. Create fresh elements from CSV
      let deCounter = 0;
      let dsCounter = 0;
      let elementOrdre = processElements.filter(e => e.type !== "donnee_entree" && e.type !== "donnee_sortie").length;
      const existingEntreeMap = new Map<string, string>();
      const existingSortieMap = new Map<string, string>();
      const newElements: { code: string; description: string; type: "donnee_entree" | "donnee_sortie"; process_id: string; ordre: number }[] = [];

      for (const desc of preview.newEntrees) {
        deCounter++;
        const code = `DE-${String(deCounter).padStart(3, "0")}`;
        existingEntreeMap.set(desc.toLowerCase(), code);
        newElements.push({ code, description: desc, type: "donnee_entree", process_id: processId, ordre: ++elementOrdre });
      }
      for (const desc of preview.newSorties) {
        dsCounter++;
        const code = `DS-${String(dsCounter).padStart(3, "0")}`;
        existingSortieMap.set(desc.toLowerCase(), code);
        newElements.push({ code, description: desc, type: "donnee_sortie", process_id: processId, ordre: ++elementOrdre });
      }

      if (newElements.length > 0) {
        const { error: elError } = await supabase.from("process_elements").insert(newElements);
        if (elError) throw elError;
      }

      // 2. Acteur map
      const acteurMap = new Map<string, string>();
      const { data: acteurs } = await supabase.from("acteurs").select("id, fonction, organisation").eq("actif", true);
      for (const row of preview.rows) {
        if (!row.responsable || acteurMap.has(row.responsable)) continue;
        const parts = row.responsable.split("/").map(p => p.trim().toLowerCase());
        const found = acteurs?.find(a => {
          const fn = (a.fonction || "").toLowerCase();
          const org = (a.organisation || "").toLowerCase();
          return parts.some(p => fn.includes(p) || org.includes(p));
        });
        if (found) acteurMap.set(row.responsable, found.id);
      }

      // 3. Delete existing tasks
      const { error: delError } = await supabase.from("process_tasks").delete().eq("process_id", processId);
      if (delError) throw delError;

      // 4. Insert new tasks
      type FluxType = "sequentiel" | "conditionnel" | "parallele" | "inclusif";
      const tasks = preview.rows.map((row, idx) => {
        const entreeCodes = row.entrees.map(e => existingEntreeMap.get(e.toLowerCase()) || "").filter(Boolean).join(", ");
        const sortieCodes = row.sorties.map(s => existingSortieMap.get(s.toLowerCase()) || "").filter(Boolean).join(", ");
        return {
          process_id: processId,
          code: row.code,
          description: row.description,
          type_flux: row.type_flux as FluxType,
          parent_code: row.parent_code || null,
          condition: row.condition || null,
          ordre: idx + 1,
          entrees: entreeCodes || null,
          sorties: sortieCodes || null,
          responsable_id: acteurMap.get(row.responsable) || null,
          next_activity_code: row.activite_suivante || null,
        };
      });

      const { error: insertError } = await supabase.from("process_tasks").insert(tasks);
      if (insertError) throw insertError;

      toast.success(`${tasks.length} activités importées avec succès !`);
      setOpen(false);
      setPreview(null);
      onComplete();
    } catch (err: any) {
      console.error(err);
      toast.error("Erreur lors de l'import : " + (err.message || "Erreur inconnue"));
    } finally {
      setImporting(false);
    }
  }, [preview, processId, processElements, onComplete]);

  const downloadExample = useCallback(() => {
    const csv = generateExampleCsv(";");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "modele_import_activites.csv"; a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <>
      <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
          <FileUp className="h-3.5 w-3.5" /> Importer CSV
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setHelpOpen(true)} title="Guide d'import CSV">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>

      {/* ============ HELP DIALOG ============ */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Guide d'import CSV des activités</DialogTitle>
            <DialogDescription>Comment structurer votre fichier CSV pour importer les flux correctement</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-5 text-sm">
              {/* Columns */}
              <div>
                <h3 className="font-semibold text-base mb-2">Colonnes du fichier CSV</h3>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">Colonne</th>
                        <th className="px-3 py-2 text-left font-semibold">Obligatoire</th>
                        <th className="px-3 py-2 text-left font-semibold">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      <tr><td className="px-3 py-1.5 font-mono font-semibold text-primary">Code</td><td className="px-3 py-1.5">✅</td><td className="px-3 py-1.5">Identifiant unique de l'activité (1, 2, 3…)</td></tr>
                      <tr><td className="px-3 py-1.5 font-mono font-semibold text-primary">Description</td><td className="px-3 py-1.5">✅</td><td className="px-3 py-1.5">Description de l'activité</td></tr>
                      <tr><td className="px-3 py-1.5 font-mono font-semibold text-primary">Type de flux</td><td className="px-3 py-1.5">✅</td><td className="px-3 py-1.5">Séquentiel, Conditionnel (XOR), Parallèle (AND), Inclusif (OR)</td></tr>
                      <tr className="bg-primary/5"><td className="px-3 py-1.5 font-mono font-semibold text-primary">Parent</td><td className="px-3 py-1.5">🔑</td><td className="px-3 py-1.5"><strong>Code du parent</strong> — Indique que cette activité est une branche du parent</td></tr>
                      <tr className="bg-primary/5"><td className="px-3 py-1.5 font-mono font-semibold text-primary">Condition</td><td className="px-3 py-1.5">🔑</td><td className="px-3 py-1.5">Condition de la branche (ex: "SI conforme", "SI urgent")</td></tr>
                      <tr><td className="px-3 py-1.5 font-mono font-semibold text-primary">Entrées</td><td className="px-3 py-1.5">—</td><td className="px-3 py-1.5">Données d'entrée, séparées par virgule entre guillemets</td></tr>
                      <tr><td className="px-3 py-1.5 font-mono font-semibold text-primary">Sorties</td><td className="px-3 py-1.5">—</td><td className="px-3 py-1.5">Données de sortie, séparées par virgule entre guillemets</td></tr>
                      <tr><td className="px-3 py-1.5 font-mono font-semibold text-primary">Responsable</td><td className="px-3 py-1.5">—</td><td className="px-3 py-1.5">Fonction de l'acteur responsable</td></tr>
                      <tr className="bg-blue-50/50 dark:bg-blue-950/30"><td className="px-3 py-1.5 font-mono font-semibold text-primary">Activité suivante</td><td className="px-3 py-1.5">—</td><td className="px-3 py-1.5">Code d'une activité existante = flèche de saut/boucle. Code inexistant = <strong>fin de branche</strong> (aucune flèche, nœud Fin). Vide = ordre normal.</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Flow explanation */}
              <div>
                <h3 className="font-semibold text-base mb-2">Comment définir les flux</h3>
                <div className="space-y-3">
                  <div className="rounded-lg border border-border/50 p-3 bg-muted/20">
                    <p className="font-semibold flex items-center gap-2 mb-1"><Badge variant="secondary">→ Séquentiel</Badge> Flux linéaire</p>
                    <p className="text-xs text-muted-foreground">Pas besoin de Parent ni Condition. Les activités s'enchaînent dans l'ordre.</p>
                  </div>

                  <div className="rounded-lg border border-amber-500/30 p-3 bg-amber-500/5">
                    <p className="font-semibold flex items-center gap-2 mb-1"><Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">◇ Conditionnel (XOR)</Badge> Une seule branche exécutée</p>
                    <p className="text-xs text-muted-foreground mb-2">L'activité parente déclare le type <strong>Conditionnel</strong>. Chaque branche fille a <strong>Parent = code du parent</strong> et une <strong>Condition</strong> différente.</p>
                    <div className="bg-background/80 rounded p-2 font-mono text-[11px] leading-relaxed">
                      <div>2 ; Orienter la demande ; <span className="text-amber-600 font-bold">Conditionnel</span> ; ; ; …</div>
                      <div>3 ; Traiter cas standard ; Séquentiel ; <span className="text-primary font-bold">2</span> ; <span className="text-emerald-600 font-bold">SI standard</span> ; …</div>
                      <div>4 ; Traiter cas urgent ; Séquentiel ; <span className="text-primary font-bold">2</span> ; <span className="text-emerald-600 font-bold">SI urgent</span> ; …</div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-blue-500/30 p-3 bg-blue-500/5">
                    <p className="font-semibold flex items-center gap-2 mb-1"><Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30">═ Parallèle (AND)</Badge> Toutes les branches exécutées</p>
                    <p className="text-xs text-muted-foreground mb-2">L'activité parente déclare le type <strong>Parallèle</strong>. Les branches n'ont <strong>pas de Condition</strong> (toutes sont exécutées).</p>
                    <div className="bg-background/80 rounded p-2 font-mono text-[11px] leading-relaxed">
                      <div>5 ; Préparer les accès ; <span className="text-blue-600 font-bold">Parallèle</span> ; ; ; …</div>
                      <div>6 ; Créer compte Windows ; Séquentiel ; <span className="text-primary font-bold">5</span> ; ; …</div>
                      <div>7 ; Créer compte ERP ; Séquentiel ; <span className="text-primary font-bold">5</span> ; ; …</div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-purple-500/30 p-3 bg-purple-500/5">
                    <p className="font-semibold flex items-center gap-2 mb-1"><Badge className="bg-purple-500/20 text-purple-700 border-purple-500/30">≈ Inclusif (OR)</Badge> Une ou plusieurs branches exécutées</p>
                    <p className="text-xs text-muted-foreground mb-2">Comme le conditionnel, mais plusieurs branches peuvent être exécutées simultanément.</p>
                    <div className="bg-background/80 rounded p-2 font-mono text-[11px] leading-relaxed">
                      <div>8 ; Vérifier résultat ; <span className="text-purple-600 font-bold">Inclusif</span> ; ; ; …</div>
                      <div>9 ; Test fonctionnel ; Séquentiel ; <span className="text-primary font-bold">8</span> ; <span className="text-emerald-600 font-bold">SI disponible</span> ; …</div>
                      <div>10 ; Test sécurité ; Séquentiel ; <span className="text-primary font-bold">8</span> ; <span className="text-emerald-600 font-bold">SI critique</span> ; …</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div>
                <h3 className="font-semibold text-base mb-2">Astuces</h3>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
                  <li>Le délimiteur (<code>;</code> ou <code>,</code>) est détecté automatiquement</li>
                  <li>Pour plusieurs entrées/sorties : utilisez des guillemets — <code>"Entrée 1, Entrée 2"</code></li>
                  <li>Les entrées/sorties inexistantes sont créées automatiquement</li>
                  <li>Le responsable est résolu par correspondance partielle avec les acteurs existants</li>
                  <li>Un flux XOR/AND/OR <strong>doit avoir au moins 2 branches</strong> (enfants avec le même Parent)</li>
                  <li>Laissez la Condition vide pour une branche XOR par défaut (SINON)</li>
                  <li>Les branches AND n'ont pas besoin de Condition</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-2">Navigation dans le logigramme</h3>
                <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-4">
                  <li><strong>Séquentiel :</strong> utilisez ◀ / ▶ pour naviguer d'activité en activité. Si une activité est supprimée, elle est automatiquement sautée</li>
                  <li><strong>Conditionnel (XOR) :</strong> un popover de choix s'affiche pour sélectionner la branche à suivre</li>
                  <li><strong>Parallèle (AND) / Inclusif (OR) :</strong> les branches sont parcourues séquentiellement avec un indicateur «Branche X/N»</li>
                  <li><strong>Saut libre :</strong> cliquez sur le sélecteur d'activité (icône liste) pour sauter directement à n'importe quelle activité</li>
                </ul>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={downloadExample} className="gap-1.5 mr-auto">
              <Download className="h-3.5 w-3.5" /> Télécharger le modèle CSV
            </Button>
            <Button onClick={() => setHelpOpen(false)}>Compris</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ PREVIEW DIALOG ============ */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Prévisualisation de l'import CSV</DialogTitle>
            <DialogDescription>Vérifiez les données avant de confirmer. Les activités existantes seront écrasées.</DialogDescription>
          </DialogHeader>

          {preview && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-3">
                {/* Flow errors */}
                {preview.flowErrors.length > 0 && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <p className="text-sm font-medium text-destructive">Problèmes de flux détectés</p>
                    </div>
                    <ul className="space-y-1 text-xs text-destructive/80 list-disc pl-4">
                      {preview.flowErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      L'import reste possible, mais le logigramme pourrait ne pas être correct.
                    </p>
                  </div>
                )}

                {/* Overwrite warning */}
                {preview.existingTaskCount > 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                        ⚠ Écrasement de {preview.existingTaskCount} activité(s) existante(s)
                      </p>
                    </div>
                    {preview.overwriteCodes.length > 0 && (
                      <div className="mt-1.5">
                        <p className="text-xs text-muted-foreground mb-1">Codes qui seront remplacés :</p>
                        <div className="flex flex-wrap gap-1">
                          {preview.overwriteCodes.slice(0, 20).map(c => (
                            <Badge key={c} variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-700 dark:text-amber-400">{c}</Badge>
                          ))}
                          {preview.overwriteCodes.length > 20 && (
                            <Badge variant="secondary" className="text-[10px]">+{preview.overwriteCodes.length - 20} autres</Badge>
                          )}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Toutes les activités existantes seront supprimées et remplacées par les {preview.rows.length} activités du fichier CSV.
                    </p>
                  </div>
                )}

                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border/50 p-3 bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Activités</p>
                    <p className="text-2xl font-bold text-primary">{preview.rows.length}</p>
                  </div>
                  <div className="rounded-lg border border-border/50 p-3 bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Avec branchement</p>
                    <p className="text-2xl font-bold text-primary">{preview.rows.filter(r => r.parent_code).length}</p>
                  </div>
                  <div className="rounded-lg border border-border/50 p-3 bg-muted/30">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Types de flux</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {[...new Set(preview.rows.map(r => r.type_flux))].map(t => (
                        <Badge key={t} variant="secondary" className="text-[10px]">{FLUX_LABELS[t] || t}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* New elements */}
                {(preview.newEntrees.length > 0 || preview.newSorties.length > 0) && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <p className="text-sm font-medium">Éléments à créer automatiquement</p>
                    </div>
                    {preview.newEntrees.length > 0 && (
                      <div className="mb-2">
                        <p className="text-xs text-muted-foreground mb-1">Données d'entrée ({preview.newEntrees.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {preview.newEntrees.slice(0, 10).map(e => (
                            <Badge key={e} variant="outline" className="text-xs">{e.length > 40 ? e.slice(0, 40) + "…" : e}</Badge>
                          ))}
                          {preview.newEntrees.length > 10 && <Badge variant="outline" className="text-xs">+{preview.newEntrees.length - 10}</Badge>}
                        </div>
                      </div>
                    )}
                    {preview.newSorties.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Données de sortie ({preview.newSorties.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {preview.newSorties.slice(0, 10).map(s => (
                            <Badge key={s} variant="outline" className="text-xs">{s.length > 40 ? s.slice(0, 40) + "…" : s}</Badge>
                          ))}
                          {preview.newSorties.length > 10 && <Badge variant="outline" className="text-xs">+{preview.newSorties.length - 10}</Badge>}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Acteurs */}
                <div className="rounded-lg border border-border/50 p-3 bg-muted/30">
                  <p className="text-sm font-medium mb-2">Résolution des responsables</p>
                  {preview.matchedActeurs.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {preview.matchedActeurs.map(a => (
                        <Badge key={a.label} className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />{a.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {preview.unmatchedActeurs.length > 0 && (
                    <div>
                      <div className="flex flex-wrap gap-1">
                        {preview.unmatchedActeurs.map(a => (
                          <Badge key={a} variant="outline" className="text-xs text-amber-600 border-amber-500/30">
                            <XCircle className="h-3 w-3 mr-1" />{a}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Non trouvés dans le référentiel des acteurs.</p>
                    </div>
                  )}
                </div>

                {/* Task preview table */}
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium">Code</th>
                        <th className="px-2 py-1.5 text-left font-medium">Description</th>
                        <th className="px-2 py-1.5 text-left font-medium">Flux</th>
                        <th className="px-2 py-1.5 text-left font-medium">Parent</th>
                        <th className="px-2 py-1.5 text-left font-medium">Condition</th>
                        <th className="px-2 py-1.5 text-left font-medium">Suivante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 30).map((r, i) => (
                        <tr key={i} className={`border-t border-border/30 ${r.parent_code ? "bg-muted/20" : ""}`}>
                          <td className="px-2 py-1 font-mono">{r.code}</td>
                          <td className="px-2 py-1 max-w-[200px] truncate">{r.parent_code ? "↳ " : ""}{r.description}</td>
                          <td className="px-2 py-1">
                            <Badge variant="secondary" className="text-[10px]">{FLUX_LABELS[r.type_flux] || r.type_flux}</Badge>
                          </td>
                          <td className="px-2 py-1 font-mono text-primary">{r.parent_code || "—"}</td>
                          <td className="px-2 py-1 text-muted-foreground">{r.condition || "—"}</td>
                          <td className="px-2 py-1 font-mono">
                            {r.activite_suivante === "__end__" ? (
                              <Badge variant="destructive" className="text-[9px]">🔚 Fin</Badge>
                            ) : r.activite_suivante ? (
                              <Badge variant="outline" className="text-[9px]">→ {r.activite_suivante}</Badge>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                      {preview.rows.length > 30 && (
                        <tr className="border-t border-border/30">
                          <td colSpan={6} className="px-2 py-1 text-center text-muted-foreground">… et {preview.rows.length - 30} autres</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>Annuler</Button>
            <Button onClick={handleImport} disabled={importing} className="gap-1.5">
              {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {importing ? "Import en cours…" : `Importer ${preview?.rows.length || 0} activités`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
