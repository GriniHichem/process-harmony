
-- Add 'image' to document_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'image' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'document_type')) THEN
    ALTER TYPE public.document_type ADD VALUE 'image';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not add image to document_type enum: %', SQLERRM;
END $$;

-- Add tracking columns
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS consulte_count integer DEFAULT 0;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS retired_at timestamptz;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS retired_by uuid;
