import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function Bpmn() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Visualisation BPMN</h1>
        <p className="text-muted-foreground">Diagrammes de flux des processus</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" /> Module BPMN</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">La visualisation BPMN simplifiée sera disponible ici. Sélectionnez un processus depuis la liste des processus pour voir son diagramme associé.</p>
        </CardContent>
      </Card>
    </div>
  );
}
