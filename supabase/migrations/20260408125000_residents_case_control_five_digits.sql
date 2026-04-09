-- Case control numbers: CC- + at least 5 digits (CC-00001, CC-00002, …), widening after 99999.
-- Keeps max(CC-numeric) + 1 logic; only changes padding from 4 to 5.

CREATE OR REPLACE FUNCTION public.residents_assign_case_control_no_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_num integer;
  pad_width integer;
BEGIN
  PERFORM pg_advisory_xact_lock(982451227);

  SELECT COALESCE(MAX(
    CASE
      WHEN r.case_control_no IS NOT NULL
        AND btrim(r.case_control_no::text) <> ''
        AND lower(btrim(r.case_control_no::text)) ~ '^cc-[0-9]+$'
      THEN (regexp_match(lower(btrim(r.case_control_no::text)), '^cc-([0-9]+)$'))[1]::integer
      ELSE NULL
    END
  ), 0) + 1 INTO next_num
  FROM public.residents r;

  pad_width := GREATEST(5, char_length(next_num::text));
  NEW.case_control_no := 'CC-' || lpad(next_num::text, pad_width, '0');

  RETURN NEW;
END;
$$;
