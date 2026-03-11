import {
  LayoutDashboard, Users, Network, Map, FileText, BarChart3, AlertTriangle, Landmark,
  ClipboardCheck, XCircle, Zap, ScrollText, Settings, LogOut, Shield, Contact, AlertOctagon, FolderOpen,
  BookOpen, Target, GraduationCap, SmilePlus, Truck, CalendarCheck
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const mainItems = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
  { title: "Acteurs", url: "/acteurs", icon: Contact },
];

const processItems = [
  { title: "Processus", url: "/processus", icon: Network },
  { title: "Cartographie", url: "/cartographie", icon: Map },
  { title: "BPMN", url: "/bpmn", icon: Settings },
];

const qualityItems = [
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Indicateurs", url: "/indicateurs", icon: BarChart3 },
  { title: "Risques & Opportunités", url: "/risques", icon: AlertTriangle },
  { title: "Incidents", url: "/incidents", icon: AlertOctagon },
  { title: "Enjeux du contexte", url: "/enjeux-contexte", icon: Landmark },
];

const auditItems = [
  { title: "Tableau Audit/NC", url: "/dashboard-audit", icon: BarChart3 },
  { title: "Audits", url: "/audits", icon: ClipboardCheck },
  { title: "Non-conformités", url: "/non-conformites", icon: XCircle },
  { title: "Actions", url: "/actions", icon: Zap },
  { title: "Journal d'activité", url: "/journal", icon: ScrollText },
];

const pilotageSMQItems = [
  { title: "Politique qualité", url: "/politique-qualite", icon: BookOpen },
  { title: "Revue de direction", url: "/revue-direction", icon: CalendarCheck },
  { title: "Compétences", url: "/competences", icon: GraduationCap },
  { title: "Satisfaction client", url: "/satisfaction-client", icon: SmilePlus },
  { title: "Fournisseurs", url: "/fournisseurs", icon: Truck },
];

const adminItems = [
  { title: "Utilisateurs", url: "/utilisateurs", icon: Users },
  { title: "Groupes d'acteurs", url: "/groupes-acteurs", icon: FolderOpen },
];

type NavItem = { title: string; url: string; icon: any };

function NavGroup({ label, items, collapsed }: { label: string; items: NavItem[]; collapsed: boolean }) {
  const location = useLocation();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
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

  const showProcessMenu = true; // All roles can see processus menu
  const isActeurOnly = hasRole("acteur") && !hasRole("admin") && !hasRole("rmq") && !hasRole("responsable_processus") && !hasRole("consultant");
  const showQualityMenu = hasRole("admin") || hasRole("rmq") || hasRole("responsable_processus") || hasRole("consultant") || hasRole("acteur");
  const showAuditMenu = hasRole("admin") || hasRole("rmq") || hasRole("auditeur");

  // Acteur only sees Indicateurs, Risques, Enjeux (not Documents, Incidents)
  const acteurQualityItems = qualityItems.filter(i => ["/indicateurs", "/risques", "/enjeux-contexte"].includes(i.url));
  const showAdminMenu = hasRole("admin") || hasRole("rmq");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Shield className="h-4 w-4" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold tracking-tight text-sidebar-foreground">Q-Process</p>
              <p className="text-xs text-sidebar-foreground/60">SMQ</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Principal" items={mainItems} collapsed={collapsed} />
        {showProcessMenu && <NavGroup label="Processus" items={processItems} collapsed={collapsed} />}
        {showQualityMenu && <NavGroup label="Manager processus" items={isActeurOnly ? acteurQualityItems : qualityItems} collapsed={collapsed} />}
        <NavGroup label="Pilotage SMQ" items={pilotageSMQItems} collapsed={collapsed} />
        {showAuditMenu && <NavGroup label="Audit & Amélioration" items={auditItems} collapsed={collapsed} />}
        {showAdminMenu && <NavGroup label="Administration" items={adminItems} collapsed={collapsed} />}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && profile && (
          <div className="mb-2 px-1">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {profile.prenom} {profile.nom}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{roles.join(", ")}</p>
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
