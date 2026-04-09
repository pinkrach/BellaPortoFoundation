-- Keep supporters as the canonical source for donor names.
-- Backfill duplicate profile name fields from linked supporter records.

UPDATE public.profiles p
SET
  first_name = s.first_name,
  last_name = s.last_name
FROM public.supporters s
WHERE p.supporter_id = s.supporter_id
  AND (
    p.first_name IS DISTINCT FROM s.first_name
    OR p.last_name IS DISTINCT FROM s.last_name
  );

-- Secondary pass: if a profile is not linked yet, match by normalized email.
WITH matched_supporter AS (
  SELECT
    p.id AS profile_id,
    s.first_name,
    s.last_name,
    ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY s.supporter_id ASC) AS rn
  FROM public.profiles p
  JOIN public.supporters s
    ON lower(trim(p.email)) = lower(trim(s.email))
  WHERE p.supporter_id IS NULL
    AND p.email IS NOT NULL
    AND s.email IS NOT NULL
)
UPDATE public.profiles p
SET
  first_name = ms.first_name,
  last_name = ms.last_name
FROM matched_supporter ms
WHERE p.id = ms.profile_id
  AND ms.rn = 1
  AND (
    p.first_name IS DISTINCT FROM ms.first_name
    OR p.last_name IS DISTINCT FROM ms.last_name
  );
