import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("Échec de connexion : " + error.message);
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Un email de réinitialisation a été envoyé.");
      setIsResetMode(false);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Shield className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl">ISO 9001 - SMQ</CardTitle>
          <CardDescription>
            {isResetMode
              ? "Entrez votre email pour réinitialiser le mot de passe"
              : "Système de Management de la Qualité"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isResetMode ? handleResetPassword : handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
              />
            </div>
            {!isResetMode && (
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Chargement..." : isResetMode ? "Envoyer le lien" : "Se connecter"}
            </Button>
            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => setIsResetMode(!isResetMode)}
            >
              {isResetMode ? "Retour à la connexion" : "Mot de passe oublié ?"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
