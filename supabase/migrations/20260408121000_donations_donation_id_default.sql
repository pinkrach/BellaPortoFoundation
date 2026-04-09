-- Same pattern as supporters: donation_id was NOT NULL with no default, so UI inserts (no donation_id) fail with 400 from PostgREST.
CREATE SEQUENCE IF NOT EXISTS public.donations_donation_id_seq;

SELECT setval(
  'public.donations_donation_id_seq',
  (SELECT COALESCE(MAX(donation_id), 0) FROM public.donations)
);

ALTER TABLE public.donations
  ALTER COLUMN donation_id SET DEFAULT nextval('public.donations_donation_id_seq');

ALTER SEQUENCE public.donations_donation_id_seq OWNED BY public.donations.donation_id;
