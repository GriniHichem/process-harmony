import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight, Lock, Ban, Calendar, User, Target, X, Weight } from "lucide-react";

interface GanttItem {
  id: string;
  title: string;
  date_debut: string | null;
  echeance: string | null;
  statut: string;
  avancement: number;
  responsable?: string | null;
  level: "project" | "action" | "task";
  poids?: number | null;
  children?: GanttItem[];
}

interface Props {
  items: GanttItem[];
}

const STATUS_COLORS: Record<string, string> = {
  brouillon: "bg-muted",
  en_cours: "bg-primary",
  planifiee: "bg-muted-foreground/40",
  terminee: "bg-emerald-500",
  termine: "bg-emerald-500",
  a_faire: "bg-muted-foreground/30",
  en_retard: "bg-destructive",
  archive: "bg-secondary",
  bloquee: "bg-slate-400",
  annulee: "bg-muted-foreground/20",
};

const STATUS_LABELS: Record<string, { label: string; class: string }> = {
  brouillon: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  planifiee: { label: "Planifiée", class: "bg-muted text-muted-foreground" },
  en_cours: { label: "En cours", class: "bg-primary/15 text-primary" },
  terminee: { label: "Terminée", class: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  termine: { label: "Terminé", class: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  a_faire: { label: "À faire", class: "bg-muted text-muted-foreground" },
  en_retard: { label: "En retard", class: "bg-destructive/15 text-destructive" },
  archive: { label: "Archivé", class: "bg-secondary text-secondary-foreground" },
  bloquee: { label: "Bloquée", class: "bg-slate-500/15 text-slate-600 dark:text-slate-400" },
  annulee: { label: "Annulée", class: "bg-muted/50 text-muted-foreground" },
};

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function diffDays(a: Date, b: Date) { return Math.ceil((b.getTime() - a.getTime()) / 86400000); }

export function ProjectGanttChart({ items }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [focusedItem, setFocusedItem] = useState<GanttItem | null>(null);

  const { startDate, endDate, totalDays, months } = useMemo(() => {
    let minD = new Date();
    let maxD = addDays(new Date(), 30);

    const scan = (list: GanttItem[]) => {
      list.forEach((item) => {
        if (item.date_debut) { const d = new Date(item.date_debut); if (d < minD) minD = d; }
        if (item.echeance) { const d = new Date(item.echeance); if (d > maxD) maxD = d; }
        if (item.children) scan(item.children);
      });
    };
    scan(items);

    const start = addDays(minD, -3);
    const end = addDays(maxD, 7);
    const total = diffDays(start, end);

    const ms: { label: string; start: number; width: number }[] = [];
    let cur = new Date(start);
    while (cur < end) {
      const monthEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
      const mStart = Math.max(0, diffDays(start, cur));
      const mEnd = Math.min(total, diffDays(start, monthEnd));
      ms.push({
        label: cur.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }),
        start: mStart,
        width: mEnd - mStart,
      });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }

    return { startDate: start, endDate: end, totalDays: total, months: ms };
  }, [items]);

  const todayOffset = diffDays(startDate, new Date());

  const toggleCollapse = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleRowClick = (item: GanttItem) => {
    setFocusedItem(prev => prev?.id === item.id ? null : item);
  };

  const renderRows = (list: GanttItem[], depth: number = 0): React.ReactNode[] => {
    const rows: React.ReactNode[] = [];
    list.forEach((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isCollapsed = collapsed.has(item.id);
      const isFocused = focusedItem?.id === item.id;
      const start = item.date_debut ? diffDays(startDate, new Date(item.date_debut)) : null;
      const end = item.echeance ? diffDays(startDate, new Date(item.echeance)) : null;
      const barStart = start ?? todayOffset;
      const barEnd = end ?? barStart + 7;
      const barColor = STATUS_COLORS[item.statut] ?? "bg-primary";
      const isOverdue = item.echeance && new Date(item.echeance) < new Date() && item.avancement < 100;

      rows.push(
        <div
          key={item.id}
          className={`flex border-b border-border/20 transition-colors min-h-[38px] cursor-pointer ${
            isFocused
              ? "bg-primary/8 ring-1 ring-inset ring-primary/20"
              : "hover:bg-muted/20"
          }`}
          onClick={() => handleRowClick(item)}
        >
          {/* Label column */}
          <div
            className="w-72 shrink-0 flex items-center gap-1.5 px-3 py-1.5 border-r border-border/20"
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => { e.stopPropagation(); toggleCollapse(item.id); }}
                className="text-muted-foreground hover:text-foreground"
              >
                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span className="w-3.5" />
            )}
            <span className={`text-xs truncate ${item.level === "project" ? "font-semibold" : item.level === "action" ? "font-medium" : "text-muted-foreground"} ${item.statut === "annulee" ? "line-through opacity-50" : ""}`}>
              {item.statut === "bloquee" && <Lock className="h-3 w-3 inline mr-1 text-slate-500" />}
              {item.statut === "annulee" && <Ban className="h-3 w-3 inline mr-1 text-muted-foreground" />}
              {item.title}
              {item.level === "action" && item.poids != null && (
                <span className="ml-1 text-[9px] text-primary font-normal">({item.poids}%)</span>
              )}
            </span>
          </div>

          {/* Gantt bar area */}
          <div className="flex-1 relative min-w-0">
            {barStart >= 0 && barEnd > barStart && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 rounded-full h-5 overflow-hidden ${isOverdue ? "ring-1 ring-destructive" : ""}`}
                    style={{
                      left: `${(barStart / totalDays) * 100}%`,
                      width: `${(Math.max(1, barEnd - barStart) / totalDays) * 100}%`,
                      minWidth: "8px",
                    }}
                  >
                    <div className={`h-full ${barColor} opacity-25 rounded-full`} />
                    <div
                      className={`absolute inset-y-0 left-0 ${barColor} rounded-full transition-all`}
                      style={{ width: `${item.avancement}%` }}
                    />
                    {item.avancement > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white mix-blend-difference">
                        {item.avancement}%
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-medium">{item.title}</p>
                  <p>{item.date_debut ?? "?"} → {item.echeance ?? "?"}</p>
                  <p>Avancement: {item.avancement}%</p>
                  {item.responsable && <p>Resp: {item.responsable}</p>}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      );

      if (hasChildren && !isCollapsed) {
        rows.push(...renderRows(item.children!, depth + 1));
      }
    });
    return rows;
  };

  // Collect children info for focused item
  const renderFocusPanel = () => {
    if (!focusedItem) return null;
    const st = STATUS_LABELS[focusedItem.statut] ?? STATUS_LABELS.planifiee;
    const isOverdue = focusedItem.echeance && new Date(focusedItem.echeance) < new Date() && focusedItem.avancement < 100;
    const daysLeft = focusedItem.echeance ? diffDays(new Date(), new Date(focusedItem.echeance)) : null;
    const children = focusedItem.children ?? [];

    return (
      <div className="border-t border-border/30 bg-muted/10 px-5 py-4 space-y-4 animate-in slide-in-from-bottom-2 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[9px] uppercase tracking-wider">
                {focusedItem.level === "project" ? "Projet" : focusedItem.level === "action" ? "Action" : "Tâche"}
              </Badge>
              <Badge className={`${st.class} text-[10px]`}>{st.label}</Badge>
              {isOverdue && (
                <Badge className="bg-destructive/15 text-destructive text-[10px]">
                  En retard {daysLeft !== null ? `de ${Math.abs(daysLeft)}j` : ""}
                </Badge>
              )}
              {!isOverdue && daysLeft !== null && daysLeft >= 0 && (
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px]">
                  {daysLeft}j restant{daysLeft > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <h3 className="text-sm font-semibold text-foreground leading-tight">{focusedItem.title}</h3>
          </div>
          <button
            onClick={() => setFocusedItem(null)}
            className="shrink-0 p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border/30 bg-card p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <Calendar className="h-3 w-3" /> Période
            </div>
            <p className="text-xs font-medium text-foreground">
              {focusedItem.date_debut
                ? new Date(focusedItem.date_debut).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
                : "Non défini"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              → {focusedItem.echeance
                ? new Date(focusedItem.echeance).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
                : "Non défini"}
            </p>
          </div>

          <div className="rounded-lg border border-border/30 bg-card p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              <Target className="h-3 w-3" /> Avancement
            </div>
            <div className="flex items-center gap-2">
              <Progress value={focusedItem.avancement} className="h-2 flex-1" />
              <span className="text-xs font-semibold text-foreground">{focusedItem.avancement}%</span>
            </div>
          </div>

          {focusedItem.responsable && (
            <div className="rounded-lg border border-border/30 bg-card p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <User className="h-3 w-3" /> Responsable
              </div>
              <p className="text-xs font-medium text-foreground">{focusedItem.responsable}</p>
            </div>
          )}

          {focusedItem.poids != null && (
            <div className="rounded-lg border border-border/30 bg-card p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                <Weight className="h-3 w-3" /> Poids
              </div>
              <p className="text-xs font-semibold text-foreground">{focusedItem.poids}%</p>
            </div>
          )}
        </div>

        {/* Children list */}
        {children.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {focusedItem.level === "project" ? "Actions" : "Tâches"} ({children.length})
            </h4>
            <div className="grid gap-1.5 max-h-[200px] overflow-y-auto pr-1">
              {children.map(child => {
                const cst = STATUS_LABELS[child.statut] ?? STATUS_LABELS.planifiee;
                return (
                  <div
                    key={child.id}
                    className="flex items-center gap-3 rounded-lg border border-border/20 bg-card px-3 py-2 hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={(e) => { e.stopPropagation(); setFocusedItem(child); }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{child.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {child.echeance && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(child.echeance).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                          </span>
                        )}
                        {child.responsable && (
                          <span className="text-[10px] text-muted-foreground">• {child.responsable}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 w-20">
                        <Progress value={child.avancement} className="h-1.5 flex-1" />
                        <span className="text-[10px] font-medium text-muted-foreground w-7 text-right">{child.avancement}%</span>
                      </div>
                      <Badge className={`${cst.class} text-[9px]`}>{cst.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-card" style={{ boxShadow: "var(--shadow-sm)" }}>
      {/* Header */}
      <div className="flex border-b border-border/30 bg-muted/30">
        <div className="w-72 shrink-0 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/20">
          Élément
        </div>
        <div className="flex-1 relative">
          <div className="flex">
            {months.map((m, i) => (
              <div
                key={i}
                className="text-[10px] font-medium text-muted-foreground text-center py-2 border-r border-border/10"
                style={{ width: `${(m.width / totalDays) * 100}%` }}
              >
                {m.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="relative max-h-[500px] overflow-y-auto">
        {/* Today marker */}
        {todayOffset >= 0 && todayOffset <= totalDays && (
          <div
            className="absolute top-0 bottom-0 w-px bg-destructive/60 z-10"
            style={{ left: `calc(288px + ${(todayOffset / totalDays) * 100}% * (100% - 288px) / 100%)` }}
          />
        )}
        {renderRows(items)}
        {items.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">Aucune donnée à afficher</div>
        )}
      </div>

      {/* Focus panel */}
      {renderFocusPanel()}
    </div>
  );
}
