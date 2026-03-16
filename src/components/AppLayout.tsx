import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { HelpModeProvider, useHelpMode } from "@/contexts/HelpModeContext";
import { Info, ScrollText, Eye, EyeOff, HelpCircle, KeyRound } from "lucide-react";
import { GlobalSearch } from "@/components/GlobalSearch";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationBell } from "@/components/NotificationBell";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import defaultLogo from "@/assets/logo.jpg";

function HeaderHelpButton() {
  const { helpMode, toggleHelpMode } = useHelpMode();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={helpMode ? "default" : "ghost"}
          size="sm"
          className={`h-8 gap-1.5 ${helpMode ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md" : "text-muted-foreground"}`}
          onClick={toggleHelpMode}
        >
          <HelpCircle className="h-4 w-4" />
          {helpMode && <span className="text-xs font-medium">Aide</span>}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{helpMode ? "Désactiver le mode aide" : "Activer le mode aide contextuel"}</TooltipContent>
    </Tooltip>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, roles, hasRole } = useAuth();
  const { settings } = useAppSettings();
  const [infoOpen, setInfoOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [accessible, setAccessible] = useState(() => localStorage.getItem("qprocess-accessible") === "true");
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.toggle("theme-accessible", accessible);
    localStorage.setItem("qprocess-accessible", String(accessible));
  }, [accessible]);

  const showLogs = hasRole("admin") || hasRole("rmq") || hasRole("super_admin");
  const logoSrc = settings.logo_url || defaultLogo;

  return (
    <HelpModeProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <header className="h-14 flex items-center justify-between border-b border-border/60 bg-card/80 backdrop-blur-sm px-4 sticky top-0 z-30" style={{ boxShadow: 'var(--shadow-sm)' }}>
              {/* Left: Trigger + Brand */}
              <div className="flex items-center gap-3">
                <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
                <div className="h-6 w-px bg-border/60" />
                <img src={logoSrc} alt={settings.company_name} className="h-7 object-contain" />
                {settings.brand_logo_url && (
                  <img src={settings.brand_logo_url} alt="Logo marque" className="h-7 object-contain" />
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold tracking-tight text-gradient">
                    {settings.app_name}
                  </span>
                  <span className="text-[10px] font-semibold text-primary-foreground bg-primary/90 px-1.5 py-0.5 rounded-full leading-none">
                    SMQ
                  </span>
                </div>
              </div>

              {/* Center: Search */}
              <div className="hidden md:flex flex-1 justify-center max-w-md mx-4">
                <GlobalSearch />
              </div>

              {/* Right: Actions + Profile */}
              <div className="flex items-center gap-1">
                <div className="md:hidden">
                  <GlobalSearch />
                </div>

                {showLogs && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => navigate("/journal")}
                      >
                        <ScrollText className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Journal d'activité</TooltipContent>
                  </Tooltip>
                )}

                <NotificationBell />
                <HeaderHelpButton />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => setInfoOpen(true)}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>À propos</TooltipContent>
                </Tooltip>

                <div className="flex items-center gap-0.5 border border-border/50 rounded-lg p-0.5 bg-muted/40">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={accessible ? "default" : "ghost"}
                        size="icon"
                        className="h-7 w-7 rounded-md"
                        onClick={() => setAccessible(a => !a)}
                      >
                        {accessible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{accessible ? "Désactiver le confort visuel" : "Confort visuel"}</TooltipContent>
                  </Tooltip>
                  <DarkModeToggle />
                </div>

                <div className="h-6 w-px bg-border/60 mx-1" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => setPasswordOpen(true)}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Modifier mon mot de passe</TooltipContent>
                </Tooltip>

                {profile && (
                  <button
                    className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted/60 transition-colors cursor-default"
                    tabIndex={-1}
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-xs font-semibold shadow-sm shrink-0">
                      {profile.prenom?.[0] ?? ""}{profile.nom?.[0] ?? ""}
                    </div>
                    <div className="text-right hidden lg:block">
                      <p className="text-sm font-medium text-foreground leading-tight">{profile.prenom} {profile.nom}</p>
                      <p className="text-[11px] text-muted-foreground capitalize leading-tight">{roles.join(", ").replace(/_/g, " ")}</p>
                    </div>
                  </button>
                )}
              </div>
            </header>
            <main className="flex-1 p-6 overflow-auto">{children}</main>
          </div>
        </div>

        <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
          <DialogContent className="max-w-sm text-center">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {settings.app_name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">{settings.company_name}</p>
              <p className="text-sm font-medium text-foreground">{settings.app_version}</p>
              <p className="text-xs text-muted-foreground italic">
                {settings.app_description}
              </p>
              <div className="h-px bg-border" />
              <p className="text-xs text-muted-foreground">
                {settings.info_copyright}
              </p>
              <p className="text-xs text-muted-foreground">
                Cette application a été développée par<br />
                <span className="font-semibold text-foreground">{settings.info_credits}</span>
              </p>
              {settings.info_credits_help && (
                <p className="text-xs text-muted-foreground">
                  Textes d'aide contextuelle rédigés par<br />
                  <span className="font-semibold text-foreground">{settings.info_credits_help}</span>
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
      </SidebarProvider>
    </HelpModeProvider>
  );
}
