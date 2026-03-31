import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, FolderKanban, Zap } from "lucide-react";

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
}

const STATUS_MAP: Record<string, { label: string; class: string }> = {
  brouillon: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  en_cours: { label: "En cours", class: "bg-primary/15 text-primary" },
  termine: { label: "Terminé", class: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  archive: { label: "Archivé", class: "bg-secondary text-secondary-foreground" },
};

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const navigate = useNavigate();
  const s = STATUS_MAP[project.statut] ?? STATUS_MAP.en_cours;

  return (
    <Card
      className="group cursor-pointer transition-all duration-300 hover:border-primary/25 hover:scale-[1.01] overflow-hidden"
      style={{ boxShadow: "var(--shadow-sm)" }}
      onClick={() => navigate(`/actions/${project.id}`)}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-lg)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-sm)"; }}
    >
      {project.image_url && (
        <div className="h-32 w-full overflow-hidden">
          <img src={project.image_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        </div>
      )}
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground leading-tight line-clamp-1">{project.title}</h3>
            {project.slogan && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 italic">{project.slogan}</p>
            )}
          </div>
          <Badge className={`${s.class} shrink-0 text-[10px]`}>{s.label}</Badge>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{project.action_count} actions</span>
          {project.date_fin && (
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{project.date_fin}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Progress value={project.avancement} className="h-2 flex-1" />
          <span className="text-xs font-medium text-muted-foreground w-8 text-right">{project.avancement}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
