import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, GraduationCap, BarChart3 } from "lucide-react";
import { HelpTooltip } from "@/components/HelpTooltip";
import { CompetencesDashboard } from "@/components/competences/CompetencesDashboard";
import { CompetencesTab } from "@/components/competences/CompetencesTab";
import { FormationsTab } from "@/components/competences/FormationsTab";

export default function Competences() {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission("competences", "can_edit");

  const { data: acteurs = [] } = useQuery({
    queryKey: ["acteurs_list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("acteurs").select("id, fonction, organisation, type_acteur").eq("actif", true).order("fonction");
      if (error) throw error;
      return data;
    },
  });

  const { data: competences = [] } = useQuery({
    queryKey: ["competences"],
    queryFn: async () => {
      const { data, error } = await supabase.from("competences").select("*, acteurs(fonction, organisation), profiles(nom, prenom)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: formations = [] } = useQuery({
    queryKey: ["formations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("formations").select("*, acteurs(fonction, organisation), profiles(nom, prenom)").order("date_formation", { ascending: false }) as any;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          Compétences & Formations <HelpTooltip term="competences" />
        </h1>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1" />Tableau de bord</TabsTrigger>
          <TabsTrigger value="competences"><Award className="h-4 w-4 mr-1" />Compétences</TabsTrigger>
          <TabsTrigger value="formations"><GraduationCap className="h-4 w-4 mr-1" />Formations</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <CompetencesDashboard competences={competences} formations={formations} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="competences">
          <CompetencesTab competences={competences} acteurs={acteurs} canEdit={canEdit} />
        </TabsContent>

        <TabsContent value="formations">
          <FormationsTab formations={formations} acteurs={acteurs} canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
