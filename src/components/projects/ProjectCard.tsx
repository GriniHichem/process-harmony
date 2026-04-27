import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, FolderKanban, Zap, Lock, AlertTriangle, ArrowUpRight } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

export interface ProjectSummary {
  id: string;
  title: string;
  slogan: string | null;
  image_url: string | null;
  statut: string;
  date_debut: string | null;
  date_fin: string | null;
  action_count: number;
  avancement: number;
  visibility?: string;
}

const STATUS_MAP: Record<string, { label: string; dot: string; text: string; ring: string }> = {
  brouillon:  { label: "Brouillon",  dot: "bg-muted-foreground/50",            text: "text-muted-foreground",                     ring: "ring-muted-foreground/20" },
  en_cours:   { label: "En cours",   dot: "bg-primary",                         text: "text-primary",                              ring: "ring-primary/30" },
  termine:    { label: "Terminé",    dot: "bg-emerald-500",                     text: "text-emerald-700 dark:text-emerald-400",     ring: "ring-emerald-500/30" },
  archive:    { label: "Archivé",    dot: "bg-secondary-foreground/50",         text: "text-secondary-foreground",                  ring: "ring-secondary-foreground/20" },
};

function getProgressColor(value: number, isOverdue: boolean) {
  if (isOverdue && value < 100) return "bg-destructive";
  if (value >= 80) return "bg-emerald-500";
  if (value >= 40) return "bg-amber-500";
  return "bg-primary";
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const navigate = useNavigate();
  const s = STATUS_MAP[project.statut] ?? STATUS_MAP.en_cours;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const daysLeft = project.date_fin ? differenceInDays(parseISO(project.date_fin), today) : null;
  const isOverdue = daysLeft !== null && daysLeft < 0 && project.statut !== "termine" && project.statut !== "archive";
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && project.statut !== "termine";

  const progressColor = getProgressColor(project.avancement, isOverdue);

  return (
    <Card
      className="group relative cursor-pointer overflow-hidden border-border/50 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30"
      style={{ boxShadow: "var(--shadow-sm)" }}
      onClick={() => navigate(`/actions/${project.id}`)}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-lg)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)"; }}
    >
      {/* Visual header */}
      {project.image_url ? (
        <div className="relative h-32 w-full overflow-hidden">
          <img src={project.image_url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        </div>
      ) : (
        <div className="relative h-20 w-full overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10">
          <FolderKanban className="absolute right-3 top-3 h-12 w-12 text-primary/15" strokeWidth={1.5} />
        </div>
      )}

      {/* Floating badges */}
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        {project.visibility === "private" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-card/95 px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border backdrop-blur">
            <Lock className="h-2.5 w-2.5" /> Privé
          </span>
        )}
        {isOverdue && (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/95 px-2 py-0.5 text-[10px] font-semibold text-destructive-foreground shadow-sm">
            <AlertTriangle className="h-2.5 w-2.5" /> Retard
          </span>
        )}
      </div>

      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-1 font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
              {project.title}
            </h3>
            {project.slogan && (
              <p className="mt-0.5 line-clamp-1 text-xs italic text-muted-foreground">{project.slogan}</p>
            )}
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
        </div>

        {/* Status pill with dot */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className={`inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-2 py-0.5 font-medium ${s.text} ring-1 ${s.ring}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            {s.label}
          </span>
          <span className="inline-flex items-center gap-1">
            <Zap className="h-3 w-3" />
            {project.action_count} action{project.action_count > 1 ? "s" : ""}
          </span>
          {project.date_fin && (
            <span className={`inline-flex items-center gap-1 ${isOverdue ? "text-destructive font-medium" : isUrgent ? "text-amber-600 dark:text-amber-400" : ""}`}>
              <Calendar className="h-3 w-3" />
              {project.date_fin}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Avancement</span>
            <span className="text-sm font-bold text-foreground tabular-nums">{project.avancement}%</span>
          </div>
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full ${progressColor} transition-all duration-500 ease-out`}
              style={{ width: `${Math.min(100, Math.max(0, project.avancement))}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
