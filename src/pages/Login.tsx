import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import logo from "@/assets/logo.jpg";

type Mode = "login" | "signup" | "reset";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [fonction, setFonction] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("login");

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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || !prenom) {
      toast.error("Le nom et le prénom sont requis");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nom, prenom, fonction },
      },
    });
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success("Compte créé ! Vérifiez votre email pour confirmer.");
      setMode("login");
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
      setMode("login");
    }
    setLoading(false);
  };

  const titles: Record<Mode, string> = {
    login: "Système intégré ISO 9001 et gestion par processus",
    signup: "Créer un nouveau compte",
    reset: "Entrez votre email pour réinitialiser le mot de passe",
  };

  const submitHandler = mode === "signup" ? handleSignup : mode === "reset" ? handleResetPassword : handleLogin;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-3">
          <img src={logo} alt="AMOUR" className="mx-auto h-14 object-contain" />
          <CardTitle className="text-2xl">ISO 9001 - SMQ</CardTitle>
          <CardDescription>{titles[mode]}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitHandler} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom *</Label>
                    <Input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Jean" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom *</Label>
                    <Input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Dupont" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fonction">Fonction</Label>
                  <Input id="fonction" value={fonction} onChange={(e) => setFonction(e.target.value)} placeholder="Responsable qualité" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" required />
            </div>
            {mode !== "reset" && (
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Chargement..." : mode === "login" ? "Se connecter" : mode === "signup" ? "Créer le compte" : "Envoyer le lien"}
            </Button>

            <div className="flex flex-col gap-1">
              {mode === "login" && (
                <>
                  <Button type="button" variant="link" className="w-full" onClick={() => setMode("signup")}>
                    Créer un compte
                  </Button>
                  <Button type="button" variant="link" className="w-full" onClick={() => setMode("reset")}>
                    Mot de passe oublié ?
                  </Button>
                </>
              )}
              {mode !== "login" && (
                <Button type="button" variant="link" className="w-full" onClick={() => setMode("login")}>
                  Retour à la connexion
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
