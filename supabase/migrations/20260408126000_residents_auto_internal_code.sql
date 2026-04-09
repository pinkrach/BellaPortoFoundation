-- Assign internal_code on INSERT (LS- + numeric sequence), same pattern as case_control_no.
-- Uses the same advisory lock so one transaction assigns both codes without interleaving.

CREATE OR REPLACE FUNCTION public.residents_assign_case_control_no_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  next_case_num integer;
  case_pad integer;
  next_ls_num integer;
  ls_pad integer;
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
  ), 0) + 1 INTO next_case_num
  FROM public.residents r;

  case_pad := GREATEST(5, char_length(next_case_num::text));
  NEW.case_control_no := 'CC-' || lpad(next_case_num::text, case_pad, '0');

  SELECT COALESCE(MAX(
    CASE
      WHEN r.internal_code IS NOT NULL
        AND btrim(r.internal_code::text) <> ''
        AND lower(btrim(r.internal_code::text)) ~ '^ls-[0-9]+$'
      THEN (regexp_match(lower(btrim(r.internal_code::text)), '^ls-([0-9]+)$'))[1]::integer
      ELSE NULL
    END
  ), 0) + 1 INTO next_ls_num
  FROM public.residents r;

  ls_pad := GREATEST(4, char_length(next_ls_num::text));
  NEW.internal_code := 'LS-' || lpad(next_ls_num::text, ls_pad, '0');

  RETURN NEW;
END;
$$;
