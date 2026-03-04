import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, FileText, Download, Archive } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type Doc = { id: string; titre: string; type_document: string; version: number; archive: boolean; nom_fichier: string | null; process_id: string | null; created_at: string };

const typeLabels: Record<string, string> = {
  procedure: "Procédure", instruction: "Instruction", formulaire: "Formulaire",
  enregistrement: "Enregistrement", rapport: "Rapport", compte_rendu_audit: "CR Audit", preuve: "Preuve",
};

export default function Documents() {
  const { role } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processes, setProcesses] = useState<{id: string; nom: string}[]>([]);
  const [newDoc, setNewDoc] = useState({ titre: "", type_document: "procedure", process_id: "" });
  const [file, setFile] = useState<File | null>(null);

  const canCreate = role === "rmq" || role === "responsable_processus";

  const fetchDocs = async () => {
    const { data } = await supabase.from("documents").select("*").eq("archive", false).order("created_at", { ascending: false });
    setDocs((data ?? []) as Doc[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchDocs();
    supabase.from("processes").select("id, nom").order("nom").then(({ data }) => setProcesses(data ?? []));
  }, []);

  const handleUpload = async () => {
    if (!newDoc.titre) { toast.error("Titre requis"); return; }
    let chemin = null;
    let nom_fichier = null;
    let taille_fichier = null;

    if (file) {
      const path = `${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("documents").upload(path, file);
      if (uploadErr) { toast.error("Erreur upload: " + uploadErr.message); return; }
      chemin = path;
      nom_fichier = file.name;
      taille_fichier = file.size;
    }

    const { error } = await supabase.from("documents").insert({
      titre: newDoc.titre,
      type_document: newDoc.type_document as any,
      process_id: newDoc.process_id || null,
      chemin_fichier: chemin,
      nom_fichier,
      taille_fichier,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Document ajouté");
    setDialogOpen(false);
    setNewDoc({ titre: "", type_document: "procedure", process_id: "" });
    setFile(null);
    fetchDocs();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestion documentaire</h1>
          <p className="text-muted-foreground">Documents associés aux processus</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Ajouter</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ajouter un document</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Titre</Label><Input value={newDoc.titre} onChange={(e) => setNewDoc({ ...newDoc, titre: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newDoc.type_document} onValueChange={(v) => setNewDoc({ ...newDoc, type_document: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Processus associé</Label>
                  <Select value={newDoc.process_id} onValueChange={(v) => setNewDoc({ ...newDoc, process_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Optionnel" /></SelectTrigger>
                    <SelectContent>
                      {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Fichier</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
                <Button onClick={handleUpload} className="w-full">Ajouter</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : docs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun document</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {docs.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{d.titre}</p>
                    <p className="text-xs text-muted-foreground">{typeLabels[d.type_document] ?? d.type_document} • v{d.version}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {d.nom_fichier && <Badge variant="secondary">{d.nom_fichier}</Badge>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
