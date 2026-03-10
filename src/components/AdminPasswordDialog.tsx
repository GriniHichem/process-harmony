import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, Loader2 } from "lucide-react";

interface AdminPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
}

export function AdminPasswordDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Autorisation requise",
  description = "Cette action nécessite les identifiants d'un administrateur (super utilisateur).",
}: AdminPasswordDialogProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setEmail("");
    setPassword("");
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Veuillez remplir l'email et le mot de passe");
      return;
    }

    setLoading(true);
    try {
      // Save current session
      const { data: currentSession } = await supabase.auth.getSession();

      // Try to sign in as admin
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !signInData.user) {
        toast.error("Identifiants invalides");
        // Restore previous session
        if (currentSession?.session) {
          await supabase.auth.setSession(currentSession.session);
        }
        setLoading(false);
        return;
      }

      // Check if the user has admin role
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: signInData.user.id,
        _role: "admin",
      });

      if (!isAdmin) {
        toast.error("Cet utilisateur n'a pas les droits administrateur");
        // Restore previous session
        if (currentSession?.session) {
          await supabase.auth.setSession(currentSession.session);
        }
        setLoading(false);
        return;
      }

      // Admin confirmed - execute the action while still logged as admin (for RLS)
      await onConfirm();

      // Restore original session
      if (currentSession?.session) {
        await supabase.auth.setSession(currentSession.session);
      }

      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error("Une erreur est survenue");
      // Try to restore session on error
      const { data: currentSession } = await supabase.auth.getSession();
      if (!currentSession?.session) {
        window.location.reload();
      }
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { reset(); onOpenChange(v); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="admin-email">Email administrateur</Label>
            <Input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@exemple.com"
              disabled={loading}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-password">Mot de passe</Label>
            <Input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Vérification...</> : "Confirmer la suppression"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
