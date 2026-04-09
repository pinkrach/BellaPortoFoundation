-- Link auth profiles to supporters for fast, stable donor lookups.
-- This keeps existing email-based behavior as fallback while backfilling.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS supporter_id bigint;

-- Backfill profiles.supporter_id from existing email matches.
-- If multiple supporters share an email, choose the lowest supporter_id deterministically.
WITH ranked_matches AS (
  SELECT
    p.id AS profile_id,
    s.supporter_id,
    ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY s.supporter_id ASC) AS rn
  FROM public.profiles p
  JOIN public.supporters s
    ON lower(trim(p.email)) = lower(trim(s.email))
  WHERE p.supporter_id IS NULL
    AND p.email IS NOT NULL
    AND s.email IS NOT NULL
)
UPDATE public.profiles p
SET supporter_id = rm.supporter_id
FROM ranked_matches rm
WHERE p.id = rm.profile_id
  AND rm.rn = 1
  AND p.supporter_id IS NULL;

-- Index for fast joins/lookups by supporter id.
CREATE INDEX IF NOT EXISTS profiles_supporter_id_idx
  ON public.profiles (supporter_id);

-- Add FK in non-blocking way, then validate.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_supporter_id_fkey'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_supporter_id_fkey
      FOREIGN KEY (supporter_id)
      REFERENCES public.supporters (supporter_id)
      ON DELETE SET NULL
      NOT VALID;
  END IF;
END $$;

ALTER TABLE public.profiles
  VALIDATE CONSTRAINT profiles_supporter_id_fkey;
