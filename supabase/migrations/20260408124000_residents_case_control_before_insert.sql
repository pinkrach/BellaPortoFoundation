-- Assign case_control_no on INSERT from max existing CC-######## + 1 (4-digit minimum width).
-- Uses a transaction-scoped advisory lock so concurrent inserts cannot reuse the same number.
-- Replaces AFTER INSERT trigger that used resident_id.

DROP TRIGGER IF EXISTS residents_set_default_case_control_no ON public.residents;

DROP FUNCTION IF EXISTS public.residents_set_default_case_control_no();

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

  pad_width := GREATEST(4, char_length(next_num::text));
  NEW.case_control_no := 'CC-' || lpad(next_num::text, pad_width, '0');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS residents_assign_case_control_no_before_insert ON public.residents;

CREATE TRIGGER residents_assign_case_control_no_before_insert
  BEFORE INSERT ON public.residents
  FOR EACH ROW
  EXECUTE PROCEDURE public.residents_assign_case_control_no_before_insert();
