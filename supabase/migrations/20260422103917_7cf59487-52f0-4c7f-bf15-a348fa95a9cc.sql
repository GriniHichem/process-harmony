
-- Backfill: normalize existing project_tasks data
UPDATE public.project_tasks
SET avancement = 100
WHERE statut IN ('termine', 'terminee', 'cloturee') AND avancement <> 100;

UPDATE public.project_tasks
SET avancement = 0
WHERE statut = 'a_faire' AND avancement <> 0;

UPDATE public.project_tasks
SET avancement = 99
WHERE statut = 'en_cours' AND avancement >= 100;

UPDATE public.project_tasks
SET avancement = 1
WHERE statut = 'en_cours' AND avancement <= 0;

-- Trigger function to keep status and progress in sync
CREATE OR REPLACE FUNCTION public.sync_project_task_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.statut IN ('termine', 'terminee', 'cloturee') THEN
    NEW.avancement := 100;
  ELSIF NEW.statut = 'a_faire' THEN
    NEW.avancement := 0;
  ELSIF NEW.statut = 'en_cours' THEN
    IF NEW.avancement IS NULL OR NEW.avancement >= 100 THEN
      NEW.avancement := 99;
    ELSIF NEW.avancement <= 0 THEN
      NEW.avancement := 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_project_task_progress ON public.project_tasks;
CREATE TRIGGER trg_sync_project_task_progress
BEFORE INSERT OR UPDATE ON public.project_tasks
FOR EACH ROW
EXECUTE FUNCTION public.sync_project_task_progress();

-- Recalc avancement of multi-task actions based on normalized tasks
UPDATE public.project_actions pa
SET avancement = sub.avg_progress
FROM (
  SELECT action_id, ROUND(AVG(avancement))::int AS avg_progress
  FROM public.project_tasks
  GROUP BY action_id
) sub
WHERE pa.id = sub.action_id
  AND pa.multi_tasks = true
  AND pa.statut <> 'terminee';
