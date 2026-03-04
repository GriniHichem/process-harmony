import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.jpg";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, role } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <img src={logo} alt="AMOUR" className="h-7 object-contain" />
              <span className="text-sm font-medium text-muted-foreground">
                Système de Management de la Qualité
              </span>
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
    </SidebarProvider>
  );
}
