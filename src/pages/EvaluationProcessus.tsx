import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Archive, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const CRITERIA = [
  { key: "score_objectifs", label: "Atteinte des objectifs stratégiques" },
  { key: "score_ca", label: "Contribution au chiffre d'affaires" },
  { key: "score_satisfaction", label: "Impact sur la satisfaction client" },
  { key: "score_perennite", label: "Importance pour la pérennité de l'organisme" },
  { key: "score_risques", label: "Maîtrise des risques et opportunités" },
] as const;

const IMPACT_OPTIONS = [
  { value: "4", label: "++  Impact très fort" },
  { value: "3", label: "+   Impact positif" },
  { value: "2", label: "-   Impact faible" },
  { value: "1", label: "--  Impact très faible" },
];

type CriteriaKey = typeof CRITERIA[number]["key"];

export default function EvaluationProcessus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [scores, setScores] = useState<Record<CriteriaKey, number>>({
    score_objectifs: 2,
    score_ca: 2,
    score_satisfaction: 2,
    score_perennite: 2,
    score_risques: 2,
  });

  // Dialog for process creation with custom code
  const [processDialogOpen, setProcessDialogOpen] = useState(false);
  const [processCode, setProcessCode] = useState("");
  const [processType, setProcessType] = useState<"pilotage" | "realisation" | "support">("support");

  const scoreTotal = useMemo(() => Object.values(scores).reduce((a, b) => a + b, 0), [scores]);
  const resultat = scoreTotal >= 16 ? "processus" : scoreTotal >= 12 ? "zone_orange" : "activite";

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ["process_evaluations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("process_evaluations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setNom("");
    setDescription("");
    setProcessCode("");
    setProcessType("support");
    setScores({ score_objectifs: 2, score_ca: 2, score_satisfaction: 2, score_perennite: 2, score_risques: 2 });
  };

  const saveMutation = useMutation({
    mutationFn: async (statut: "en_attente" | "activite" | "processus_cree") => {
      if (!nom.trim()) throw new Error("Le nom est requis");

      // If converting to process, first create the process
      let processId: string | null = null;
      if (statut === "processus_cree") {
        if (!processCode.trim()) throw new Error("Le code du processus est requis");
        const { data: proc, error: procErr } = await supabase
          .from("processes")
          .insert({ nom: nom.trim(), code: processCode.trim(), description: description.trim(), type_processus: processType })
          .select("id")
          .single();
        if (procErr) throw procErr;
        processId = proc.id;
      }

      const { error } = await supabase.from("process_evaluations").insert({
        nom: nom.trim(),
        description: description.trim(),
        ...scores,
        score_total: scoreTotal,
        resultat,
        statut,
        process_id: processId,
      });
      if (error) throw error;
    },
    onSuccess: (_, statut) => {
      queryClient.invalidateQueries({ queryKey: ["process_evaluations"] });
      resetForm();
      toast({
        title: statut === "processus_cree" ? "Processus créé" : "Évaluation enregistrée",
        description: statut === "processus_cree"
          ? `"${nom}" a été ajouté à la liste des processus.`
          : `"${nom}" a été enregistré comme activité.`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("process_evaluations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["process_evaluations"] });
      toast({ title: "Évaluation supprimée" });
    },
  });

  const candidats = useMemo(
    () => evaluations.filter((ev: any) => ev.resultat === "processus" || ev.resultat === "zone_orange"),
    [evaluations]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Évaluation des processus potentiels</h1>

      <Tabs defaultValue="evaluer" className="w-full">
        <TabsList>
          <TabsTrigger value="evaluer">Nouvelle évaluation</TabsTrigger>
          <TabsTrigger value="vue-globale">
            Vue globale des candidats
            {candidats.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">{candidats.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="historique">Historique</TabsTrigger>
        </TabsList>

        {/* Tab: Nouvelle évaluation */}
        <TabsContent value="evaluer">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nouvelle évaluation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom du processus potentiel *</Label>
                  <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Gestion des réclamations" />
                </div>
                <div className="space-y-2">
                  <Label>Description courte</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description de l'activité..." rows={2} />
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Critère</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CRITERIA.map((c) => (
                    <TableRow key={c.key}>
                      <TableCell className="font-medium">{c.label}</TableCell>
                      <TableCell>
                        <Select value={String(scores[c.key])} onValueChange={(v) => setScores((p) => ({ ...p, [c.key]: Number(v) }))}>
                          <SelectTrigger className="w-[220px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {IMPACT_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center font-bold">{scores[c.key]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className={`flex items-center justify-between rounded-lg border p-4 ${
                resultat === "processus" ? "bg-primary/10 border-primary/30" :
                resultat === "zone_orange" ? "bg-orange-100 border-orange-300 dark:bg-orange-950/30 dark:border-orange-700" :
                "bg-muted/30"
              }`}>
                <div>
                  <span className="text-sm text-muted-foreground">Score total :</span>
                  <span className="ml-2 text-2xl font-bold text-foreground">{scoreTotal}</span>
                  <span className="text-sm text-muted-foreground"> / 20 (min 5)</span>
                </div>
                <div className="text-right">
                  <Badge
                    variant={resultat === "processus" ? "default" : "secondary"}
                    className={`text-base px-4 py-1 ${resultat === "zone_orange" ? "bg-orange-500 text-white hover:bg-orange-600" : ""}`}
                  >
                    {resultat === "processus" ? "➡ Processus" : resultat === "zone_orange" ? "⚠ Zone de décision" : "➡ Activité"}
                  </Badge>
                  {resultat === "zone_orange" && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 max-w-[280px]">
                      Score entre 12 et 15 : peut être un processus ou une activité selon la décision de la direction.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => saveMutation.mutate("activite")}
                  disabled={saveMutation.isPending || !nom.trim()}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Ignorer / garder comme activité
                </Button>
                <Button
                  onClick={() => saveMutation.mutate("processus_cree")}
                  disabled={saveMutation.isPending || !nom.trim()}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter à la liste des processus
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Vue globale des candidats */}
        <TabsContent value="vue-globale">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Processus potentiels — Aide à la décision</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Chargement...</p>
              ) : candidats.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">Aucun candidat processus ou zone de décision.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead className="text-center">Objectifs</TableHead>
                      <TableHead className="text-center">CA</TableHead>
                      <TableHead className="text-center">Satisfaction</TableHead>
                      <TableHead className="text-center">Pérennité</TableHead>
                      <TableHead className="text-center">Risques</TableHead>
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead>Résultat</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {candidats.map((ev: any) => (
                      <TableRow key={ev.id} className={ev.resultat === "zone_orange" ? "bg-orange-50 dark:bg-orange-950/20" : ""}>
                        <TableCell className="font-medium">{ev.nom}</TableCell>
                        <TableCell className="text-center">{ev.score_objectifs}</TableCell>
                        <TableCell className="text-center">{ev.score_ca}</TableCell>
                        <TableCell className="text-center">{ev.score_satisfaction}</TableCell>
                        <TableCell className="text-center">{ev.score_perennite}</TableCell>
                        <TableCell className="text-center">{ev.score_risques}</TableCell>
                        <TableCell className="text-center font-bold">{ev.score_total}</TableCell>
                        <TableCell>
                          <Badge
                            variant={ev.resultat === "processus" ? "default" : "secondary"}
                            className={ev.resultat === "zone_orange" ? "bg-orange-500 text-white" : ""}
                          >
                            {ev.resultat === "processus" ? "Processus" : "Zone de décision"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ev.statut === "processus_cree" ? "default" : ev.statut === "activite" ? "outline" : "secondary"}>
                            {ev.statut === "processus_cree" ? "Créé ✓" : ev.statut === "activite" ? "Activité" : "En attente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(ev.created_at), "dd/MM/yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          {ev.statut === "en_attente" && (
                            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(ev.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historique */}
        <TabsContent value="historique">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Évaluations précédentes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-sm">Chargement...</p>
              ) : evaluations.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-6">Aucune évaluation enregistrée.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead>Résultat</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.map((ev: any) => (
                      <TableRow key={ev.id}>
                        <TableCell className="font-medium">{ev.nom}</TableCell>
                        <TableCell className="text-center font-bold">{ev.score_total} / 20</TableCell>
                        <TableCell>
                          <Badge
                            variant={ev.resultat === "processus" ? "default" : "secondary"}
                            className={ev.resultat === "zone_orange" ? "bg-orange-500 text-white" : ""}
                          >
                            {ev.resultat === "processus" ? "Processus" : ev.resultat === "zone_orange" ? "Zone de décision" : "Activité"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={ev.statut === "processus_cree" ? "default" : ev.statut === "activite" ? "outline" : "secondary"}>
                            {ev.statut === "processus_cree" ? "Processus créé" : ev.statut === "activite" ? "Activité" : "En attente"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(ev.created_at), "dd/MM/yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(ev.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
