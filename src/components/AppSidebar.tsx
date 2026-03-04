import {
  LayoutDashboard, Users, Network, Map, FileText, BarChart3, AlertTriangle,
  ClipboardCheck, XCircle, Zap, ScrollText, Settings, LogOut
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
import logo from "@/assets/logo.jpg";

const mainItems = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard },
  { title: "Processus", url: "/processus", icon: Network },
  { title: "Cartographie", url: "/cartographie", icon: Map },
  { title: "BPMN", url: "/bpmn", icon: Settings },
];

const qualityItems = [
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Indicateurs", url: "/indicateurs", icon: BarChart3 },
  { title: "Risques & Opportunités", url: "/risques", icon: AlertTriangle },
];

const auditItems = [
  { title: "Audits", url: "/audits", icon: ClipboardCheck },
  { title: "Non-conformités", url: "/non-conformites", icon: XCircle },
  { title: "Actions", url: "/actions", icon: Zap },
  { title: "Journal d'activité", url: "/journal", icon: ScrollText },
];

const adminItems = [
  { title: "Utilisateurs", url: "/utilisateurs", icon: Users },
];

function NavGroup({ label, items, collapsed }: { label: string; items: typeof mainItems; collapsed: boolean }) {
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
  const { profile, role, signOut } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="AMOUR" className="h-8 rounded-lg object-contain" />
          {!collapsed && (
            <div>
              <p className="text-sm font-semibold text-sidebar-foreground">ISO 9001</p>
              <p className="text-xs text-sidebar-foreground/60">SMQ</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <NavGroup label="Principal" items={mainItems} collapsed={collapsed} />
        <NavGroup label="Qualité" items={qualityItems} collapsed={collapsed} />
        <NavGroup label="Audit & Amélioration" items={auditItems} collapsed={collapsed} />
        {role === "rmq" && <NavGroup label="Administration" items={adminItems} collapsed={collapsed} />}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && profile && (
          <div className="mb-2 px-1">
            <p className="text-xs font-medium text-sidebar-foreground truncate">
              {profile.prenom} {profile.nom}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">{role ?? ""}</p>
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
