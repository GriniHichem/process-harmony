import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.jpg";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, role } = useAuth();
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <img src={logo} alt="AMOUR" className="h-7 object-contain" />
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Q-Process
                </span>
                <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                  SMQ
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-primary"
                onClick={() => setInfoOpen(true)}
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {profile && (
                <div className="text-right">
                  <p className="text-sm font-medium">{profile.prenom} {profile.nom}</p>
                  <p className="text-xs text-muted-foreground capitalize">{role?.replace("_", " ") ?? ""}</p>
                </div>
              )}
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-medium">
                {profile ? `${profile.prenom?.[0] ?? ""}${profile.nom?.[0] ?? ""}` : "?"}
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Q-Process
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm font-medium text-foreground">v1.01</p>
            <div className="h-px bg-border" />
            <p className="text-xs text-muted-foreground">
              © 2026 Groupe AMOUR. Tous droits réservés.
            </p>
            <p className="text-xs text-muted-foreground">
              Cette application a été développée par<br />
              <span className="font-semibold text-foreground">H. GRINI & F. SERRADJ</span> — SI TEAM
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
