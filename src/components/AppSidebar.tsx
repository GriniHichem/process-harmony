import {
  LayoutDashboard, Users, Network, Map, FileText, BarChart3, AlertTriangle, Landmark,
  ClipboardCheck, XCircle, Zap, ScrollText, Settings, LogOut, Shield, Contact, AlertOctagon, FolderOpen,
  BookOpen, Target, GraduationCap, SmilePlus, Truck, CalendarCheck, ClipboardList, Lock, Crown
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import type { AppModule } from "@/lib/defaultPermissions";
import { ROLE_LABELS, type AppRole } from "@/lib/defaultPermissions";
import { HelpTooltip } from "@/components/HelpTooltip";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

type NavItem = { title: string; url: string; icon: any; module?: AppModule };

const mainItems: NavItem[] = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
  { title: "Acteurs", url: "/acteurs", icon: Contact, module: "acteurs" },
  { title: "Évaluation processus", url: "/evaluation-processus", icon: ClipboardList, module: "evaluation_processus" },
];

const processItems: NavItem[] = [
  { title: "Processus", url: "/processus", icon: Network, module: "processus" },
  { title: "Cartographie", url: "/cartographie", icon: Map, module: "cartographie" },
  { title: "BPMN", url: "/bpmn", icon: Settings, module: "bpmn" },
];

const qualityItems: NavItem[] = [
  { title: "Documents", url: "/documents", icon: FileText, module: "documents" },
  { title: "Indicateurs", url: "/indicateurs", icon: BarChart3, module: "indicateurs" },
  { title: "Risques & Opportunités", url: "/risques", icon: AlertTriangle, module: "risques" },
  { title: "Incidents", url: "/incidents", icon: AlertOctagon, module: "incidents" },
  { title: "Enjeux du contexte", url: "/enjeux-contexte", icon: Landmark, module: "enjeux_contexte" },
];

const auditItems: NavItem[] = [
  { title: "Tableau Audit/NC", url: "/dashboard-audit", icon: BarChart3, module: "audits" },
  { title: "Audits", url: "/audits", icon: ClipboardCheck, module: "audits" },
  { title: "Non-conformités", url: "/non-conformites", icon: XCircle, module: "non_conformites" },
  { title: "Actions", url: "/actions", icon: Zap, module: "actions" },
  { title: "Journal d'activité", url: "/journal", icon: ScrollText, module: "journal" },
];

const pilotageSMQItems: NavItem[] = [
  { title: "Politique qualité", url: "/politique-qualite", icon: BookOpen, module: "politique_qualite" },
  { title: "Revue de direction", url: "/revue-direction", icon: CalendarCheck, module: "revue_direction" },
  { title: "Compétences", url: "/competences", icon: GraduationCap, module: "competences" },
  { title: "Satisfaction client", url: "/satisfaction-client", icon: SmilePlus, module: "satisfaction_client" },
  { title: "Fournisseurs", url: "/fournisseurs", icon: Truck, module: "fournisseurs" },
];

const adminItems: NavItem[] = [
  { title: "Utilisateurs", url: "/utilisateurs", icon: Users, module: "utilisateurs" },
  { title: "Groupes d'acteurs", url: "/groupes-acteurs", icon: FolderOpen, module: "groupes_acteurs" },
  { title: "Permissions", url: "/admin/permissions", icon: Lock },
];

const groupHelpTerms: Record<string, string> = {
  "Processus": "approche_processus",
  "Manager processus": "management_processus",
  "Pilotage SMQ": "politique_qualite",
  "Audit & Amélioration": "audit",
};

function NavGroup({ label, items, collapsed }: { label: string; items: NavItem[]; collapsed: boolean }) {
  const location = useLocation();
  const { hasPermission } = useAuth();

  const visibleItems = items.filter((item) => {
    if (!item.module) return true;
    return hasPermission(item.module, "can_read");
  });

  if (visibleItems.length === 0) return null;

  const helpTerm = groupHelpTerms[label];

  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <span className="flex items-center gap-1.5">
          {label}
          {helpTerm && <HelpTooltip term={helpTerm} />}
        </span>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {visibleItems.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={location.pathname === item.url}>
                <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                  <item.icon className="mr-2 h-4 w-4" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { profile, roles, hasRole, signOut } = useAuth();
  const { settings } = useAppSettings();

  const showAdminMenu = hasRole("admin") || hasRole("rmq") || hasRole("super_admin");
  const showSuperAdmin = hasRole("super_admin");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold tracking-tight text-sidebar-foreground">{settings.app_name}</p>
              <p className="text-xs text-sidebar-foreground/60">SMQ</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Principal" items={mainItems} collapsed={collapsed} />
        <NavGroup label="Processus" items={processItems} collapsed={collapsed} />
        <NavGroup label="Manager processus" items={qualityItems} collapsed={collapsed} />
        <NavGroup label="Pilotage SMQ" items={pilotageSMQItems} collapsed={collapsed} />
        <NavGroup label="Audit & Amélioration" items={auditItems} collapsed={collapsed} />
        {showAdminMenu && <NavGroup label="Administration" items={adminItems} collapsed={collapsed} />}
        {showSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/super-admin" end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                      <Crown className="mr-2 h-4 w-4" />
                      {!collapsed && <span>Configuration</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && profile && (
          <div className="mb-2 px-1">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {profile.prenom} {profile.nom}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{roles.map(r => ROLE_LABELS[r as AppRole] || r).join(", ")}</p>
          </div>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" />
          {!collapsed && "Déconnexion"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
