-- Inserts from the admin UI omit supporter_id; the column was NOT NULL without a default, causing PostgREST/API inserts to fail.
CREATE SEQUENCE IF NOT EXISTS public.supporters_supporter_id_seq;

SELECT setval(
  'public.supporters_supporter_id_seq',
  (SELECT COALESCE(MAX(supporter_id), 0) FROM public.supporters)
);

ALTER TABLE public.supporters
  ALTER COLUMN supporter_id SET DEFAULT nextval('public.supporters_supporter_id_seq');

ALTER SEQUENCE public.supporters_supporter_id_seq OWNED BY public.supporters.supporter_id;
