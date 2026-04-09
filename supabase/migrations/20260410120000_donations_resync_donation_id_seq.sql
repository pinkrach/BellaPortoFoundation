-- Keep donations_donation_id_seq aligned with existing rows (avoids duplicate key on pkey when
-- many rows used explicit donation_id or the sequence drifted). Safe to re-run.

SELECT setval(
  'public.donations_donation_id_seq',
  (SELECT COALESCE(MAX(donation_id), 0) FROM public.donations),
  true
);
