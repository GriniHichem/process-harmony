import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: { nom: string; prenom: string; photo_url: string | null } | null;
}

interface ProcessCommentsProps {
  processId: string;
  canComment: boolean;
  canRead: boolean;
}

export function ProcessComments({ processId, canComment, canRead }: ProcessCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = async () => {
    const { data } = await supabase
      .from("process_comments")
      .select("*, profiles(nom, prenom, photo_url)")
      .eq("process_id", processId)
      .order("created_at", { ascending: false });
    setComments((data ?? []) as Comment[]);
  };

  useEffect(() => {
    if (canRead) fetchComments();
  }, [processId, canRead]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("process_comments").insert({
        process_id: processId,
        user_id: user.id,
        content: newComment.trim(),
      });
      if (error) throw error;
      setNewComment("");
      toast.success("Commentaire ajouté");
      fetchComments();
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!canRead) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Commentaires du processus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canComment && (
          <div className="flex gap-2">
            <Textarea
              placeholder="Ajouter un commentaire..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[60px]"
            />
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun commentaire pour le moment
          </p>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {comments.map((c) => (
              <div key={c.id} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={c.profiles?.photo_url || undefined} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {c.profiles?.prenom?.[0]}{c.profiles?.nom?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {c.profiles ? `${c.profiles.prenom} ${c.profiles.nom}` : "Utilisateur"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(c.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                  </span>
                </div>
                <p className="text-sm text-foreground">{c.content}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
