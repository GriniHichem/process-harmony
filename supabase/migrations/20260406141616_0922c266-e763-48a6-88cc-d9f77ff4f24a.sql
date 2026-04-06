
-- Fix audit_findings FK: NO ACTION → SET NULL
ALTER TABLE public.audit_findings DROP CONSTRAINT audit_findings_process_id_fkey;
ALTER TABLE public.audit_findings ADD CONSTRAINT audit_findings_process_id_fkey
  FOREIGN KEY (process_id) REFERENCES public.processes(id) ON DELETE SET NULL;

-- Fix nonconformities FK: NO ACTION → SET NULL
ALTER TABLE public.nonconformities DROP CONSTRAINT nonconformities_process_id_fkey;
ALTER TABLE public.nonconformities ADD CONSTRAINT nonconformities_process_id_fkey
  FOREIGN KEY (process_id) REFERENCES public.processes(id) ON DELETE SET NULL;

-- Fix client_surveys FK: NO ACTION → SET NULL
ALTER TABLE public.client_surveys DROP CONSTRAINT client_surveys_process_id_fkey;
ALTER TABLE public.client_surveys ADD CONSTRAINT client_surveys_process_id_fkey
  FOREIGN KEY (process_id) REFERENCES public.processes(id) ON DELETE SET NULL;
