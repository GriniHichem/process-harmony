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
import { Plus, FileText, Trash2, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";


type Doc = {
  id: string;
  titre: string;
  type_document: string;
  version: number;
  archive: boolean;
  nom_fichier: string | null;
  created_at: string;
  process_ids: string[];
};

const typeLabels: Record<string, string> = {
  procedure: "Procédure", instruction: "Instruction", formulaire: "Formulaire",
  enregistrement: "Enregistrement", rapport: "Rapport", compte_rendu_audit: "CR Audit", preuve: "Preuve",
};

export default function Documents() {
  const { role } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [processes, setProcesses] = useState<{ id: string; nom: string }[]>([]);
  const [newDoc, setNewDoc] = useState({ titre: "", type_document: "procedure", selectedProcessIds: [] as string[] });
  const [file, setFile] = useState<File | null>(null);
  const [filterProcessId, setFilterProcessId] = useState<string>("all");

  const canCreate = hasRole("admin") || hasRole("rmq") || hasRole("responsable_processus");
  const canDelete = hasRole("admin") || hasRole("rmq");


  const fetchDocs = async () => {
    // Fetch documents
    const { data: docsData } = await supabase
      .from("documents")
      .select("*")
      .eq("archive", false)
      .order("created_at", { ascending: false });

    // Fetch all document-process associations
    const { data: dpData } = await supabase.from("document_processes").select("document_id, process_id");

    const dpMap = new Map<string, string[]>();
    (dpData ?? []).forEach((dp: any) => {
      const list = dpMap.get(dp.document_id) || [];
      list.push(dp.process_id);
      dpMap.set(dp.document_id, list);
    });

    const enriched: Doc[] = (docsData ?? []).map((d: any) => ({
      id: d.id,
      titre: d.titre,
      type_document: d.type_document,
      version: d.version,
      archive: d.archive,
      nom_fichier: d.nom_fichier,
      created_at: d.created_at,
      process_ids: dpMap.get(d.id) || [],
    }));

    setDocs(enriched);
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

    const { data: insertedDoc, error } = await supabase.from("documents").insert({
      titre: newDoc.titre,
      type_document: newDoc.type_document as any,
      process_id: newDoc.selectedProcessIds[0] || null, // keep legacy column for compatibility
      chemin_fichier: chemin,
      nom_fichier,
      taille_fichier,
    }).select("id").single();

    if (error || !insertedDoc) { toast.error(error?.message || "Erreur"); return; }

    // Insert junction table rows
    if (newDoc.selectedProcessIds.length > 0) {
      const rows = newDoc.selectedProcessIds.map(pid => ({
        document_id: insertedDoc.id,
        process_id: pid,
      }));
      const { error: dpError } = await supabase.from("document_processes").insert(rows);
      if (dpError) { toast.error("Erreur association processus: " + dpError.message); }
    }

    toast.success("Document ajouté");
    setDialogOpen(false);
    setNewDoc({ titre: "", type_document: "procedure", selectedProcessIds: [] });
    setFile(null);
    fetchDocs();
  };

  const handleDeleteClick = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) return;
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Document supprimé");
    fetchDocs();
  };

  const addProcessToSelection = (pid: string) => {
    if (pid && !newDoc.selectedProcessIds.includes(pid)) {
      setNewDoc({ ...newDoc, selectedProcessIds: [...newDoc.selectedProcessIds, pid] });
    }
  };

  const removeProcessFromSelection = (pid: string) => {
    setNewDoc({ ...newDoc, selectedProcessIds: newDoc.selectedProcessIds.filter(p => p !== pid) });
  };

  const getProcessName = (pid: string) => processes.find(p => p.id === pid)?.nom || pid;

  const filteredDocs = docs.filter(d => {
    if (filterProcessId === "all") return true;
    return d.process_ids.includes(filterProcessId);
  });

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
                <div className="space-y-2">
                  <Label>Titre</Label>
                  <Input value={newDoc.titre} onChange={(e) => setNewDoc({ ...newDoc, titre: e.target.value })} />
                </div>
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
                  <Label>Processus associés</Label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {newDoc.selectedProcessIds.map(pid => (
                      <Badge key={pid} variant="secondary" className="gap-1">
                        {getProcessName(pid)}
                        <button type="button" onClick={() => removeProcessFromSelection(pid)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Select
                    value="__placeholder__"
                    onValueChange={(v) => { if (v !== "__placeholder__") addProcessToSelection(v); }}
                  >
                    <SelectTrigger><SelectValue placeholder="Sélectionner un processus..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__placeholder__" disabled>Sélectionner un processus...</SelectItem>
                      {processes.filter(p => !newDoc.selectedProcessIds.includes(p.id)).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Fichier</Label>
                  <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>
                <Button onClick={handleUpload} className="w-full">Ajouter</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Label className="text-sm whitespace-nowrap">Filtrer par processus</Label>
        <Select value={filterProcessId} onValueChange={setFilterProcessId}>
          <SelectTrigger className="w-[250px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les processus</SelectItem>
            {processes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : filteredDocs.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Aucun document</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {filteredDocs.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">{d.titre}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeLabels[d.type_document] ?? d.type_document} • v{d.version}
                    </p>
                    {d.process_ids.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {d.process_ids.map(pid => (
                          <Badge key={pid} variant="outline" className="text-xs">
                            {getProcessName(pid)}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {d.nom_fichier && <Badge variant="secondary">{d.nom_fichier}</Badge>}
                  {canDelete && (
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteClick(d.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
