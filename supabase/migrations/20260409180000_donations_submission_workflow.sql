-- Donor-submitted time / in-kind workflow: pending admin review, optional goods receipt tracking.

ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS submission_status text,
  ADD COLUMN IF NOT EXISTS goods_receipt_status text,
  ADD COLUMN IF NOT EXISTS fulfillment_method text,
  ADD COLUMN IF NOT EXISTS denial_reason text;

UPDATE public.donations
SET submission_status = 'confirmed'
WHERE submission_status IS NULL;

ALTER TABLE public.donations
  ALTER COLUMN submission_status SET DEFAULT 'pending',
  ALTER COLUMN submission_status SET NOT NULL;

ALTER TABLE public.donations
  ADD CONSTRAINT donations_submission_status_check
    CHECK (submission_status IN ('pending', 'confirmed', 'denied'));

ALTER TABLE public.donations
  ADD CONSTRAINT donations_goods_receipt_status_check
    CHECK (goods_receipt_status IS NULL OR goods_receipt_status IN ('not_received', 'received'));
