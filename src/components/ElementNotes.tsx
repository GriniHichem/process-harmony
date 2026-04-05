import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { MessageSquare, ChevronDown, ChevronRight, Send, Reply, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ElementNote {
  id: string;
  element_type: string;
  element_id: string;
  contenu: string;
  avancement: number;
  date_note: string;
  created_by: string | null;
  is_response: boolean;
  parent_note_id: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  nom: string;
  prenom: string;
  photo_url?: string | null;
}

interface ElementNotesProps {
  elementType: string; // 'risk_action', 'risk_moyen', 'indicator_action', 'indicator_moyen'
  elementId: string;
  /** The acteur_id of the responsable for this element — if current user's acteur_id matches, they can add notes */
  responsableActeurId?: string | null;
}

export function ElementNotes({ elementType, elementId, responsableActeurId }: ElementNotesProps) {
  const { user, profile, hasRole, hasPermission } = useAuth();
  const [notes, setNotes] = useState<ElementNote[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [open, setOpen] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = hasRole("admin");
  const isRmq = hasRole("rmq");
  const isResponsableProcessus = hasRole("responsable_processus");

  // Check if current user is the responsible acteur
  const userActeurId = (profile as any)?.acteur_id;
  const isResponsableActeur = responsableActeurId && userActeurId && responsableActeurId === userActeurId;

  // Can add notes: managers + the responsible acteur
  const canAddNote = isAdmin || isRmq || isResponsableProcessus || isResponsableActeur;
  // Can respond: managers (responsable_processus, rmq, admin)
  const canRespond = isAdmin || isRmq || isResponsableProcessus;
  // Can delete: admin/rmq only
  const canDelete = isAdmin;

  const fetchNotes = useCallback(async () => {
    const { data } = await supabase
      .from("element_notes")
      .select("*")
      .eq("element_type", elementType)
      .eq("element_id", elementId)
      .order("created_at", { ascending: false });
    const notesList = (data ?? []) as ElementNote[];
    setNotes(notesList);

    // Fetch profiles for note authors
    const userIds = [...new Set(notesList.map((n) => n.created_by).filter(Boolean))] as string[];
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, nom, prenom, photo_url")
        .in("id", userIds);
      if (profilesData) {
        const map: Record<string, Profile> = {};
        for (const p of profilesData) map[p.id] = p;
        setProfiles(map);
      }
    }
  }, [elementType, elementId]);

  useEffect(() => {
    if (open) fetchNotes();
  }, [open, fetchNotes]);

  const handleAddNote = async () => {
    if (!newContent.trim()) { toast.error("Contenu requis"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("element_notes").insert({
      element_type: elementType,
      element_id: elementId,
      contenu: newContent.trim(),
      created_by: user?.id ?? null,
      is_response: false,
    } as any);
    if (error) { toast.error(error.message); setSubmitting(false); return; }
    toast.success("Note ajoutée");
    setNewContent("");
    fetchNotes();
    setSubmitting(false);
  };

  const handleReply = async (parentId: string) => {
    if (!replyContent.trim()) { toast.error("Contenu requis"); return; }
    setSubmitting(true);
    const { error } = await supabase.from("element_notes").insert({
      element_type: elementType,
      element_id: elementId,
      contenu: replyContent.trim(),
      created_by: user?.id ?? null,
      is_response: true,
      parent_note_id: parentId,
    } as any);
    if (error) { toast.error(error.message); setSubmitting(false); return; }
    toast.success("Réponse ajoutée");
    setReplyContent("");
    setReplyTo(null);
    fetchNotes();
    setSubmitting(false);
  };

  const handleDelete = async (noteId: string) => {
    const { error } = await supabase.from("element_notes").delete().eq("id", noteId);
    if (error) { toast.error(error.message); return; }
    toast.success("Note supprimée");
    fetchNotes();
  };

  const getAuthorName = (userId: string | null) => {
    if (!userId) return "Inconnu";
    const p = profiles[userId];
    return p ? `${p.prenom} ${p.nom}` : "...";
  };

  const getAuthorPhoto = (userId: string | null) => {
    if (!userId) return null;
    return profiles[userId]?.photo_url || null;
  };

  // Separate root notes and responses
  const rootNotes = notes.filter((n) => !n.parent_note_id);
  const responsesByParent = notes.reduce((acc, n) => {
    if (n.parent_note_id) {
      if (!acc[n.parent_note_id]) acc[n.parent_note_id] = [];
      acc[n.parent_note_id].push(n);
    }
    return acc;
  }, {} as Record<string, ElementNote[]>);

  const noteCount = notes.length;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-1.5">
          <MessageSquare className="h-3 w-3" />
          {noteCount > 0 && <Badge variant="secondary" className="h-4 text-[10px] px-1">{noteCount}</Badge>}
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2 pl-1 border-l-2 border-muted ml-1">
        {/* Add note form */}
        {canAddNote && (
          <div className="flex gap-2 items-start">
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Ajouter une note de suivi..."
              className="text-xs min-h-[48px] flex-1"
              rows={2}
            />
            <Button size="sm" className="h-8 shrink-0" onClick={handleAddNote} disabled={submitting}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Notes list */}
        {rootNotes.length === 0 && !canAddNote && (
          <p className="text-xs text-muted-foreground italic py-1">Aucune note</p>
        )}
        {rootNotes.map((note) => {
          const responses = responsesByParent[note.id] ?? [];
          return (
            <div key={note.id} className="space-y-1.5">
              {/* Root note */}
              <div className={`rounded-md border px-2.5 py-2 text-xs space-y-1 ${note.is_response ? "bg-primary/5 border-primary/20" : "bg-muted/40"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={getAuthorPhoto(note.created_by) || undefined} />
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                        {getAuthorName(note.created_by).split(" ").map(w => w[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-foreground">{getAuthorName(note.created_by)}</span>
                    <span>•</span>
                    <span>{format(new Date(note.created_at), "dd MMM yyyy HH:mm", { locale: fr })}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {canRespond && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => { setReplyTo(replyTo === note.id ? null : note.id); setReplyContent(""); }}
                      >
                        <Reply className="h-3 w-3" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => handleDelete(note.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="whitespace-pre-wrap">{note.contenu}</p>
              </div>

              {/* Responses */}
              {responses.map((resp) => (
                <div key={resp.id} className="ml-4 rounded-md border border-primary/20 bg-primary/5 px-2.5 py-2 text-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Reply className="h-3 w-3 text-primary" />
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={getAuthorPhoto(resp.created_by) || undefined} />
                        <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                          {getAuthorName(resp.created_by).split(" ").map(w => w[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-foreground">{getAuthorName(resp.created_by)}</span>
                      <span>•</span>
                      <span>{format(new Date(resp.created_at), "dd MMM yyyy HH:mm", { locale: fr })}</span>
                    </div>
                    {canDelete && (
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => handleDelete(resp.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap">{resp.contenu}</p>
                </div>
              ))}

              {/* Reply form */}
              {replyTo === note.id && canRespond && (
                <div className="ml-4 flex gap-2 items-start">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Répondre..."
                    className="text-xs min-h-[40px] flex-1"
                    rows={2}
                  />
                  <Button size="sm" className="h-8 shrink-0" onClick={() => handleReply(note.id)} disabled={submitting}>
                    <Send className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
