import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight } from "lucide-react";

interface GanttItem {
  id: string;
  title: string;
  date_debut: string | null;
  echeance: string | null;
  statut: string;
  avancement: number;
  responsable?: string | null;
  level: "project" | "action" | "task";
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
};

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function diffDays(a: Date, b: Date) { return Math.ceil((b.getTime() - a.getTime()) / 86400000); }
function formatDate(d: Date) { return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }); }

export function ProjectGanttChart({ items }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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

    // Generate month headers
    const ms: { label: string; start: number; width: number }[] = [];
    let cur = new Date(start);
    while (cur < end) {
      const monthStart = new Date(cur.getFullYear(), cur.getMonth(), 1);
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

  const renderRows = (list: GanttItem[], depth: number = 0): React.ReactNode[] => {
    const rows: React.ReactNode[] = [];
    list.forEach((item) => {
      const hasChildren = item.children && item.children.length > 0;
      const isCollapsed = collapsed.has(item.id);
      const start = item.date_debut ? diffDays(startDate, new Date(item.date_debut)) : null;
      const end = item.echeance ? diffDays(startDate, new Date(item.echeance)) : null;
      const barStart = start ?? todayOffset;
      const barEnd = end ?? barStart + 7;
      const barColor = STATUS_COLORS[item.statut] ?? "bg-primary";
      const isOverdue = item.echeance && new Date(item.echeance) < new Date() && item.avancement < 100;

      rows.push(
        <div key={item.id} className="flex border-b border-border/20 hover:bg-muted/20 transition-colors min-h-[36px]">
          {/* Label column */}
          <div
            className="w-64 shrink-0 flex items-center gap-1.5 px-3 py-1.5 border-r border-border/20"
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            {hasChildren ? (
              <button onClick={() => toggleCollapse(item.id)} className="text-muted-foreground hover:text-foreground">
                {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span className="w-3.5" />
            )}
            <span className={`text-xs truncate ${item.level === "project" ? "font-semibold" : item.level === "action" ? "font-medium" : "text-muted-foreground"}`}>
              {item.title}
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

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-card" style={{ boxShadow: "var(--shadow-sm)" }}>
      {/* Header */}
      <div className="flex border-b border-border/30 bg-muted/30">
        <div className="w-64 shrink-0 px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider border-r border-border/20">
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
            style={{ left: `calc(256px + ${(todayOffset / totalDays) * 100}% * (100% - 256px) / 100%)` }}
          />
        )}
        {renderRows(items)}
        {items.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">Aucune donnée à afficher</div>
        )}
      </div>
    </div>
  );
}
