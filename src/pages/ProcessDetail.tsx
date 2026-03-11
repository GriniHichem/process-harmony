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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ArrowLeft, Save, FileText, Download, Eye, Maximize2, Minimize2, FileDown, CopyPlus } from "lucide-react";
import { exportProcessPdf } from "@/lib/exportProcessPdf";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { ProcessElementList } from "@/components/ProcessElementList";
import { ProcessTasksTable } from "@/components/ProcessTasksTable";
import { ProcessInteractionManager } from "@/components/ProcessInteractionManager";
import { PartiePrenanteAdder } from "@/components/PartiePrenanteAdder";
import { ContextIssuesManager } from "@/components/ContextIssuesManager";
import { ProcessArchivedObjects } from "@/components/ProcessArchivedObjects";

type ElementType = "finalite" | "donnee_entree" | "donnee_sortie" | "activite" | "interaction" | "partie_prenante" | "ressource";

interface ProcessElement {
  id: string; code: string; description: string; type: ElementType; ordre: number; process_id: string;
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
  const { hasRole, hasPermission, user } = useAuth();
  const [process, setProcess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [elements, setElements] = useState<ProcessElement[]>([]);
  const [users, setUsers] = useState<{ id: string; nom: string; prenom: string; email: string }[]>([]);
  const [processDocuments, setProcessDocuments] = useState<any[]>([]);
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);
  const [pdfViewerTitle, setPdfViewerTitle] = useState("");
  const [pdfFullscreen, setPdfFullscreen] = useState(false);

  const fetchElements = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from("process_elements").select("*").eq("process_id", id).order("ordre", { ascending: true });
    if (data) setElements(data as ProcessElement[]);
  }, [id]);

  const fetchDocuments = useCallback(async () => {
    if (!id) return;
    const { data: dpData } = await supabase.from("document_processes").select("document_id").eq("process_id", id);
    if (!dpData || dpData.length === 0) { setProcessDocuments([]); return; }
    const docIds = dpData.map((dp: any) => dp.document_id);
    const { data: docsData } = await supabase.from("documents").select("id, titre, type_document, version, nom_fichier, chemin_fichier").in("id", docIds).eq("archive", false);
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
    if (id) { fetch(); fetchElements(); fetchDocuments(); fetchUsers(); }
  }, [id, fetchElements, fetchDocuments]);

  const canEdit = hasPermission("processus", "can_edit") || (hasRole("responsable_processus") && process?.responsable_id === user?.id);
  const isArchived = process?.statut === "archive";
  const isLockedStatus = process?.statut === "valide" || process?.statut === "en_validation";
  // Archived = completely frozen for everyone (no edit, no delete, no status change)
  const canDelete = !isArchived && hasPermission("processus", "can_delete") && !isLockedStatus;
  const canChangeStatus = !isArchived && (hasRole("admin") || hasRole("rmq"));
  const canChangeResponsable = !isArchived && (hasRole("admin") || hasRole("rmq"));

  // Block edit on validated/archived for all non-admin roles; archived blocks everyone
  const isLockedForNonAdmin = !hasRole("admin") && (process?.statut === "valide" || isArchived);
  const effectiveCanEdit = canEdit && !isArchived && !isLockedForNonAdmin;

  // RMQ: cannot change state of validated process
  const isRmqOnly = hasRole("rmq") && !hasRole("admin");
  const canChangeStatusEffective = canChangeStatus && !(isRmqOnly && (process?.statut === "valide"));

  // RMQ can create new version of a validated process
  const canCreateNewVersion = hasRole("rmq") && process?.statut === "valide";

  const [creatingVersion, setCreatingVersion] = useState(false);

  const handleCreateNewVersion = async () => {
    if (!process || !id) return;
    setCreatingVersion(true);
    try {
      const currentVersion = parseFloat(process.version_courante);
      const major = Math.floor(currentVersion);
      const minor = Math.round((currentVersion - major) * 100);
      const newVersion = parseFloat((major + (minor + 1) / 100).toFixed(2));
      const newCode = `${process.code}-v${newVersion}`;

      // Duplicate the process
      const { data: newProc, error } = await supabase.from("processes").insert({
        code: newCode,
        nom: process.nom,
        description: process.description,
        type_processus: process.type_processus,
        finalite: process.finalite,
        responsable_id: process.responsable_id,
        donnees_entree: process.donnees_entree,
        donnees_sortie: process.donnees_sortie,
        activites: process.activites,
        interactions: process.interactions,
        parties_prenantes: process.parties_prenantes,
        ressources: process.ressources,
        statut: "brouillon" as const,
        version_courante: newVersion,
      }).select("id").single();

      if (error || !newProc) { toast.error(error?.message || "Erreur"); setCreatingVersion(false); return; }

      // Duplicate elements
      const elemsToInsert = elements.map(({ id: _id, process_id: _pid, ...rest }) => ({
        ...rest,
        process_id: newProc.id,
      }));
      if (elemsToInsert.length > 0) {
        await supabase.from("process_elements").insert(elemsToInsert);
      }

      // Duplicate tasks
      const { data: tasksData } = await supabase.from("process_tasks").select("*").eq("process_id", id);
      if (tasksData && tasksData.length > 0) {
        const tasksToInsert = tasksData.map(({ id: _id, process_id: _pid, created_at: _ca, updated_at: _ua, ...rest }) => ({
          ...rest,
          process_id: newProc.id,
        }));
        await supabase.from("process_tasks").insert(tasksToInsert);
      }

      // Duplicate document links
      const { data: docLinks } = await supabase.from("document_processes").select("*").eq("process_id", id);
      if (docLinks && docLinks.length > 0) {
        const docLinksToInsert = docLinks.map(({ id: _id, created_at: _ca, ...rest }) => ({
          ...rest,
          process_id: newProc.id,
        }));
        await supabase.from("document_processes").insert(docLinksToInsert);
      }

      // Duplicate interactions
      const { data: interSource } = await supabase.from("process_interactions").select("*").eq("source_process_id", id);
      if (interSource && interSource.length > 0) {
        // Need to map old element IDs to new element IDs
        const { data: newElems } = await supabase.from("process_elements").select("*").eq("process_id", newProc.id);
        const oldElems = elements;
        const elemIdMap = new Map<string, string>();
        if (newElems) {
          oldElems.forEach(oldEl => {
            const match = newElems.find(ne => ne.code === oldEl.code && ne.type === oldEl.type);
            if (match) elemIdMap.set(oldEl.id, match.id);
          });
        }
        const interToInsert = interSource
          .filter(i => elemIdMap.has(i.element_id))
          .map(({ id: _id, created_at: _ca, ...rest }) => ({
            ...rest,
            source_process_id: newProc.id,
            element_id: elemIdMap.get(rest.element_id) || rest.element_id,
          }));
        if (interToInsert.length > 0) {
          await supabase.from("process_interactions").insert(interToInsert);
        }
      }

      // Archive original
      await supabase.from("processes").update({ statut: "archive" as const }).eq("id", id);

      // Save version snapshot
      await supabase.from("process_versions").insert({
        process_id: id,
        version: currentVersion,
        donnees: process as any,
        modifie_par: user?.id ?? null,
      });

      toast.success(`Nouvelle version v${newVersion} créée`);
      navigate(`/processus/${newProc.id}`);
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    }
    setCreatingVersion(false);
  };

  const handleSave = async () => {
    if (!process) return;
    setSaving(true);
    const { error } = await supabase.from("processes").update({
      nom: process.nom, description: process.description,
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
    const { error } = await supabase.from("process_elements").insert({ process_id: id, type, code, description, ordre: maxOrdre + 1 });
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
        <Button variant="outline" onClick={() => exportProcessPdf(id!)}>
          <FileDown className="mr-2 h-4 w-4" /> Exporter PDF
        </Button>
        {canCreateNewVersion && (
          <Button variant="secondary" onClick={handleCreateNewVersion} disabled={creatingVersion}>
            <CopyPlus className="mr-2 h-4 w-4" />{creatingVersion ? "Création..." : "Nouvelle version"}
          </Button>
        )}
        {effectiveCanEdit && (
          <Button onClick={handleSave} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "..." : "Enregistrer"}</Button>
        )}
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList>
          <TabsTrigger value="general">Informations générales</TabsTrigger>
          <TabsTrigger value="elements">Éléments</TabsTrigger>
          <TabsTrigger value="tasks">Activités</TabsTrigger>
          {process.statut === "archive" && <TabsTrigger value="archive">Objets liés</TabsTrigger>}
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader><CardTitle className="text-base">Informations générales</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Intitulé</Label><Input value={process.nom} onChange={(e) => updateField("nom", e.target.value)} disabled={!effectiveCanEdit} /></div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={process.type_processus} onValueChange={(v) => updateField("type_processus", v)} disabled={!effectiveCanEdit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pilotage">Management</SelectItem>
                    <SelectItem value="realisation">Réalisation</SelectItem>
                    <SelectItem value="support">Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={process.statut} onValueChange={(v) => updateField("statut", v)} disabled={!canChangeStatusEffective}>
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
                <Select value={process.responsable_id ?? "none"} onValueChange={(v) => updateField("responsable_id", v === "none" ? null : v)} disabled={!canChangeResponsable}>
                  <SelectTrigger><SelectValue placeholder="Non assigné" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non assigné</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{`${u.prenom} ${u.nom}`.trim() || u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={process.description ?? ""} onChange={(e) => updateField("description", e.target.value)} disabled={!effectiveCanEdit} rows={3} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="elements">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ELEMENT_SECTIONS.map(({ type, title, prefix }) => (
              <Card key={type}>
                <CardContent className="pt-6">
                  {type === "interaction" ? (
                    <ProcessInteractionManager processId={id!} processElements={elements} canEdit={effectiveCanEdit} canDelete={canDelete} onRefreshElements={fetchElements} />
                  ) : (
                    <>
                      <ProcessElementList
                        title={title}
                        elements={elements.filter(e => e.type === type)}
                        canEdit={effectiveCanEdit}
                        canDelete={canDelete}
                        multiline={type === "finalite"}
                        onAdd={(desc) => handleAddElement(type, prefix, desc)}
                        onUpdate={handleUpdateElement}
                        onRemove={handleRemoveElement}
                        customAdder={type === "partie_prenante" ? (
                          <PartiePrenanteAdder existingDescriptions={elements.filter(e => e.type === "partie_prenante").map(e => e.description)} onAdd={(desc) => handleAddElement("partie_prenante", "PP", desc)} />
                        ) : undefined}
                      />
                      {type === "ressource" && processDocuments.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Documents associés</h4>
                          {processDocuments.map((doc: any) => {
                            const typeLabels: Record<string, string> = { procedure: "Procédure", instruction: "Instruction", formulaire: "Formulaire", enregistrement: "Enregistrement", rapport: "Rapport", compte_rendu_audit: "CR Audit", preuve: "Preuve" };
                            return (
                              <div key={doc.id} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-primary" />
                                  <span>{doc.titre}</span>
                                  <span className="text-xs text-muted-foreground">({typeLabels[doc.type_document] ?? doc.type_document} • v{doc.version})</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {doc.nom_fichier && <Badge variant="secondary" className="text-xs">{doc.nom_fichier}</Badge>}
                                  {doc.chemin_fichier && (
                                    <Button variant="ghost" size="icon" className="h-7 w-7"
                                      onClick={async () => {
                                        const { data } = await supabase.storage.from("documents").download(doc.chemin_fichier);
                                        if (!data) { toast.error("Impossible d'accéder au fichier"); return; }
                                        const isPdf = doc.nom_fichier?.toLowerCase().endsWith(".pdf");
                                        if (isPdf) {
                                          const blobUrl = URL.createObjectURL(data);
                                          setPdfViewerTitle(doc.titre); setPdfViewerUrl(blobUrl);
                                        } else {
                                          const blobUrl = URL.createObjectURL(data);
                                          const a = document.createElement("a"); a.href = blobUrl; a.download = doc.nom_fichier || "document"; a.click(); URL.revokeObjectURL(blobUrl);
                                        }
                                      }}
                                      title={doc.nom_fichier?.toLowerCase().endsWith(".pdf") ? "Lire" : "Télécharger"}
                                    >
                                      {doc.nom_fichier?.toLowerCase().endsWith(".pdf") ? <Eye className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardContent className="pt-6">
              <ProcessTasksTable processId={id!} canEdit={effectiveCanEdit} canDelete={canDelete} processElements={elements}
                onAddElement={async (type: ElementType, description: string) => {
                  const section = ELEMENT_SECTIONS.find(s => s.type === type);
                  if (section) await handleAddElement(type, section.prefix, description);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
        {process.statut === "archive" && (
          <TabsContent value="archive">
            <ProcessArchivedObjects processId={id!} />
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={!!pdfViewerUrl} onOpenChange={(open) => { if (!open) { if (pdfViewerUrl) URL.revokeObjectURL(pdfViewerUrl); setPdfViewerUrl(null); setPdfViewerTitle(""); setPdfFullscreen(false); } }}>
        <DialogContent className={cn("flex flex-col transition-all duration-300", pdfFullscreen ? "max-w-[100vw] w-[100vw] h-[100vh] rounded-none m-0" : "max-w-5xl w-[90vw] h-[85vh]")} aria-describedby={undefined}>
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle className="flex items-center gap-2"><FileText className="h-4 w-4" /> {pdfViewerTitle}</DialogTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPdfFullscreen(f => !f)} title={pdfFullscreen ? "Réduire" : "Plein écran"}>
                {pdfFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {pdfViewerUrl && <iframe src={pdfViewerUrl} className="w-full h-full rounded-md border" title="PDF Viewer" />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
