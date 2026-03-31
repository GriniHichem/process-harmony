
-- Add notification trigger on nc_actions for assignation and status change
CREATE TRIGGER notify_nc_actions_change
AFTER INSERT OR UPDATE ON public.nc_actions
FOR EACH ROW
EXECUTE FUNCTION public.notify_responsibility_change();
