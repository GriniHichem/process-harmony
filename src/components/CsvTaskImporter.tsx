import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileUp, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  entrees: string[];
  sorties: string[];
  responsable: string;
}

interface PreviewData {
  rows: ParsedRow[];
  newEntrees: string[];
  newSorties: string[];
  matchedActeurs: { label: string; id: string }[];
  unmatchedActeurs: string[];
}

const FLUX_MAP: Record<string, string> = {
  "séquentiel": "sequentiel",
  "sequentiel": "sequentiel",
  "conditionnel": "conditionnel",
  "parallèle": "parallele",
  "parallele": "parallele",
  "inclusif": "inclusif",
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
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function splitSubValues(value: string, delimiter: string): string[] {
  // Inside a field, sub-values are always comma-separated
  // But if the main delimiter is comma, they're already split by the parser in quotes
  // We split by comma for both cases since field values use comma separation
  return value.split(",").map(s => s.trim()).filter(Boolean);
}

export function CsvTaskImporter({ processId, processElements, onComplete }: CsvTaskImporterProps) {
  const [open, setOpen] = useState(false);
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
      if (lines.length < 2) {
        toast.error("Le fichier CSV doit contenir au moins un en-tête et une ligne de données.");
        return;
      }

      const delimiter = detectDelimiter(lines[0]);
      const rows: ParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const fields = parseCsvLine(lines[i], delimiter);
        if (fields.length < 2) continue;
        const code = fields[0] || String(i);
        const description = fields[1] || "";
        const typeRaw = (fields[2] || "séquentiel").toLowerCase().trim();
        const type_flux = FLUX_MAP[typeRaw] || "sequentiel";
        const entrees = fields[3] ? splitSubValues(fields[3], delimiter) : [];
        const sorties = fields[4] ? splitSubValues(fields[4], delimiter) : [];
        const responsable = fields[5] || "";
        rows.push({ code, description, type_flux, entrees, sorties, responsable });
      }

      // Check existing elements
      const existingEntrees = processElements.filter(e => e.type === "donnee_entree").map(e => e.description.toLowerCase());
      const existingSorties = processElements.filter(e => e.type === "donnee_sortie").map(e => e.description.toLowerCase());

      const allEntreeDescs = new Set<string>();
      const allSortieDescs = new Set<string>();
      rows.forEach(r => {
        r.entrees.forEach(e => allEntreeDescs.add(e));
        r.sorties.forEach(s => allSortieDescs.add(s));
      });

      const newEntrees = [...allEntreeDescs].filter(d => !existingEntrees.includes(d.toLowerCase()));
      const newSorties = [...allSortieDescs].filter(d => !existingSorties.includes(d.toLowerCase()));

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
        if (found) {
          matchedActeurs.push({ label: resp, id: found.id });
        } else {
          unmatchedActeurs.push(resp);
        }
      }

      setPreview({ rows, newEntrees, newSorties, matchedActeurs, unmatchedActeurs });
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
      // 1. Create missing process elements (entrees + sorties)
      const existingEntreeMap = new Map(
        processElements.filter(e => e.type === "donnee_entree").map(e => [e.description.toLowerCase(), e.code])
      );
      const existingSortieMap = new Map(
        processElements.filter(e => e.type === "donnee_sortie").map(e => [e.description.toLowerCase(), e.code])
      );

      let deCounter = processElements.filter(e => e.type === "donnee_entree").length;
      let dsCounter = processElements.filter(e => e.type === "donnee_sortie").length;
      let elementOrdre = processElements.length;

      const newElements: { code: string; description: string; type: string; process_id: string; ordre: number }[] = [];

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

      // 2. Build acteur map
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
      const tasks = preview.rows.map((row, idx) => {
        const entreeCodes = row.entrees.map(e => existingEntreeMap.get(e.toLowerCase()) || "").filter(Boolean).join(", ");
        const sortieCodes = row.sorties.map(s => existingSortieMap.get(s.toLowerCase()) || "").filter(Boolean).join(", ");

        return {
          process_id: processId,
          code: row.code,
          description: row.description,
          type_flux: row.type_flux,
          ordre: idx + 1,
          entrees: entreeCodes || null,
          sorties: sortieCodes || null,
          responsable_id: acteurMap.get(row.responsable) || null,
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

  return (
    <>
      <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileChange} />
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="gap-1.5">
        <FileUp className="h-3.5 w-3.5" /> Importer CSV
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Prévisualisation de l'import CSV</DialogTitle>
            <DialogDescription>
              Vérifiez les données avant de confirmer l'import. Les activités existantes seront écrasées.
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-3">
                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border/50 p-3 bg-muted/30">
                    <p className="text-sm font-medium mb-1">Activités</p>
                    <p className="text-2xl font-bold text-primary">{preview.rows.length}</p>
                  </div>
                  <div className="rounded-lg border border-border/50 p-3 bg-muted/30">
                    <p className="text-sm font-medium mb-1">Types de flux</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {[...new Set(preview.rows.map(r => r.type_flux))].map(t => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
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
                    <div className="mb-2">
                      <div className="flex flex-wrap gap-1">
                        {preview.matchedActeurs.map(a => (
                          <Badge key={a.label} className="text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3 mr-1" />{a.label}
                          </Badge>
                        ))}
                      </div>
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
                      <p className="text-xs text-muted-foreground mt-1">Ces responsables n'ont pas été trouvés dans le référentiel des acteurs.</p>
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
                        <th className="px-2 py-1.5 text-center font-medium">E</th>
                        <th className="px-2 py-1.5 text-center font-medium">S</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 15).map((r, i) => (
                        <tr key={i} className="border-t border-border/30">
                          <td className="px-2 py-1 font-mono">{r.code}</td>
                          <td className="px-2 py-1 max-w-[250px] truncate">{r.description}</td>
                          <td className="px-2 py-1">
                            <Badge variant="secondary" className="text-[10px]">{r.type_flux}</Badge>
                          </td>
                          <td className="px-2 py-1 text-center">{r.entrees.length}</td>
                          <td className="px-2 py-1 text-center">{r.sorties.length}</td>
                        </tr>
                      ))}
                      {preview.rows.length > 15 && (
                        <tr className="border-t border-border/30">
                          <td colSpan={5} className="px-2 py-1 text-center text-muted-foreground">
                            … et {preview.rows.length - 15} autres activités
                          </td>
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
