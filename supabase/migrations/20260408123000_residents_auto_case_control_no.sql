-- When a new resident is inserted with no case control number, assign one from resident_id (CC-000123).
-- resident_id is already defaulted from residents_resident_id_seq (see prior migration).

CREATE OR REPLACE FUNCTION public.residents_set_default_case_control_no()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.case_control_no IS NULL OR btrim(NEW.case_control_no::text) = '' THEN
    UPDATE public.residents
    SET case_control_no = 'CC-' || lpad(NEW.resident_id::text, 6, '0')
    WHERE resident_id = NEW.resident_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS residents_set_default_case_control_no ON public.residents;

CREATE TRIGGER residents_set_default_case_control_no
  AFTER INSERT ON public.residents
  FOR EACH ROW
  EXECUTE PROCEDURE public.residents_set_default_case_control_no();
