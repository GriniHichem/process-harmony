import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  LayoutDashboard, Users, Network, Map, FileText, BarChart3, AlertTriangle,
  ClipboardCheck, XCircle, Zap, ScrollText, Contact, AlertOctagon,
  BookOpen, Target, GraduationCap, SmilePlus, Truck, CalendarCheck, ClipboardList,
  Settings, Landmark, FolderOpen, Lock, Crown, Search,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface SearchItem {
  title: string;
  url: string;
  icon: any;
  group: string;
  keywords?: string;
}

const allItems: SearchItem[] = [
  { title: "Tableau de bord", url: "/", icon: LayoutDashboard, group: "Principal", keywords: "dashboard accueil" },
  { title: "Acteurs", url: "/acteurs", icon: Contact, group: "Principal", keywords: "parties prenantes" },
  { title: "Évaluation processus", url: "/evaluation-processus", icon: ClipboardList, group: "Principal" },
  { title: "Processus", url: "/processus", icon: Network, group: "Processus", keywords: "process" },
  { title: "Cartographie", url: "/cartographie", icon: Map, group: "Processus", keywords: "carte map" },
  { title: "BPMN", url: "/bpmn", icon: Settings, group: "Processus", keywords: "diagramme flux" },
  { title: "Documents", url: "/documents", icon: FileText, group: "Manager", keywords: "fichier procedure" },
  { title: "Indicateurs", url: "/indicateurs", icon: BarChart3, group: "Manager", keywords: "kpi mesure" },
  { title: "Risques & Opportunités", url: "/risques", icon: AlertTriangle, group: "Manager" },
  { title: "Incidents", url: "/incidents", icon: AlertOctagon, group: "Manager" },
  { title: "Enjeux du contexte", url: "/enjeux-contexte", icon: Landmark, group: "Manager" },
  { title: "Politique qualité", url: "/politique-qualite", icon: BookOpen, group: "Pilotage SMQ" },
  { title: "Revue de direction", url: "/revue-direction", icon: CalendarCheck, group: "Pilotage SMQ" },
  { title: "Compétences", url: "/competences", icon: GraduationCap, group: "Pilotage SMQ", keywords: "formation" },
  { title: "Satisfaction client", url: "/satisfaction-client", icon: SmilePlus, group: "Pilotage SMQ", keywords: "sondage enquete" },
  { title: "Fournisseurs", url: "/fournisseurs", icon: Truck, group: "Pilotage SMQ" },
  { title: "Tableau Audit/NC", url: "/dashboard-audit", icon: BarChart3, group: "Audit & Amélioration" },
  { title: "Audits", url: "/audits", icon: ClipboardCheck, group: "Audit & Amélioration" },
  { title: "Non-conformités", url: "/non-conformites", icon: XCircle, group: "Audit & Amélioration", keywords: "nc" },
  { title: "Actions", url: "/actions", icon: Zap, group: "Audit & Amélioration", keywords: "amelioration" },
  { title: "Journal d'activité", url: "/journal", icon: ScrollText, group: "Audit & Amélioration", keywords: "log historique" },
  { title: "Utilisateurs", url: "/utilisateurs", icon: Users, group: "Administration" },
  { title: "Groupes d'acteurs", url: "/groupes-acteurs", icon: FolderOpen, group: "Administration" },
  { title: "Permissions", url: "/admin/permissions", icon: Lock, group: "Administration" },
  { title: "Notifications", url: "/notifications", icon: Target, group: "Principal", keywords: "alerte" },
  { title: "Super Admin", url: "/super-admin", icon: Crown, group: "Administration" },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback(
    (url: string) => {
      setOpen(false);
      navigate(url);
    },
    [navigate]
  );

  const showAdmin = hasRole("admin") || hasRole("rmq") || hasRole("super_admin");
  const showSuperAdmin = hasRole("super_admin");

  const filteredItems = allItems.filter((item) => {
    if (item.group === "Administration" && !showAdmin) return false;
    if (item.url === "/super-admin" && !showSuperAdmin) return false;
    return true;
  });

  const groups = [...new Set(filteredItems.map((i) => i.group))];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-8 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground hover:bg-accent/50 transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Rechercher…</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Rechercher une page…" />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group} heading={group}>
              {filteredItems
                .filter((i) => i.group === group)
                .map((item) => (
                  <CommandItem
                    key={item.url}
                    value={`${item.title} ${item.keywords ?? ""}`}
                    onSelect={() => handleSelect(item.url)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.title}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
