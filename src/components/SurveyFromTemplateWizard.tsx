import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FileStack, ClipboardList, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

type Step = "choose" | "config" | "preview";

export default function SurveyFromTemplateWizard({ open, onOpenChange, onCreated }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("choose");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [config, setConfig] = useState({ client: "", process_id: "", survey_date: new Date().toISOString().split("T")[0], name: "" });

  const { data: templates = [] } = useQuery({
    queryKey: ["survey_templates_active"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("survey_templates").select("*").eq("status", "actif").order("is_default", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: processes = [] } = useQuery({
    queryKey: ["processes_for_wizard"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("processes").select("id, nom, code").order("nom");
      if (error) throw error;
      return data;
    },
  });

  const { data: templateDetail } = useQuery({
    queryKey: ["template_detail", selectedTemplateId],
    enabled: !!selectedTemplateId && open,
    queryFn: async () => {
      const { data: sections, error } = await supabase
        .from("survey_template_sections")
        .select("*, survey_template_questions(*)")
        .eq("template_id", selectedTemplateId!)
        .eq("is_active", true)
        .order("order_index");
      if (error) throw error;
      return sections;
    },
  });

  const selectedTemplate = templates.find((t: any) => t.id === selectedTemplateId);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!selectedTemplate) throw new Error("Sélectionnez un modèle");
      if (!config.name.trim()) throw new Error("Le nom du sondage est requis");

      // Create survey with template reference
      const { data: survey, error } = await supabase.from("client_surveys").insert({
        name: config.name,
        template_id: selectedTemplate.id,
        template_version: selectedTemplate.version,
        template_name: `${selectedTemplate.code} v${selectedTemplate.version}`,
        client: config.client || null,
        process_id: config.process_id || null,
        survey_date: config.survey_date || null,
        created_by: user?.id,
        type_sondage: selectedTemplate.type || "satisfaction_globale",
        objectif: "mesurer_satisfaction",
        mode_sondage: "cible",
        status: "draft",
      }).select().single();
      if (error) throw error;

      // Copy all questions from template into client_survey_questions
      const allQuestions: any[] = [];
      let ordre = 0;
      for (const sec of templateDetail || []) {
        const sortedQs = (sec.survey_template_questions || []).sort((a: any, b: any) => a.order_index - b.order_index);
        for (const q of sortedQs) {
          allQuestions.push({
            survey_id: survey.id,
            question_text: `[${sec.title}] ${q.label}`,
            question_type: "satisfaction",
            ordre: ordre++,
            poids: q.poids || 1,
          });
        }
      }

      if (allQuestions.length > 0) {
        const { error: qErr } = await supabase.from("client_survey_questions").insert(allQuestions);
        if (qErr) throw qErr;
      }

      return survey;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client_surveys"] });
      onOpenChange(false);
      onCreated();
      toast({ title: "Sondage créé à partir du modèle", description: `Basé sur ${selectedTemplate?.code} v${selectedTemplate?.version}` });
      resetWizard();
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const resetWizard = () => {
    setStep("choose");
    setSelectedTemplateId(null);
    setConfig({ client: "", process_id: "", survey_date: new Date().toISOString().split("T")[0], name: "" });
  };

  // When dialog closes, reset
  const handleOpenChange = (v: boolean) => {
    if (!v) resetWizard();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileStack className="h-5 w-5 text-primary" />
            Créer un sondage depuis un modèle
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm">
            <Badge variant={step === "choose" ? "default" : "secondary"}>1. Choisir modèle</Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Badge variant={step === "config" ? "default" : "secondary"}>2. Configurer</Badge>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <Badge variant={step === "preview" ? "default" : "secondary"}>3. Générer</Badge>
          </div>

          <Separator />

          {/* Step 1: Choose template */}
          {step === "choose" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Sélectionnez un modèle de sondage :</p>
              {templates.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Aucun modèle actif disponible.</p>
              ) : (
                <div className="grid gap-3">
                  {templates.map((tpl: any) => (
                    <Card
                      key={tpl.id}
                      className={`p-4 cursor-pointer transition-colors hover:border-primary/50 ${selectedTemplateId === tpl.id ? "border-primary ring-2 ring-primary/20" : ""}`}
                      onClick={() => setSelectedTemplateId(tpl.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{tpl.name}</span>
                            <Badge variant="outline" className="text-[10px]">{tpl.code} v{tpl.version}</Badge>
                            {tpl.is_default && <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[10px]">Par défaut</Badge>}
                          </div>
                          {tpl.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.description}</p>}
                        </div>
                        {selectedTemplateId === tpl.id && <CheckCircle className="h-5 w-5 text-primary" />}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Configure */}
          {step === "config" && selectedTemplate && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Modèle sélectionné : <strong>{selectedTemplate.name}</strong> ({selectedTemplate.code} v{selectedTemplate.version})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label>Nom du sondage *</Label>
                  <Input value={config.name} onChange={e => setConfig(c => ({ ...c, name: e.target.value }))}
                    placeholder={`Enquête ${selectedTemplate.name} — ${new Date().toLocaleDateString("fr-FR")}`} />
                </div>
                <div>
                  <Label>Client</Label>
                  <Input value={config.client} onChange={e => setConfig(c => ({ ...c, client: e.target.value }))} placeholder="Nom du client" />
                </div>
                <div>
                  <Label>Processus</Label>
                  <Select value={config.process_id} onValueChange={v => setConfig(c => ({ ...c, process_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un processus" /></SelectTrigger>
                    <SelectContent>
                      {processes.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.code} — {p.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date du sondage</Label>
                  <Input type="date" value={config.survey_date} onChange={e => setConfig(c => ({ ...c, survey_date: e.target.value }))} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview & generate */}
          {step === "preview" && selectedTemplate && (
            <div className="space-y-4">
              <Card className="p-4 bg-muted/30">
                <h4 className="font-semibold mb-2">Récapitulatif</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Sondage :</span> {config.name}</div>
                  <div><span className="text-muted-foreground">Modèle :</span> {selectedTemplate.code} v{selectedTemplate.version}</div>
                  {config.client && <div><span className="text-muted-foreground">Client :</span> {config.client}</div>}
                  {config.survey_date && <div><span className="text-muted-foreground">Date :</span> {config.survey_date}</div>}
                </div>
              </Card>

              <div>
                <h4 className="font-semibold mb-2">Structure du sondage</h4>
                {(templateDetail || []).map((sec: any, i: number) => (
                  <div key={sec.id} className="mb-3">
                    <h5 className="font-medium text-sm">{String.fromCharCode(65 + i)}. {sec.title}</h5>
                    <ul className="ml-4 mt-1 space-y-1">
                      {(sec.survey_template_questions || [])
                        .sort((a: any, b: any) => a.order_index - b.order_index)
                        .map((q: any) => (
                          <li key={q.id} className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                            {q.label}
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="bg-muted/30 p-3 rounded-lg text-sm">
                <p className="text-muted-foreground">
                  <strong>Note :</strong> Le sondage sera créé comme document autonome. Les modifications futures du modèle n'affecteront pas ce sondage.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 pt-4">
          <div className="flex items-center justify-between w-full">
            <div>
              {step !== "choose" && (
                <Button variant="outline" onClick={() => setStep(step === "preview" ? "config" : "choose")} className="gap-1">
                  <ArrowLeft className="h-4 w-4" />Retour
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>Annuler</Button>
              {step === "choose" && (
                <Button onClick={() => setStep("config")} disabled={!selectedTemplateId}>Suivant</Button>
              )}
              {step === "config" && (
                <Button onClick={() => setStep("preview")} disabled={!config.name.trim()}>Suivant</Button>
              )}
              {step === "preview" && (
                <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
                  {createMut.isPending ? "Génération..." : "Générer le sondage"}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
