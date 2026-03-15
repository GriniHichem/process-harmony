import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer } from "recharts";
import { Award, GraduationCap, AlertTriangle, CheckCircle, TrendingUp, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Props {
  competences: any[];
  formations: any[];
  canEdit: boolean;
}

const NIVEAU_COLORS = { debutant: "#f97316", intermediaire: "#3b82f6", avance: "#22c55e", expert: "#a855f7" };
const NIVEAU_LABELS: Record<string, string> = { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé", expert: "Expert" };
const EFFICACITE_COLORS = { efficace: "#22c55e", non_efficace: "#ef4444", non_evaluee: "#94a3b8" };
const EFFICACITE_LABELS: Record<string, string> = { efficace: "Efficace", non_efficace: "Non efficace", non_evaluee: "Non évaluée" };

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

export function CompetencesDashboard({ competences, formations, canEdit }: Props) {
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [budgetDialog, setBudgetDialog] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ annee: currentYear, budget_prevu: 0 });

  const { data: budgets = [] } = useQuery({
    queryKey: ["budget_formation"],
    queryFn: async () => {
      const { data, error } = await supabase.from("budget_formation").select("*").order("annee", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveBudgetMut = useMutation({
    mutationFn: async (f: typeof budgetForm) => {
      const { error } = await supabase.from("budget_formation").upsert({ annee: f.annee, budget_prevu: f.budget_prevu }, { onConflict: "annee" });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["budget_formation"] }); setBudgetDialog(false); toast({ title: "Budget enregistré" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const currentBudget = budgets.find((b: any) => b.annee === currentYear);
  const formationsCurrentYear = formations.filter((f: any) => f.date_formation?.startsWith(String(currentYear)));
  const totalCout = formationsCurrentYear.reduce((s: number, f: any) => s + (Number(f.cout) || 0), 0);
  const budgetPrevu = currentBudget?.budget_prevu || 0;
  const budgetPct = budgetPrevu > 0 ? Math.round((totalCout / budgetPrevu) * 100) : 0;

  const today = new Date().toISOString().split("T")[0];
  const evaluationsRetard = competences.filter((c: any) => c.prochaine_evaluation && c.prochaine_evaluation < today).length;
  const formationsEfficaces = formationsCurrentYear.filter((f: any) => f.efficacite === "efficace").length;
  const formationsEvaluees = formationsCurrentYear.filter((f: any) => f.efficacite !== "non_evaluee").length;
  const tauxEfficacite = formationsEvaluees > 0 ? Math.round((formationsEfficaces / formationsEvaluees) * 100) : 0;

  // Charts data
  const niveauData = useMemo(() => {
    const counts: Record<string, number> = { debutant: 0, intermediaire: 0, avance: 0, expert: 0 };
    competences.forEach((c: any) => { if (counts[c.niveau] !== undefined) counts[c.niveau]++; });
    return Object.entries(counts).map(([k, v]) => ({ name: NIVEAU_LABELS[k], value: v, color: NIVEAU_COLORS[k as keyof typeof NIVEAU_COLORS] }));
  }, [competences]);

  const efficaciteData = useMemo(() => {
    const counts: Record<string, number> = { efficace: 0, non_efficace: 0, non_evaluee: 0 };
    formationsCurrentYear.forEach((f: any) => { if (counts[f.efficacite] !== undefined) counts[f.efficacite]++; });
    return Object.entries(counts).map(([k, v]) => ({ name: EFFICACITE_LABELS[k], value: v, color: EFFICACITE_COLORS[k as keyof typeof EFFICACITE_COLORS] }));
  }, [formationsCurrentYear]);

  const formationsParMois = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({ name: MONTHS_FR[i], count: 0, cout: 0 }));
    formationsCurrentYear.forEach((f: any) => {
      const m = new Date(f.date_formation).getMonth();
      months[m].count++;
      months[m].cout += Number(f.cout) || 0;
    });
    return months;
  }, [formationsCurrentYear]);

  const budgetCumule = useMemo(() => {
    let cumul = 0;
    return formationsParMois.map((m) => {
      cumul += m.cout;
      return { name: m.name, cumule: cumul, budget: budgetPrevu };
    });
  }, [formationsParMois, budgetPrevu]);

  const chartConfig = {
    count: { label: "Formations", color: "hsl(var(--primary))" },
    cumule: { label: "Consommé", color: "hsl(var(--destructive))" },
    budget: { label: "Budget", color: "hsl(var(--muted-foreground))" },
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><Award className="h-4 w-4" />Compétences</div>
            <p className="text-2xl font-bold">{competences.length}</p>
            <p className="text-xs text-muted-foreground">évaluées</p>
          </CardContent>
        </Card>
        <Card className={evaluationsRetard > 0 ? "border-destructive/50" : ""}>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><AlertTriangle className="h-4 w-4" />En retard</div>
            <p className="text-2xl font-bold text-destructive">{evaluationsRetard}</p>
            <p className="text-xs text-muted-foreground">réévaluations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><GraduationCap className="h-4 w-4" />Formations</div>
            <p className="text-2xl font-bold">{formationsCurrentYear.length}</p>
            <p className="text-xs text-muted-foreground">{currentYear}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1"><CheckCircle className="h-4 w-4" />Efficacité</div>
            <p className="text-2xl font-bold">{tauxEfficacite}%</p>
            <p className="text-xs text-muted-foreground">{formationsEfficaces}/{formationsEvaluees} efficaces</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />Budget
              {canEdit && <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto" onClick={() => { setBudgetForm({ annee: currentYear, budget_prevu: currentBudget?.budget_prevu || 0 }); setBudgetDialog(true); }}><Settings className="h-3 w-3" /></Button>}
            </div>
            <p className="text-2xl font-bold">{totalCout.toLocaleString("fr-FR")} DA</p>
            {budgetPrevu > 0 ? (
              <>
                <Progress value={Math.min(budgetPct, 100)} className="h-1.5 mt-1" />
                <p className="text-xs text-muted-foreground mt-0.5">{budgetPct}% de {budgetPrevu.toLocaleString("fr-FR")} DA</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Aucun budget défini</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Niveaux de compétence</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <PieChart>
                <Pie data={niveauData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}>
                  {niveauData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Efficacité des formations ({currentYear})</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <PieChart>
                <Pie data={efficaciteData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => value > 0 ? `${name}: ${value}` : ""}>
                  {efficaciteData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Formations par mois ({currentYear})</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={formationsParMois}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Consommation budget ({currentYear})</CardTitle></CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <LineChart data={budgetCumule}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="cumule" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                {budgetPrevu > 0 && <Line type="monotone" dataKey="budget" stroke="hsl(var(--muted-foreground))" strokeWidth={1} strokeDasharray="5 5" dot={false} />}
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Budget Dialog */}
      <Dialog open={budgetDialog} onOpenChange={setBudgetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Budget formation annuel</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Année</Label><Input type="number" value={budgetForm.annee} onChange={e => setBudgetForm(f => ({ ...f, annee: parseInt(e.target.value) || currentYear }))} /></div>
            <div><Label>Budget prévu (DA)</Label><Input type="number" value={budgetForm.budget_prevu} onChange={e => setBudgetForm(f => ({ ...f, budget_prevu: parseFloat(e.target.value) || 0 }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBudgetDialog(false)}>Annuler</Button>
            <Button onClick={() => saveBudgetMut.mutate(budgetForm)} disabled={saveBudgetMut.isPending}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
