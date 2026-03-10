import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Save, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ProcessElementList } from "@/components/ProcessElementList";
import { ProcessTasksTable } from "@/components/ProcessTasksTable";

type ElementType = "finalite" | "donnee_entree" | "donnee_sortie" | "activite" | "interaction" | "partie_prenante" | "ressource";

interface ProcessElement {
  id: string;
  code: string;
  description: string;
  type: ElementType;
  ordre: number;
}

const ELEMENT_SECTIONS: { type: ElementType; title: string; prefix: string }[] = [
  { type: "finalite", title: "Finalité", prefix: "F" },
  { type: "donnee_entree", title: "Données d'entrée", prefix: "DE" },
  { type: "donnee_sortie", title: "Données de sortie", prefix: "DS" },
  { type: "activite", title: "Activités principales", prefix: "AP" },
  { type: "interaction", title: "Interactions", prefix: "I" },
  { type: "partie_prenante", title: "Parties prenantes", prefix: "PP" },
  { type: "ressource", title: "Ressources", prefix: "R" },
];

const generateNextCode = (prefix: string, existingElements: ProcessElement[]): string => {
  const maxNum = existingElements.reduce((max, el) => {
    const match = el.code.match(new RegExp(`^${prefix}-(\\d+)$`));
    return match ? Math.max(max, parseInt(match[1], 10)) : max;
  }, 0);
  return `${prefix}-${String(maxNum + 1).padStart(3, "0")}`;
};

export default function ProcessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { role, user } = useAuth();
  const [process, setProcess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [elements, setElements] = useState<ProcessElement[]>([]);
  const [users, setUsers] = useState<{ id: string; nom: string; prenom: string; email: string }[]>([]);
  const [processDocuments, setProcessDocuments] = useState<any[]>([]);

  const fetchElements = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from("process_elements")
      .select("*")
      .eq("process_id", id)
      .order("ordre", { ascending: true });
    if (data) setElements(data as ProcessElement[]);
  }, [id]);

  const fetchDocuments = useCallback(async () => {
    if (!id) return;
    const { data: dpData } = await supabase
      .from("document_processes")
      .select("document_id")
      .eq("process_id", id);
    if (!dpData || dpData.length === 0) { setProcessDocuments([]); return; }
    const docIds = dpData.map((dp: any) => dp.document_id);
    const { data: docsData } = await supabase
      .from("documents")
      .select("id, titre, type_document, version, nom_fichier")
      .in("id", docIds)
      .eq("archive", false);
    setProcessDocuments(docsData ?? []);
  }, [id]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("processes").select("*").eq("id", id).single();
      setProcess(data);
      setLoading(false);
    };
    const fetchUsers = async () => {
      const { data } = await supabase.from("profiles").select("id, nom, prenom, email").eq("actif", true);
      if (data) setUsers(data);
    };
    if (id) {
      fetch();
      fetchElements();
      fetchDocuments();
      fetchUsers();
    }
  }, [id, fetchElements, fetchDocuments]);

  const canEdit = role === "rmq" || role === "consultant" || (role === "responsable_processus" && process?.responsable_id === user?.id);
  const canDelete = role === "rmq" || role === "responsable_processus";

  const handleSave = async () => {
    if (!process) return;
    setSaving(true);
    const { error } = await supabase.from("processes").update({
      nom: process.nom,
      description: process.description,
      type_processus: process.type_processus,
      statut: process.statut,
      responsable_id: process.responsable_id || null,
    }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Processus mis à jour");
    setSaving(false);
  };

  const updateField = (field: string, value: string) => setProcess({ ...process, [field]: value });

  const handleAddElement = async (type: ElementType, prefix: string, description: string) => {
    const typeElements = elements.filter(e => e.type === type);
    const maxOrdre = typeElements.reduce((max, e) => Math.max(max, e.ordre), 0);
    const code = generateNextCode(prefix, typeElements);
    const { error } = await supabase.from("process_elements").insert({
      process_id: id,
      type,
      code,
      description,
      ordre: maxOrdre + 1,
    });
    if (error) { toast.error(error.message); throw error; }
    toast.success("Élément ajouté");
    await fetchElements();
  };

  const handleUpdateElement = async (elId: string, code: string, description: string) => {
    const { error } = await supabase.from("process_elements").update({ code, description }).eq("id", elId);
    if (error) { toast.error(error.message); return; }
    toast.success("Élément modifié");
    fetchElements();
  };

  const handleRemoveElement = async (elId: string) => {
    const { error } = await supabase.from("process_elements").delete().eq("id", elId);
    if (error) { toast.error(error.message); return; }
    toast.success("Élément supprimé");
    fetchElements();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  if (!process) return <div className="text-center py-12 text-muted-foreground">Processus non trouvé</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/processus")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-primary font-medium">{process.code}</span>
            <Badge>{process.statut.replace("_", " ")}</Badge>
            <span className="text-xs text-muted-foreground">v{process.version_courante}</span>
          </div>
          <h1 className="text-2xl font-bold mt-1">{process.nom}</h1>
        </div>
        {canEdit && (
          <Button onClick={handleSave} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "..." : "Enregistrer"}</Button>
        )}
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">Informations générales</TabsTrigger>
          <TabsTrigger value="elements">Éléments</TabsTrigger>
          <TabsTrigger value="tasks">Activités</TabsTrigger>
          </TabsList>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Intitulé</Label><Input value={process.nom} onChange={(e) => updateField("nom", e.target.value)} disabled={!canEdit} /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={process.type_processus} onValueChange={(v) => updateField("type_processus", v)} disabled={!canEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pilotage">Pilotage</SelectItem>
                    <SelectItem value="realisation">Réalisation</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={process.statut} onValueChange={(v) => updateField("statut", v)} disabled={role !== "rmq"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brouillon">Brouillon</SelectItem>
                    <SelectItem value="en_validation">En validation</SelectItem>
                    <SelectItem value="valide">Validé</SelectItem>
                    <SelectItem value="archive">Archivé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Responsable</Label>
                <Select value={process.responsable_id ?? "none"} onValueChange={(v) => updateField("responsable_id", v === "none" ? null : v)} disabled={role !== "rmq"}>
                  <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non assigné</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{`${u.prenom} ${u.nom}`.trim() || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={process.description ?? ""} onChange={(e) => updateField("description", e.target.value)} disabled={!canEdit} rows={3} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="elements">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ELEMENT_SECTIONS.map(({ type, title, prefix }) => (
              <Card key={type}>
                <CardContent className="pt-6">
                  <ProcessElementList
                    title={title}
                    elements={elements.filter(e => e.type === type)}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    onAdd={(desc) => handleAddElement(type, prefix, desc)}
                    onUpdate={handleUpdateElement}
                    onRemove={handleRemoveElement}
                  />
                  {type === "ressource" && processDocuments.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" /> Documents associés
                      </h4>
                      {processDocuments.map((doc: any) => {
                        const typeLabels: Record<string, string> = {
                          procedure: "Procédure", instruction: "Instruction", formulaire: "Formulaire",
                          enregistrement: "Enregistrement", rapport: "Rapport", compte_rendu_audit: "CR Audit", preuve: "Preuve",
                        };
                        return (
                          <div key={doc.id} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" />
                              <span>{doc.titre}</span>
                              <span className="text-xs text-muted-foreground">({typeLabels[doc.type_document] ?? doc.type_document} • v{doc.version})</span>
                            </div>
                            {doc.nom_fichier && <Badge variant="secondary" className="text-xs">{doc.nom_fichier}</Badge>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardContent className="pt-6">
              <ProcessTasksTable
                processId={id!}
                canEdit={canEdit}
                canDelete={canDelete}
                processElements={elements}
                onAddElement={async (type: ElementType, description: string) => {
                  const section = ELEMENT_SECTIONS.find(s => s.type === type);
                  if (section) {
                    await handleAddElement(type, section.prefix, description);
                  }
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
