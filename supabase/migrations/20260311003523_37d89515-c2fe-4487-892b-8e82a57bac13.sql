
-- Step 1: Add description_poste column to acteurs
ALTER TABLE public.acteurs ADD COLUMN IF NOT EXISTS description_poste text DEFAULT '';

-- Step 2: Migrate nom/prenom data into fonction if fonction is empty
UPDATE public.acteurs SET fonction = TRIM(prenom || ' ' || nom) WHERE fonction IS NULL OR fonction = '';

-- Step 3: Drop nom/prenom columns from acteurs
ALTER TABLE public.acteurs DROP COLUMN IF EXISTS nom;
ALTER TABLE public.acteurs DROP COLUMN IF EXISTS prenom;

-- Step 4: Add acteur_id column to profiles (a user has one acteur)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS acteur_id uuid REFERENCES public.acteurs(id) ON DELETE SET NULL;

-- Step 5: RLS policy for profiles acteur_id update by rmq
-- (already covered by existing profiles_update_rmq and profiles_update_admin policies)
