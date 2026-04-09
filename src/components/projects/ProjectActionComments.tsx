import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Send, Pencil, Trash2, X, Check } from "lucide-react";
import { formatDistanceToNow, parseISO, differenceInMinutes } from "date-fns";
import { fr } from "date-fns/locale";

interface Comment {
  id: string;
  action_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

interface Props {
  actionId: string;
  canComment: boolean;
  isAdmin: boolean;
}

export function ProjectActionComments({ actionId, canComment, isAdmin }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("project_action_comments")
      .select("*")
      .eq("action_id", actionId)
      .order("created_at", { ascending: true });
    const cmts = (data ?? []) as Comment[];
    setComments(cmts);

    // Fetch profiles for unique user_ids
    const userIds = [...new Set(cmts.map(c => c.user_id))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, nom, prenom, email")
        .in("id", userIds);
      const map: Record<string, Profile> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }
  };

  useEffect(() => { fetchComments(); }, [actionId]);

  const handleSubmit = async () => {
    if (!newContent.trim() || !user) return;
    setSubmitting(true);
    const { error } = await supabase.from("project_action_comments").insert({
      action_id: actionId,
      user_id: user.id,
      content: newContent.trim(),
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setNewContent("");
    fetchComments();
  };

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return;
    const { error } = await supabase
      .from("project_action_comments")
      .update({ content: editContent.trim() })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEditingId(null);
    fetchComments();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("project_action_comments")
      .delete()
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Commentaire supprimé");
    fetchComments();
  };

  const getDisplayName = (userId: string) => {
    const p = profiles[userId];
    if (!p) return "Utilisateur";
    if (p.prenom || p.nom) return `${p.prenom || ""} ${p.nom || ""}`.trim();
    return p.email || "Utilisateur";
  };

  const getInitials = (userId: string) => {
    const p = profiles[userId];
    if (!p) return "?";
    return `${(p.prenom || "")[0] || ""}${(p.nom || "")[0] || ""}`.toUpperCase() || "?";
  };

  const canEditComment = (comment: Comment) => {
    if (comment.user_id !== user?.id) return false;
    return differenceInMinutes(new Date(), parseISO(comment.created_at)) < 5;
  };

  const canDeleteComment = (comment: Comment) => {
    if (isAdmin) return true;
    if (comment.user_id !== user?.id) return false;
    return differenceInMinutes(new Date(), parseISO(comment.created_at)) < 5;
  };

  const isEdited = (comment: Comment) => comment.updated_at !== comment.created_at;

  return (
    <div className="space-y-3">
      {comments.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">Aucun commentaire</p>
      )}

      {comments.map(comment => (
        <div key={comment.id} className="flex gap-2.5">
          <Avatar className="h-7 w-7 shrink-0 mt-0.5">
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{getInitials(comment.user_id)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">{getDisplayName(comment.user_id)}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(parseISO(comment.created_at), { addSuffix: true, locale: fr })}
              </span>
              {isEdited(comment) && <span className="text-[10px] text-muted-foreground italic">(modifié)</span>}
            </div>

            {editingId === comment.id ? (
              <div className="mt-1 space-y-1.5">
                <Textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="text-xs min-h-[60px]"
                  autoFocus
                />
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => handleUpdate(comment.id)}>
                    <Check className="h-3 w-3" /> Valider
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-muted-foreground" onClick={() => setEditingId(null)}>
                    <X className="h-3 w-3" /> Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-0.5">{comment.content}</p>
            )}

            {editingId !== comment.id && (
              <div className="flex gap-1 mt-1">
                {canEditComment(comment) && (
                  <button
                    className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                    onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                  >
                    <Pencil className="h-2.5 w-2.5" /> Modifier
                  </button>
                )}
                {canDeleteComment(comment) && (
                  <button
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-0.5 ml-2"
                    onClick={() => handleDelete(comment.id)}
                  >
                    <Trash2 className="h-2.5 w-2.5" /> Supprimer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {canComment && (
        <div className="flex gap-2 items-end">
          <Textarea
            placeholder="Ajouter un commentaire..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            className="text-xs min-h-[50px] flex-1"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          />
          <Button size="sm" className="h-8 shrink-0" onClick={handleSubmit} disabled={submitting || !newContent.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
