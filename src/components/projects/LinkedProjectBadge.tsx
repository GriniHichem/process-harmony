import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { FolderKanban } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LinkInfo {
  projectId: string;
  projectTitle: string;
  actionTitle: string;
}

interface Props {
  entityType: "indicator" | "risk" | "context_issue" | "nonconformity";
  entityId: string;
}

export function LinkedProjectBadge({ entityType, entityId }: Props) {
  const [links, setLinks] = useState<LinkInfo[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("project_action_links")
        .select("action_id")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId);
      if (!data || data.length === 0) return;

      const actionIds = data.map((d: any) => d.action_id);
      const { data: actions } = await supabase
        .from("project_actions")
        .select("id, title, project_id")
        .in("id", actionIds);
      if (!actions || actions.length === 0) return;

      const projectIds = [...new Set(actions.map((a: any) => a.project_id))];
      const { data: projects } = await supabase
        .from("projects")
        .select("id, title")
        .in("id", projectIds);

      const projectMap: Record<string, string> = {};
      (projects ?? []).forEach((p: any) => { projectMap[p.id] = p.title; });

      setLinks(actions.map((a: any) => ({
        projectId: a.project_id,
        projectTitle: projectMap[a.project_id] ?? "Projet",
        actionTitle: a.title,
      })));
    };
    fetch();
  }, [entityType, entityId]);

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {links.map((link, i) => (
        <Badge
          key={i}
          variant="outline"
          className="text-[10px] gap-1 cursor-pointer bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
          onClick={() => navigate(`/actions/${link.projectId}`)}
        >
          <FolderKanban className="h-3 w-3" />
          <span className="max-w-[150px] truncate">{link.projectTitle}</span>
          <span className="text-muted-foreground">›</span>
          <span className="max-w-[120px] truncate">{link.actionTitle}</span>
        </Badge>
      ))}
    </div>
  );
}
