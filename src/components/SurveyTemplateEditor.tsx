import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Maximize2, Minimize2, GripVertical
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Section {
  id: string;
  title: string;
  code: string;
  description: string;
  order_index: number;
  is_active: boolean;
  questions: Question[];
}

interface Question {
  id: string;
  label: string;
  question_type: string;
  order_index: number;
  has_absolute_evaluation: boolean;
  has_competitor_evaluation: boolean;
  has_observation_absolute: boolean;
  has_observation_relative: boolean;
  is_required: boolean;
  poids: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: any;
  viewOnly?: boolean;
}

const templateTypes = [
  { value: "satisfaction_client", label: "Satisfaction client" },
  { value: "fournisseur", label: "Fournisseur" },
  { value: "service", label: "Service" },
  { value: "audit_interne", label: "Audit interne" },
  { value: "autre", label: "Autre" },
];

export default function SurveyTemplateEditor({ open, onOpenChange, template, viewOnly }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [maximized, setMaximized] = useState(false);
  const [form, setForm] = useState({
    name: "", code: "", version: 1, description: "", type: "satisfaction_client",
    status: "brouillon", notes_internes: "",
  });
  const [sections, setSections] = useState<Section[]>([]);

  // Load sections/questions when editing
  const { data: loadedSections } = useQuery({
    queryKey: ["template_sections", template?.id],
    enabled: !!template?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("survey_template_sections")
        .select("*, survey_template_questions(*)")
        .eq("template_id", template.id)
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (open && template) {
      setForm({
        name: template.name || "",
        code: template.code || "",
        version: template.version || 1,
        description: template.description || "",
        type: template.type || "satisfaction_client",
        status: template.status || "brouillon",
        notes_internes: template.notes_internes || "",
      });
    } else if (open) {
      setForm({ name: "", code: "", version: 1, description: "", type: "satisfaction_client", status: "brouillon", notes_internes: "" });
      setSections([]);
    }
  }, [open, template]);

  useEffect(() => {
    if (loadedSections) {
      setSections(loadedSections.map((s: any) => ({
        id: s.id,
        title: s.title,
        code: s.code,
        description: s.description || "",
        order_index: s.order_index,
        is_active: s.is_active,
        questions: (s.survey_template_questions || [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((q: any) => ({
            id: q.id,
            label: q.label,
            question_type: q.question_type,
            order_index: q.order_index,
            has_absolute_evaluation: q.has_absolute_evaluation,
            has_competitor_evaluation: q.has_competitor_evaluation,
            has_observation_absolute: q.has_observation_absolute,
            has_observation_relative: q.has_observation_relative,
            is_required: q.is_required,
            poids: q.poids,
          })),
      })));
    }
  }, [loadedSections]);

  const addSection = () => {
    setSections(prev => [...prev, {
      id: crypto.randomUUID(),
      title: "",
      code: `SEC-${String.fromCharCode(65 + prev.length)}`,
      description: "",
      order_index: prev.length,
      is_active: true,
      questions: [],
    }]);
  };

  const removeSection = (idx: number) => {
    setSections(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order_index: i })));
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= sections.length) return;
    setSections(prev => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr.map((s, i) => ({ ...s, order_index: i }));
    });
  };

  const updateSection = (idx: number, field: string, value: any) => {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const addQuestion = (secIdx: number) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== secIdx) return s;
      return {
        ...s,
        questions: [...s.questions, {
          id: crypto.randomUUID(),
          label: "",
          question_type: "absolute_relative",
          order_index: s.questions.length,
          has_absolute_evaluation: true,
          has_competitor_evaluation: true,
          has_observation_absolute: true,
          has_observation_relative: true,
          is_required: true,
          poids: 1,
        }],
      };
    }));
  };

  const removeQuestion = (secIdx: number, qIdx: number) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== secIdx) return s;
      return { ...s, questions: s.questions.filter((_, j) => j !== qIdx).map((q, j) => ({ ...q, order_index: j })) };
    }));
  };

  const updateQuestion = (secIdx: number, qIdx: number, field: string, value: any) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== secIdx) return s;
      return { ...s, questions: s.questions.map((q, j) => j === qIdx ? { ...q, [field]: value } : q) };
    }));
  };

  const moveQuestion = (secIdx: number, qIdx: number, dir: -1 | 1) => {
    const newIdx = qIdx + dir;
    setSections(prev => prev.map((s, i) => {
      if (i !== secIdx || newIdx < 0 || newIdx >= s.questions.length) return s;
      const arr = [...s.questions];
      [arr[qIdx], arr[newIdx]] = [arr[newIdx], arr[qIdx]];
      return { ...s, questions: arr.map((q, j) => ({ ...q, order_index: j })) };
    }));
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Le nom est requis");
      if (!form.code.trim()) throw new Error("Le code est requis");

      let tplId = template?.id;

      if (tplId) {
        const { error } = await supabase.from("survey_templates").update({
          name: form.name, code: form.code, version: form.version,
          description: form.description, type: form.type, status: form.status,
          notes_internes: form.notes_internes, updated_by: user?.id,
        }).eq("id", tplId);
        if (error) throw error;

        // Delete existing sections (cascade deletes questions)
        await supabase.from("survey_template_sections").delete().eq("template_id", tplId);
      } else {
        const { data, error } = await supabase.from("survey_templates").insert({
          name: form.name, code: form.code, version: form.version,
          description: form.description, type: form.type, status: form.status,
          notes_internes: form.notes_internes, created_by: user?.id,
        }).select().single();
        if (error) throw error;
        tplId = data.id;
      }

      // Insert sections and questions
      for (const sec of sections) {
        const { data: newSec, error: secErr } = await supabase.from("survey_template_sections").insert({
          template_id: tplId,
          title: sec.title,
          code: sec.code,
          description: sec.description,
          order_index: sec.order_index,
          is_active: sec.is_active,
        }).select().single();
        if (secErr) throw secErr;

        if (sec.questions.length > 0) {
          const qs = sec.questions.map(q => ({
            section_id: newSec.id,
            label: q.label,
            question_type: q.question_type,
            order_index: q.order_index,
            has_absolute_evaluation: q.has_absolute_evaluation,
            has_competitor_evaluation: q.has_competitor_evaluation,
            has_observation_absolute: q.has_observation_absolute,
            has_observation_relative: q.has_observation_relative,
            is_required: q.is_required,
            poids: q.poids,
          }));
          const { error: qErr } = await supabase.from("survey_template_questions").insert(qs);
          if (qErr) throw qErr;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["survey_templates"] });
      qc.invalidateQueries({ queryKey: ["template_sections"] });
      onOpenChange(false);
      toast({ title: "Modèle enregistré" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const dialogClass = maximized
    ? "!max-w-[95vw] !w-[95vw] !max-h-[95vh] !h-[95vh]"
    : "max-w-4xl max-h-[85vh]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${dialogClass} flex flex-col overflow-hidden transition-all duration-200`}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {viewOnly ? "Aperçu du modèle" : template ? "Modifier le modèle" : "Nouveau modèle de sondage"}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setMaximized(!maximized)}>
              {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* General info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label>Nom du modèle *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} disabled={viewOnly} />
            </div>
            <div>
              <Label>Code *</Label>
              <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} disabled={viewOnly} placeholder="TPL-SAT-001" />
            </div>
            <div>
              <Label>Version</Label>
              <Input type="number" value={form.version} onChange={e => setForm(f => ({ ...f, version: parseInt(e.target.value) || 1 }))} disabled={viewOnly} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))} disabled={viewOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {templateTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))} disabled={viewOnly}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="brouillon">Brouillon</SelectItem>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="inactif">Inactif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} disabled={viewOnly} />
            </div>
            <div className="sm:col-span-3">
              <Label>Notes internes</Label>
              <Textarea value={form.notes_internes} onChange={e => setForm(f => ({ ...f, notes_internes: e.target.value }))} rows={2} disabled={viewOnly} />
            </div>
          </div>

          <Separator />

          {/* Sections */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-base">Sections et questions</h3>
              {!viewOnly && (
                <Button variant="outline" size="sm" onClick={addSection} className="gap-1.5">
                  <Plus className="h-4 w-4" />Ajouter section
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {sections.map((sec, secIdx) => (
                <Card key={sec.id} className="p-4">
                  <div className="flex items-start gap-3">
                    {!viewOnly && (
                      <div className="flex flex-col gap-1 pt-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSection(secIdx, -1)} disabled={secIdx === 0}>
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSection(secIdx, 1)} disabled={secIdx === sections.length - 1}>
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Titre de la section</Label>
                          <Input value={sec.title} onChange={e => updateSection(secIdx, "title", e.target.value)} disabled={viewOnly} />
                        </div>
                        <div>
                          <Label className="text-xs">Code</Label>
                          <Input value={sec.code} onChange={e => updateSection(secIdx, "code", e.target.value)} disabled={viewOnly} />
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex items-center gap-2">
                            <Switch checked={sec.is_active} onCheckedChange={v => updateSection(secIdx, "is_active", v)} disabled={viewOnly} />
                            <Label className="text-xs">{sec.is_active ? "Active" : "Désactivée"}</Label>
                          </div>
                          {!viewOnly && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeSection(secIdx)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Questions */}
                      <div className="space-y-2 ml-2">
                        {sec.questions.map((q, qIdx) => (
                          <div key={q.id} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30">
                            {!viewOnly && (
                              <div className="flex flex-col">
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveQuestion(secIdx, qIdx, -1)} disabled={qIdx === 0}>
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveQuestion(secIdx, qIdx, 1)} disabled={qIdx === sec.questions.length - 1}>
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-6 gap-2 items-center">
                              <Input className="sm:col-span-3 text-sm" value={q.label} placeholder="Libellé de la question"
                                onChange={e => updateQuestion(secIdx, qIdx, "label", e.target.value)} disabled={viewOnly} />
                              <div className="flex items-center gap-2 sm:col-span-2">
                                <div className="flex items-center gap-1">
                                  <Switch checked={q.has_absolute_evaluation} onCheckedChange={v => updateQuestion(secIdx, qIdx, "has_absolute_evaluation", v)} disabled={viewOnly} />
                                  <span className="text-[10px]">Abs</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Switch checked={q.has_competitor_evaluation} onCheckedChange={v => updateQuestion(secIdx, qIdx, "has_competitor_evaluation", v)} disabled={viewOnly} />
                                  <span className="text-[10px]">Conc</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Label className="text-[10px]">Poids</Label>
                                <Input type="number" className="w-16 text-xs" value={q.poids}
                                  onChange={e => updateQuestion(secIdx, qIdx, "poids", parseFloat(e.target.value) || 1)} disabled={viewOnly} />
                              </div>
                            </div>
                            {!viewOnly && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeQuestion(secIdx, qIdx)}>
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {!viewOnly && (
                          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => addQuestion(secIdx)}>
                            <Plus className="h-3 w-3" />Ajouter question
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {sections.length === 0 && (
                <p className="text-center text-muted-foreground py-6 text-sm">
                  Aucune section. {!viewOnly && "Cliquez sur « Ajouter section » pour commencer."}
                </p>
              )}
            </div>
          </div>

          {/* Preview info */}
          {viewOnly && sections.length > 0 && (
            <>
              <Separator />
              <div className="bg-muted/30 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Seuils de notation</h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Satisfaisant : ≥ 80</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span>Moyen : 50 – 80</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span>Insuffisant : &lt; 50</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {!viewOnly && (
          <DialogFooter className="flex-shrink-0 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
