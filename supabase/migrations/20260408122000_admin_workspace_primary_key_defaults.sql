-- Primary keys are NOT NULL without defaults in the baseline schema; admin modals omit IDs on create.
-- Supporters and donations are handled in earlier migrations. This covers other insert paths from AdminWorkspace.

-- donation_allocations.allocation_id
CREATE SEQUENCE IF NOT EXISTS public.donation_allocations_allocation_id_seq;
SELECT setval(
  'public.donation_allocations_allocation_id_seq',
  (SELECT COALESCE(MAX(allocation_id), 0) FROM public.donation_allocations)
);
ALTER TABLE public.donation_allocations
  ALTER COLUMN allocation_id SET DEFAULT nextval('public.donation_allocations_allocation_id_seq');
ALTER SEQUENCE public.donation_allocations_allocation_id_seq OWNED BY public.donation_allocations.allocation_id;

-- education_records.education_record_id
CREATE SEQUENCE IF NOT EXISTS public.education_records_education_record_id_seq;
SELECT setval(
  'public.education_records_education_record_id_seq',
  (SELECT COALESCE(MAX(education_record_id), 0) FROM public.education_records)
);
ALTER TABLE public.education_records
  ALTER COLUMN education_record_id SET DEFAULT nextval('public.education_records_education_record_id_seq');
ALTER SEQUENCE public.education_records_education_record_id_seq OWNED BY public.education_records.education_record_id;

-- health_wellbeing_records.health_record_id
CREATE SEQUENCE IF NOT EXISTS public.health_wellbeing_records_health_record_id_seq;
SELECT setval(
  'public.health_wellbeing_records_health_record_id_seq',
  (SELECT COALESCE(MAX(health_record_id), 0) FROM public.health_wellbeing_records)
);
ALTER TABLE public.health_wellbeing_records
  ALTER COLUMN health_record_id SET DEFAULT nextval('public.health_wellbeing_records_health_record_id_seq');
ALTER SEQUENCE public.health_wellbeing_records_health_record_id_seq OWNED BY public.health_wellbeing_records.health_record_id;

-- home_visitations.visitation_id
CREATE SEQUENCE IF NOT EXISTS public.home_visitations_visitation_id_seq;
SELECT setval(
  'public.home_visitations_visitation_id_seq',
  (SELECT COALESCE(MAX(visitation_id), 0) FROM public.home_visitations)
);
ALTER TABLE public.home_visitations
  ALTER COLUMN visitation_id SET DEFAULT nextval('public.home_visitations_visitation_id_seq');
ALTER SEQUENCE public.home_visitations_visitation_id_seq OWNED BY public.home_visitations.visitation_id;

-- in_kind_donation_items.item_id
CREATE SEQUENCE IF NOT EXISTS public.in_kind_donation_items_item_id_seq;
SELECT setval(
  'public.in_kind_donation_items_item_id_seq',
  (SELECT COALESCE(MAX(item_id), 0) FROM public.in_kind_donation_items)
);
ALTER TABLE public.in_kind_donation_items
  ALTER COLUMN item_id SET DEFAULT nextval('public.in_kind_donation_items_item_id_seq');
ALTER SEQUENCE public.in_kind_donation_items_item_id_seq OWNED BY public.in_kind_donation_items.item_id;

-- incident_reports.incident_id
CREATE SEQUENCE IF NOT EXISTS public.incident_reports_incident_id_seq;
SELECT setval(
  'public.incident_reports_incident_id_seq',
  (SELECT COALESCE(MAX(incident_id), 0) FROM public.incident_reports)
);
ALTER TABLE public.incident_reports
  ALTER COLUMN incident_id SET DEFAULT nextval('public.incident_reports_incident_id_seq');
ALTER SEQUENCE public.incident_reports_incident_id_seq OWNED BY public.incident_reports.incident_id;

-- intervention_plans.plan_id
CREATE SEQUENCE IF NOT EXISTS public.intervention_plans_plan_id_seq;
SELECT setval(
  'public.intervention_plans_plan_id_seq',
  (SELECT COALESCE(MAX(plan_id), 0) FROM public.intervention_plans)
);
ALTER TABLE public.intervention_plans
  ALTER COLUMN plan_id SET DEFAULT nextval('public.intervention_plans_plan_id_seq');
ALTER SEQUENCE public.intervention_plans_plan_id_seq OWNED BY public.intervention_plans.plan_id;

-- residents.resident_id
CREATE SEQUENCE IF NOT EXISTS public.residents_resident_id_seq;
SELECT setval(
  'public.residents_resident_id_seq',
  (SELECT COALESCE(MAX(resident_id), 0) FROM public.residents)
);
ALTER TABLE public.residents
  ALTER COLUMN resident_id SET DEFAULT nextval('public.residents_resident_id_seq');
ALTER SEQUENCE public.residents_resident_id_seq OWNED BY public.residents.resident_id;

-- safehouses.safehouse_id
CREATE SEQUENCE IF NOT EXISTS public.safehouses_safehouse_id_seq;
SELECT setval(
  'public.safehouses_safehouse_id_seq',
  (SELECT COALESCE(MAX(safehouse_id), 0) FROM public.safehouses)
);
ALTER TABLE public.safehouses
  ALTER COLUMN safehouse_id SET DEFAULT nextval('public.safehouses_safehouse_id_seq');
ALTER SEQUENCE public.safehouses_safehouse_id_seq OWNED BY public.safehouses.safehouse_id;

-- process_recordings.recording_id
CREATE SEQUENCE IF NOT EXISTS public.process_recordings_recording_id_seq;
SELECT setval(
  'public.process_recordings_recording_id_seq',
  (SELECT COALESCE(MAX(recording_id), 0) FROM public.process_recordings)
);
ALTER TABLE public.process_recordings
  ALTER COLUMN recording_id SET DEFAULT nextval('public.process_recordings_recording_id_seq');
ALTER SEQUENCE public.process_recordings_recording_id_seq OWNED BY public.process_recordings.recording_id;
