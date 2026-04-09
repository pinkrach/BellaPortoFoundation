-- Donor self-service inserts often omit status; align DB default with admin UI ("Active" / "Inactive").
ALTER TABLE public.supporters
  ALTER COLUMN status SET DEFAULT 'Active';
