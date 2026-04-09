-- Track first-time supporter onboarding flow shown on donor dashboard.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS supporter_onboarding_completed boolean NOT NULL DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS supporter_onboarding_existing boolean;

-- Existing users should not be forced through the new onboarding modal.
UPDATE public.profiles
SET supporter_onboarding_completed = true
WHERE supporter_onboarding_completed IS DISTINCT FROM true;
