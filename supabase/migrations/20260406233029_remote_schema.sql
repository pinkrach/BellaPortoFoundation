drop extension if exists "pg_net";


  create table "public"."donation_allocations" (
    "allocation_id" bigint not null,
    "donation_id" bigint,
    "safehouse_id" bigint,
    "program_area" text,
    "amount_allocated" numeric,
    "allocation_date" date,
    "allocation_notes" text
      );


alter table "public"."donation_allocations" enable row level security;


  create table "public"."donations" (
    "donation_id" bigint not null,
    "supporter_id" bigint,
    "donation_type" text,
    "donation_date" date,
    "is_recurring" boolean,
    "campaign_name" text,
    "channel_source" text,
    "currency_code" text,
    "amount" numeric,
    "estimated_value" numeric,
    "impact_unit" text,
    "notes" text,
    "referral_post_id" bigint
      );


alter table "public"."donations" enable row level security;


  create table "public"."education_records" (
    "education_record_id" bigint not null,
    "resident_id" bigint,
    "record_date" date,
    "education_level" text,
    "school_name" text,
    "enrollment_status" text,
    "attendance_rate" numeric,
    "progress_percent" numeric,
    "completion_status" text,
    "notes" text
      );


alter table "public"."education_records" enable row level security;


  create table "public"."health_wellbeing_records" (
    "health_record_id" bigint not null,
    "resident_id" bigint,
    "record_date" date,
    "general_health_score" numeric,
    "nutrition_score" numeric,
    "sleep_quality_score" numeric,
    "energy_level_score" numeric,
    "height_cm" numeric,
    "weight_kg" numeric,
    "bmi" numeric,
    "medical_checkup_done" boolean,
    "dental_checkup_done" boolean,
    "psychological_checkup_done" boolean,
    "notes" text
      );


alter table "public"."health_wellbeing_records" enable row level security;


  create table "public"."home_visitations" (
    "visitation_id" bigint not null,
    "resident_id" bigint,
    "visit_date" date,
    "social_worker" text,
    "visit_type" text,
    "location_visited" text,
    "family_members_present" text,
    "purpose" text,
    "observations" text,
    "family_cooperation_level" text,
    "safety_concerns_noted" boolean,
    "follow_up_needed" boolean,
    "follow_up_notes" text,
    "visit_outcome" text
      );


alter table "public"."home_visitations" enable row level security;


  create table "public"."in_kind_donation_items" (
    "item_id" bigint not null,
    "donation_id" bigint,
    "item_name" text,
    "item_category" text,
    "quantity" numeric,
    "unit_of_measure" text,
    "estimated_unit_value" double precision,
    "intended_use" text,
    "received_condition" text
      );


alter table "public"."in_kind_donation_items" enable row level security;


  create table "public"."incident_reports" (
    "incident_id" bigint not null,
    "resident_id" bigint,
    "safehouse_id" bigint,
    "incident_date" date,
    "incident_type" text,
    "severity" text,
    "description" text,
    "response_taken" text,
    "resolved" boolean,
    "resolution_date" date,
    "reported_by" text,
    "follow_up_required" boolean
      );


alter table "public"."incident_reports" enable row level security;


  create table "public"."intervention_plans" (
    "plan_id" bigint not null,
    "resident_id" bigint,
    "plan_category" text,
    "plan_description" text,
    "services_provided" text,
    "target_value" numeric,
    "target_date" date,
    "status" text,
    "case_conference_date" date,
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
      );


alter table "public"."intervention_plans" enable row level security;


  create table "public"."partner_assignments" (
    "assignment_id" bigint not null,
    "partner_id" bigint,
    "safehouse_id" bigint,
    "program_area" text,
    "assignment_start" date,
    "assignment_end" date,
    "responsibility_notes" text,
    "is_primary" boolean,
    "status" text
      );


alter table "public"."partner_assignments" enable row level security;


  create table "public"."partners" (
    "partner_id" bigint not null,
    "partner_name" text,
    "partner_type" text,
    "role_type" text,
    "contact_name" text,
    "email" text,
    "phone" text,
    "region" text,
    "status" text,
    "start_date" date,
    "end_date" date,
    "notes" text
      );


alter table "public"."partners" enable row level security;


  create table "public"."process_recordings" (
    "recording_id" bigint not null,
    "resident_id" bigint,
    "session_date" text,
    "social_worker" text,
    "session_type" text,
    "session_duration_minutes" bigint,
    "emotional_state_observed" text,
    "emotional_state_end" text,
    "session_narrative" text,
    "interventions_applied" text,
    "follow_up_actions" text,
    "progress_noted" boolean,
    "concerns_flagged" boolean,
    "referral_made" boolean,
    "notes_restricted" text
      );


alter table "public"."process_recordings" enable row level security;


  create table "public"."public_impact_snapshots" (
    "snapshot_id" bigint not null,
    "snapshot_date" date,
    "headline" text,
    "summary_text" text,
    "metric_payload_json" jsonb,
    "is_published" boolean,
    "published_at" date
      );


alter table "public"."public_impact_snapshots" enable row level security;


  create table "public"."residents" (
    "resident_id" bigint not null,
    "case_control_no" text,
    "internal_code" text,
    "safehouse_id" bigint,
    "case_status" text,
    "sex" text,
    "date_of_birth" date,
    "birth_status" text,
    "place_of_birth" text,
    "religion" text,
    "case_category" text,
    "sub_cat_orphaned" boolean,
    "sub_cat_trafficked" boolean,
    "sub_cat_child_labor" boolean,
    "sub_cat_physical_abuse" boolean,
    "sub_cat_sexual_abuse" boolean,
    "sub_cat_osaec" boolean,
    "sub_cat_cicl" boolean,
    "sub_cat_at_risk" boolean,
    "sub_cat_street_child" boolean,
    "sub_cat_child_with_hiv" boolean,
    "is_pwd" boolean,
    "pwd_type" text,
    "has_special_needs" boolean,
    "special_needs_diagnosis" text,
    "family_is_4ps" boolean,
    "family_solo_parent" boolean,
    "family_indigenous" boolean,
    "family_parent_pwd" boolean,
    "family_informal_settler" boolean,
    "date_of_admission" date,
    "age_upon_admission" text,
    "present_age" text,
    "length_of_stay" text,
    "referral_source" text,
    "referring_agency_person" text,
    "date_colb_registered" date,
    "date_colb_obtained" date,
    "assigned_social_worker" text,
    "initial_case_assessment" text,
    "date_case_study_prepared" date,
    "reintegration_type" text,
    "reintegration_status" text,
    "initial_risk_level" text,
    "current_risk_level" text,
    "date_enrolled" date,
    "date_closed" date,
    "created_at" timestamp with time zone,
    "notes_restricted" text
      );


alter table "public"."residents" enable row level security;


  create table "public"."safehouse_monthly_metrics" (
    "metric_id" bigint not null,
    "safehouse_id" bigint,
    "month_start" date,
    "month_end" date,
    "active_residents" bigint,
    "avg_education_progress" numeric,
    "avg_health_score" numeric,
    "process_recording_count" bigint,
    "home_visitation_count" bigint,
    "incident_count" bigint,
    "notes" text
      );


alter table "public"."safehouse_monthly_metrics" enable row level security;


  create table "public"."safehouses" (
    "safehouse_id" bigint not null,
    "safehouse_code" text,
    "name" text,
    "region" text,
    "city" text,
    "province" text,
    "country" text,
    "open_date" date,
    "status" text,
    "capacity_girls" bigint,
    "capacity_staff" bigint,
    "current_occupancy" bigint,
    "notes" text
      );


alter table "public"."safehouses" enable row level security;


  create table "public"."social_media_posts" (
    "post_id" bigint not null,
    "platform" text,
    "platform_post_id" text,
    "post_url" text,
    "created_at" timestamp with time zone,
    "day_of_week" text,
    "post_hour" bigint,
    "post_type" text,
    "media_type" text,
    "caption" text,
    "hashtags" text,
    "num_hashtags" bigint,
    "mentions_count" bigint,
    "has_call_to_action" boolean,
    "call_to_action_type" text,
    "content_topic" text,
    "sentiment_tone" text,
    "caption_length" bigint,
    "features_resident_story" boolean,
    "campaign_name" text,
    "is_boosted" boolean,
    "boost_budget_php" numeric,
    "impressions" bigint,
    "reach" bigint,
    "likes" bigint,
    "comments" bigint,
    "shares" bigint,
    "saves" bigint,
    "click_throughs" bigint,
    "video_views" numeric,
    "engagement_rate" numeric,
    "profile_visits" bigint,
    "donation_referrals" bigint,
    "estimated_donation_value_php" numeric,
    "follower_count_at_post" bigint,
    "watch_time_seconds" numeric,
    "avg_view_duration_seconds" numeric,
    "subscriber_count_at_post" numeric,
    "forwards" numeric
      );


alter table "public"."social_media_posts" enable row level security;


  create table "public"."supporters" (
    "supporter_id" bigint not null,
    "supporter_type" text,
    "display_name" text,
    "organization_name" text,
    "first_name" text,
    "last_name" text,
    "relationship_type" text,
    "region" text,
    "country" text,
    "email" text,
    "phone" text,
    "status" text,
    "created_at" timestamp with time zone,
    "first_donation_date" date,
    "acquisition_channel" text
      );


alter table "public"."supporters" enable row level security;

CREATE UNIQUE INDEX donation_allocations_pkey ON public.donation_allocations USING btree (allocation_id);

CREATE UNIQUE INDEX donations_pkey ON public.donations USING btree (donation_id);

CREATE UNIQUE INDEX education_records_pkey ON public.education_records USING btree (education_record_id);

CREATE UNIQUE INDEX health_wellbeing_records_pkey ON public.health_wellbeing_records USING btree (health_record_id);

CREATE UNIQUE INDEX home_visitations_pkey ON public.home_visitations USING btree (visitation_id);

CREATE UNIQUE INDEX in_kind_donation_items_pkey ON public.in_kind_donation_items USING btree (item_id);

CREATE UNIQUE INDEX incident_reports_pkey ON public.incident_reports USING btree (incident_id);

CREATE UNIQUE INDEX intervention_plans_pkey ON public.intervention_plans USING btree (plan_id);

CREATE UNIQUE INDEX partner_assignments_pkey ON public.partner_assignments USING btree (assignment_id);

CREATE UNIQUE INDEX partners_pkey ON public.partners USING btree (partner_id);

CREATE UNIQUE INDEX "process_recordings.csv_pkey" ON public.process_recordings USING btree (recording_id);

CREATE UNIQUE INDEX public_impact_snapshots_pkey ON public.public_impact_snapshots USING btree (snapshot_id);

CREATE UNIQUE INDEX residents_pkey ON public.residents USING btree (resident_id);

CREATE UNIQUE INDEX safehouse_monthly_metrics_pkey ON public.safehouse_monthly_metrics USING btree (metric_id);

CREATE UNIQUE INDEX safehouses_pkey ON public.safehouses USING btree (safehouse_id);

CREATE UNIQUE INDEX social_media_posts_pkey ON public.social_media_posts USING btree (post_id);

CREATE UNIQUE INDEX supporters_pkey ON public.supporters USING btree (supporter_id);

alter table "public"."donation_allocations" add constraint "donation_allocations_pkey" PRIMARY KEY using index "donation_allocations_pkey";

alter table "public"."donations" add constraint "donations_pkey" PRIMARY KEY using index "donations_pkey";

alter table "public"."education_records" add constraint "education_records_pkey" PRIMARY KEY using index "education_records_pkey";

alter table "public"."health_wellbeing_records" add constraint "health_wellbeing_records_pkey" PRIMARY KEY using index "health_wellbeing_records_pkey";

alter table "public"."home_visitations" add constraint "home_visitations_pkey" PRIMARY KEY using index "home_visitations_pkey";

alter table "public"."in_kind_donation_items" add constraint "in_kind_donation_items_pkey" PRIMARY KEY using index "in_kind_donation_items_pkey";

alter table "public"."incident_reports" add constraint "incident_reports_pkey" PRIMARY KEY using index "incident_reports_pkey";

alter table "public"."intervention_plans" add constraint "intervention_plans_pkey" PRIMARY KEY using index "intervention_plans_pkey";

alter table "public"."partner_assignments" add constraint "partner_assignments_pkey" PRIMARY KEY using index "partner_assignments_pkey";

alter table "public"."partners" add constraint "partners_pkey" PRIMARY KEY using index "partners_pkey";

alter table "public"."process_recordings" add constraint "process_recordings.csv_pkey" PRIMARY KEY using index "process_recordings.csv_pkey";

alter table "public"."public_impact_snapshots" add constraint "public_impact_snapshots_pkey" PRIMARY KEY using index "public_impact_snapshots_pkey";

alter table "public"."residents" add constraint "residents_pkey" PRIMARY KEY using index "residents_pkey";

alter table "public"."safehouse_monthly_metrics" add constraint "safehouse_monthly_metrics_pkey" PRIMARY KEY using index "safehouse_monthly_metrics_pkey";

alter table "public"."safehouses" add constraint "safehouses_pkey" PRIMARY KEY using index "safehouses_pkey";

alter table "public"."social_media_posts" add constraint "social_media_posts_pkey" PRIMARY KEY using index "social_media_posts_pkey";

alter table "public"."supporters" add constraint "supporters_pkey" PRIMARY KEY using index "supporters_pkey";

alter table "public"."donation_allocations" add constraint "donation_allocations_donation_id_fkey" FOREIGN KEY (donation_id) REFERENCES public.donations(donation_id) not valid;

alter table "public"."donation_allocations" validate constraint "donation_allocations_donation_id_fkey";

alter table "public"."donation_allocations" add constraint "donation_allocations_safehouse_id_fkey" FOREIGN KEY (safehouse_id) REFERENCES public.safehouses(safehouse_id) not valid;

alter table "public"."donation_allocations" validate constraint "donation_allocations_safehouse_id_fkey";

alter table "public"."donations" add constraint "donations_referral_post_id_fkey" FOREIGN KEY (referral_post_id) REFERENCES public.social_media_posts(post_id) not valid;

alter table "public"."donations" validate constraint "donations_referral_post_id_fkey";

alter table "public"."donations" add constraint "donations_supporter_id_fkey" FOREIGN KEY (supporter_id) REFERENCES public.supporters(supporter_id) not valid;

alter table "public"."donations" validate constraint "donations_supporter_id_fkey";

alter table "public"."education_records" add constraint "education_records_resident_id_fkey" FOREIGN KEY (resident_id) REFERENCES public.residents(resident_id) not valid;

alter table "public"."education_records" validate constraint "education_records_resident_id_fkey";

alter table "public"."health_wellbeing_records" add constraint "health_wellbeing_records_resident_id_fkey" FOREIGN KEY (resident_id) REFERENCES public.residents(resident_id) not valid;

alter table "public"."health_wellbeing_records" validate constraint "health_wellbeing_records_resident_id_fkey";

alter table "public"."home_visitations" add constraint "home_visitations_resident_id_fkey" FOREIGN KEY (resident_id) REFERENCES public.residents(resident_id) not valid;

alter table "public"."home_visitations" validate constraint "home_visitations_resident_id_fkey";

alter table "public"."in_kind_donation_items" add constraint "in_kind_donation_items_donation_id_fkey" FOREIGN KEY (donation_id) REFERENCES public.donations(donation_id) not valid;

alter table "public"."in_kind_donation_items" validate constraint "in_kind_donation_items_donation_id_fkey";

alter table "public"."incident_reports" add constraint "incident_reports_resident_id_fkey" FOREIGN KEY (resident_id) REFERENCES public.residents(resident_id) not valid;

alter table "public"."incident_reports" validate constraint "incident_reports_resident_id_fkey";

alter table "public"."incident_reports" add constraint "incident_reports_safehouse_id_fkey" FOREIGN KEY (safehouse_id) REFERENCES public.safehouses(safehouse_id) not valid;

alter table "public"."incident_reports" validate constraint "incident_reports_safehouse_id_fkey";

alter table "public"."intervention_plans" add constraint "intervention_plans_resident_id_fkey" FOREIGN KEY (resident_id) REFERENCES public.residents(resident_id) not valid;

alter table "public"."intervention_plans" validate constraint "intervention_plans_resident_id_fkey";

alter table "public"."partner_assignments" add constraint "partner_assignments_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES public.partners(partner_id) not valid;

alter table "public"."partner_assignments" validate constraint "partner_assignments_partner_id_fkey";

alter table "public"."partner_assignments" add constraint "partner_assignments_safehouse_id_fkey" FOREIGN KEY (safehouse_id) REFERENCES public.safehouses(safehouse_id) not valid;

alter table "public"."partner_assignments" validate constraint "partner_assignments_safehouse_id_fkey";

alter table "public"."process_recordings" add constraint "process_recordings.csv_resident_id_fkey" FOREIGN KEY (resident_id) REFERENCES public.residents(resident_id) ON DELETE CASCADE not valid;

alter table "public"."process_recordings" validate constraint "process_recordings.csv_resident_id_fkey";

alter table "public"."residents" add constraint "residents_safehouse_id_fkey" FOREIGN KEY (safehouse_id) REFERENCES public.safehouses(safehouse_id) not valid;

alter table "public"."residents" validate constraint "residents_safehouse_id_fkey";

alter table "public"."safehouse_monthly_metrics" add constraint "safehouse_monthly_metrics_safehouse_id_fkey" FOREIGN KEY (safehouse_id) REFERENCES public.safehouses(safehouse_id) not valid;

alter table "public"."safehouse_monthly_metrics" validate constraint "safehouse_monthly_metrics_safehouse_id_fkey";

grant delete on table "public"."donation_allocations" to "anon";

grant insert on table "public"."donation_allocations" to "anon";

grant references on table "public"."donation_allocations" to "anon";

grant select on table "public"."donation_allocations" to "anon";

grant trigger on table "public"."donation_allocations" to "anon";

grant truncate on table "public"."donation_allocations" to "anon";

grant update on table "public"."donation_allocations" to "anon";

grant delete on table "public"."donation_allocations" to "authenticated";

grant insert on table "public"."donation_allocations" to "authenticated";

grant references on table "public"."donation_allocations" to "authenticated";

grant select on table "public"."donation_allocations" to "authenticated";

grant trigger on table "public"."donation_allocations" to "authenticated";

grant truncate on table "public"."donation_allocations" to "authenticated";

grant update on table "public"."donation_allocations" to "authenticated";

grant delete on table "public"."donation_allocations" to "service_role";

grant insert on table "public"."donation_allocations" to "service_role";

grant references on table "public"."donation_allocations" to "service_role";

grant select on table "public"."donation_allocations" to "service_role";

grant trigger on table "public"."donation_allocations" to "service_role";

grant truncate on table "public"."donation_allocations" to "service_role";

grant update on table "public"."donation_allocations" to "service_role";

grant delete on table "public"."donations" to "anon";

grant insert on table "public"."donations" to "anon";

grant references on table "public"."donations" to "anon";

grant select on table "public"."donations" to "anon";

grant trigger on table "public"."donations" to "anon";

grant truncate on table "public"."donations" to "anon";

grant update on table "public"."donations" to "anon";

grant delete on table "public"."donations" to "authenticated";

grant insert on table "public"."donations" to "authenticated";

grant references on table "public"."donations" to "authenticated";

grant select on table "public"."donations" to "authenticated";

grant trigger on table "public"."donations" to "authenticated";

grant truncate on table "public"."donations" to "authenticated";

grant update on table "public"."donations" to "authenticated";

grant delete on table "public"."donations" to "service_role";

grant insert on table "public"."donations" to "service_role";

grant references on table "public"."donations" to "service_role";

grant select on table "public"."donations" to "service_role";

grant trigger on table "public"."donations" to "service_role";

grant truncate on table "public"."donations" to "service_role";

grant update on table "public"."donations" to "service_role";

grant delete on table "public"."education_records" to "anon";

grant insert on table "public"."education_records" to "anon";

grant references on table "public"."education_records" to "anon";

grant select on table "public"."education_records" to "anon";

grant trigger on table "public"."education_records" to "anon";

grant truncate on table "public"."education_records" to "anon";

grant update on table "public"."education_records" to "anon";

grant delete on table "public"."education_records" to "authenticated";

grant insert on table "public"."education_records" to "authenticated";

grant references on table "public"."education_records" to "authenticated";

grant select on table "public"."education_records" to "authenticated";

grant trigger on table "public"."education_records" to "authenticated";

grant truncate on table "public"."education_records" to "authenticated";

grant update on table "public"."education_records" to "authenticated";

grant delete on table "public"."education_records" to "service_role";

grant insert on table "public"."education_records" to "service_role";

grant references on table "public"."education_records" to "service_role";

grant select on table "public"."education_records" to "service_role";

grant trigger on table "public"."education_records" to "service_role";

grant truncate on table "public"."education_records" to "service_role";

grant update on table "public"."education_records" to "service_role";

grant delete on table "public"."health_wellbeing_records" to "anon";

grant insert on table "public"."health_wellbeing_records" to "anon";

grant references on table "public"."health_wellbeing_records" to "anon";

grant select on table "public"."health_wellbeing_records" to "anon";

grant trigger on table "public"."health_wellbeing_records" to "anon";

grant truncate on table "public"."health_wellbeing_records" to "anon";

grant update on table "public"."health_wellbeing_records" to "anon";

grant delete on table "public"."health_wellbeing_records" to "authenticated";

grant insert on table "public"."health_wellbeing_records" to "authenticated";

grant references on table "public"."health_wellbeing_records" to "authenticated";

grant select on table "public"."health_wellbeing_records" to "authenticated";

grant trigger on table "public"."health_wellbeing_records" to "authenticated";

grant truncate on table "public"."health_wellbeing_records" to "authenticated";

grant update on table "public"."health_wellbeing_records" to "authenticated";

grant delete on table "public"."health_wellbeing_records" to "service_role";

grant insert on table "public"."health_wellbeing_records" to "service_role";

grant references on table "public"."health_wellbeing_records" to "service_role";

grant select on table "public"."health_wellbeing_records" to "service_role";

grant trigger on table "public"."health_wellbeing_records" to "service_role";

grant truncate on table "public"."health_wellbeing_records" to "service_role";

grant update on table "public"."health_wellbeing_records" to "service_role";

grant delete on table "public"."home_visitations" to "anon";

grant insert on table "public"."home_visitations" to "anon";

grant references on table "public"."home_visitations" to "anon";

grant select on table "public"."home_visitations" to "anon";

grant trigger on table "public"."home_visitations" to "anon";

grant truncate on table "public"."home_visitations" to "anon";

grant update on table "public"."home_visitations" to "anon";

grant delete on table "public"."home_visitations" to "authenticated";

grant insert on table "public"."home_visitations" to "authenticated";

grant references on table "public"."home_visitations" to "authenticated";

grant select on table "public"."home_visitations" to "authenticated";

grant trigger on table "public"."home_visitations" to "authenticated";

grant truncate on table "public"."home_visitations" to "authenticated";

grant update on table "public"."home_visitations" to "authenticated";

grant delete on table "public"."home_visitations" to "service_role";

grant insert on table "public"."home_visitations" to "service_role";

grant references on table "public"."home_visitations" to "service_role";

grant select on table "public"."home_visitations" to "service_role";

grant trigger on table "public"."home_visitations" to "service_role";

grant truncate on table "public"."home_visitations" to "service_role";

grant update on table "public"."home_visitations" to "service_role";

grant delete on table "public"."in_kind_donation_items" to "anon";

grant insert on table "public"."in_kind_donation_items" to "anon";

grant references on table "public"."in_kind_donation_items" to "anon";

grant select on table "public"."in_kind_donation_items" to "anon";

grant trigger on table "public"."in_kind_donation_items" to "anon";

grant truncate on table "public"."in_kind_donation_items" to "anon";

grant update on table "public"."in_kind_donation_items" to "anon";

grant delete on table "public"."in_kind_donation_items" to "authenticated";

grant insert on table "public"."in_kind_donation_items" to "authenticated";

grant references on table "public"."in_kind_donation_items" to "authenticated";

grant select on table "public"."in_kind_donation_items" to "authenticated";

grant trigger on table "public"."in_kind_donation_items" to "authenticated";

grant truncate on table "public"."in_kind_donation_items" to "authenticated";

grant update on table "public"."in_kind_donation_items" to "authenticated";

grant delete on table "public"."in_kind_donation_items" to "service_role";

grant insert on table "public"."in_kind_donation_items" to "service_role";

grant references on table "public"."in_kind_donation_items" to "service_role";

grant select on table "public"."in_kind_donation_items" to "service_role";

grant trigger on table "public"."in_kind_donation_items" to "service_role";

grant truncate on table "public"."in_kind_donation_items" to "service_role";

grant update on table "public"."in_kind_donation_items" to "service_role";

grant delete on table "public"."incident_reports" to "anon";

grant insert on table "public"."incident_reports" to "anon";

grant references on table "public"."incident_reports" to "anon";

grant select on table "public"."incident_reports" to "anon";

grant trigger on table "public"."incident_reports" to "anon";

grant truncate on table "public"."incident_reports" to "anon";

grant update on table "public"."incident_reports" to "anon";

grant delete on table "public"."incident_reports" to "authenticated";

grant insert on table "public"."incident_reports" to "authenticated";

grant references on table "public"."incident_reports" to "authenticated";

grant select on table "public"."incident_reports" to "authenticated";

grant trigger on table "public"."incident_reports" to "authenticated";

grant truncate on table "public"."incident_reports" to "authenticated";

grant update on table "public"."incident_reports" to "authenticated";

grant delete on table "public"."incident_reports" to "service_role";

grant insert on table "public"."incident_reports" to "service_role";

grant references on table "public"."incident_reports" to "service_role";

grant select on table "public"."incident_reports" to "service_role";

grant trigger on table "public"."incident_reports" to "service_role";

grant truncate on table "public"."incident_reports" to "service_role";

grant update on table "public"."incident_reports" to "service_role";

grant delete on table "public"."intervention_plans" to "anon";

grant insert on table "public"."intervention_plans" to "anon";

grant references on table "public"."intervention_plans" to "anon";

grant select on table "public"."intervention_plans" to "anon";

grant trigger on table "public"."intervention_plans" to "anon";

grant truncate on table "public"."intervention_plans" to "anon";

grant update on table "public"."intervention_plans" to "anon";

grant delete on table "public"."intervention_plans" to "authenticated";

grant insert on table "public"."intervention_plans" to "authenticated";

grant references on table "public"."intervention_plans" to "authenticated";

grant select on table "public"."intervention_plans" to "authenticated";

grant trigger on table "public"."intervention_plans" to "authenticated";

grant truncate on table "public"."intervention_plans" to "authenticated";

grant update on table "public"."intervention_plans" to "authenticated";

grant delete on table "public"."intervention_plans" to "service_role";

grant insert on table "public"."intervention_plans" to "service_role";

grant references on table "public"."intervention_plans" to "service_role";

grant select on table "public"."intervention_plans" to "service_role";

grant trigger on table "public"."intervention_plans" to "service_role";

grant truncate on table "public"."intervention_plans" to "service_role";

grant update on table "public"."intervention_plans" to "service_role";

grant delete on table "public"."partner_assignments" to "anon";

grant insert on table "public"."partner_assignments" to "anon";

grant references on table "public"."partner_assignments" to "anon";

grant select on table "public"."partner_assignments" to "anon";

grant trigger on table "public"."partner_assignments" to "anon";

grant truncate on table "public"."partner_assignments" to "anon";

grant update on table "public"."partner_assignments" to "anon";

grant delete on table "public"."partner_assignments" to "authenticated";

grant insert on table "public"."partner_assignments" to "authenticated";

grant references on table "public"."partner_assignments" to "authenticated";

grant select on table "public"."partner_assignments" to "authenticated";

grant trigger on table "public"."partner_assignments" to "authenticated";

grant truncate on table "public"."partner_assignments" to "authenticated";

grant update on table "public"."partner_assignments" to "authenticated";

grant delete on table "public"."partner_assignments" to "service_role";

grant insert on table "public"."partner_assignments" to "service_role";

grant references on table "public"."partner_assignments" to "service_role";

grant select on table "public"."partner_assignments" to "service_role";

grant trigger on table "public"."partner_assignments" to "service_role";

grant truncate on table "public"."partner_assignments" to "service_role";

grant update on table "public"."partner_assignments" to "service_role";

grant delete on table "public"."partners" to "anon";

grant insert on table "public"."partners" to "anon";

grant references on table "public"."partners" to "anon";

grant select on table "public"."partners" to "anon";

grant trigger on table "public"."partners" to "anon";

grant truncate on table "public"."partners" to "anon";

grant update on table "public"."partners" to "anon";

grant delete on table "public"."partners" to "authenticated";

grant insert on table "public"."partners" to "authenticated";

grant references on table "public"."partners" to "authenticated";

grant select on table "public"."partners" to "authenticated";

grant trigger on table "public"."partners" to "authenticated";

grant truncate on table "public"."partners" to "authenticated";

grant update on table "public"."partners" to "authenticated";

grant delete on table "public"."partners" to "service_role";

grant insert on table "public"."partners" to "service_role";

grant references on table "public"."partners" to "service_role";

grant select on table "public"."partners" to "service_role";

grant trigger on table "public"."partners" to "service_role";

grant truncate on table "public"."partners" to "service_role";

grant update on table "public"."partners" to "service_role";

grant delete on table "public"."process_recordings" to "anon";

grant insert on table "public"."process_recordings" to "anon";

grant references on table "public"."process_recordings" to "anon";

grant select on table "public"."process_recordings" to "anon";

grant trigger on table "public"."process_recordings" to "anon";

grant truncate on table "public"."process_recordings" to "anon";

grant update on table "public"."process_recordings" to "anon";

grant delete on table "public"."process_recordings" to "authenticated";

grant insert on table "public"."process_recordings" to "authenticated";

grant references on table "public"."process_recordings" to "authenticated";

grant select on table "public"."process_recordings" to "authenticated";

grant trigger on table "public"."process_recordings" to "authenticated";

grant truncate on table "public"."process_recordings" to "authenticated";

grant update on table "public"."process_recordings" to "authenticated";

grant delete on table "public"."process_recordings" to "service_role";

grant insert on table "public"."process_recordings" to "service_role";

grant references on table "public"."process_recordings" to "service_role";

grant select on table "public"."process_recordings" to "service_role";

grant trigger on table "public"."process_recordings" to "service_role";

grant truncate on table "public"."process_recordings" to "service_role";

grant update on table "public"."process_recordings" to "service_role";

grant delete on table "public"."public_impact_snapshots" to "anon";

grant insert on table "public"."public_impact_snapshots" to "anon";

grant references on table "public"."public_impact_snapshots" to "anon";

grant select on table "public"."public_impact_snapshots" to "anon";

grant trigger on table "public"."public_impact_snapshots" to "anon";

grant truncate on table "public"."public_impact_snapshots" to "anon";

grant update on table "public"."public_impact_snapshots" to "anon";

grant delete on table "public"."public_impact_snapshots" to "authenticated";

grant insert on table "public"."public_impact_snapshots" to "authenticated";

grant references on table "public"."public_impact_snapshots" to "authenticated";

grant select on table "public"."public_impact_snapshots" to "authenticated";

grant trigger on table "public"."public_impact_snapshots" to "authenticated";

grant truncate on table "public"."public_impact_snapshots" to "authenticated";

grant update on table "public"."public_impact_snapshots" to "authenticated";

grant delete on table "public"."public_impact_snapshots" to "service_role";

grant insert on table "public"."public_impact_snapshots" to "service_role";

grant references on table "public"."public_impact_snapshots" to "service_role";

grant select on table "public"."public_impact_snapshots" to "service_role";

grant trigger on table "public"."public_impact_snapshots" to "service_role";

grant truncate on table "public"."public_impact_snapshots" to "service_role";

grant update on table "public"."public_impact_snapshots" to "service_role";

grant delete on table "public"."residents" to "anon";

grant insert on table "public"."residents" to "anon";

grant references on table "public"."residents" to "anon";

grant select on table "public"."residents" to "anon";

grant trigger on table "public"."residents" to "anon";

grant truncate on table "public"."residents" to "anon";

grant update on table "public"."residents" to "anon";

grant delete on table "public"."residents" to "authenticated";

grant insert on table "public"."residents" to "authenticated";

grant references on table "public"."residents" to "authenticated";

grant select on table "public"."residents" to "authenticated";

grant trigger on table "public"."residents" to "authenticated";

grant truncate on table "public"."residents" to "authenticated";

grant update on table "public"."residents" to "authenticated";

grant delete on table "public"."residents" to "service_role";

grant insert on table "public"."residents" to "service_role";

grant references on table "public"."residents" to "service_role";

grant select on table "public"."residents" to "service_role";

grant trigger on table "public"."residents" to "service_role";

grant truncate on table "public"."residents" to "service_role";

grant update on table "public"."residents" to "service_role";

grant delete on table "public"."safehouse_monthly_metrics" to "anon";

grant insert on table "public"."safehouse_monthly_metrics" to "anon";

grant references on table "public"."safehouse_monthly_metrics" to "anon";

grant select on table "public"."safehouse_monthly_metrics" to "anon";

grant trigger on table "public"."safehouse_monthly_metrics" to "anon";

grant truncate on table "public"."safehouse_monthly_metrics" to "anon";

grant update on table "public"."safehouse_monthly_metrics" to "anon";

grant delete on table "public"."safehouse_monthly_metrics" to "authenticated";

grant insert on table "public"."safehouse_monthly_metrics" to "authenticated";

grant references on table "public"."safehouse_monthly_metrics" to "authenticated";

grant select on table "public"."safehouse_monthly_metrics" to "authenticated";

grant trigger on table "public"."safehouse_monthly_metrics" to "authenticated";

grant truncate on table "public"."safehouse_monthly_metrics" to "authenticated";

grant update on table "public"."safehouse_monthly_metrics" to "authenticated";

grant delete on table "public"."safehouse_monthly_metrics" to "service_role";

grant insert on table "public"."safehouse_monthly_metrics" to "service_role";

grant references on table "public"."safehouse_monthly_metrics" to "service_role";

grant select on table "public"."safehouse_monthly_metrics" to "service_role";

grant trigger on table "public"."safehouse_monthly_metrics" to "service_role";

grant truncate on table "public"."safehouse_monthly_metrics" to "service_role";

grant update on table "public"."safehouse_monthly_metrics" to "service_role";

grant delete on table "public"."safehouses" to "anon";

grant insert on table "public"."safehouses" to "anon";

grant references on table "public"."safehouses" to "anon";

grant select on table "public"."safehouses" to "anon";

grant trigger on table "public"."safehouses" to "anon";

grant truncate on table "public"."safehouses" to "anon";

grant update on table "public"."safehouses" to "anon";

grant delete on table "public"."safehouses" to "authenticated";

grant insert on table "public"."safehouses" to "authenticated";

grant references on table "public"."safehouses" to "authenticated";

grant select on table "public"."safehouses" to "authenticated";

grant trigger on table "public"."safehouses" to "authenticated";

grant truncate on table "public"."safehouses" to "authenticated";

grant update on table "public"."safehouses" to "authenticated";

grant delete on table "public"."safehouses" to "service_role";

grant insert on table "public"."safehouses" to "service_role";

grant references on table "public"."safehouses" to "service_role";

grant select on table "public"."safehouses" to "service_role";

grant trigger on table "public"."safehouses" to "service_role";

grant truncate on table "public"."safehouses" to "service_role";

grant update on table "public"."safehouses" to "service_role";

grant delete on table "public"."social_media_posts" to "anon";

grant insert on table "public"."social_media_posts" to "anon";

grant references on table "public"."social_media_posts" to "anon";

grant select on table "public"."social_media_posts" to "anon";

grant trigger on table "public"."social_media_posts" to "anon";

grant truncate on table "public"."social_media_posts" to "anon";

grant update on table "public"."social_media_posts" to "anon";

grant delete on table "public"."social_media_posts" to "authenticated";

grant insert on table "public"."social_media_posts" to "authenticated";

grant references on table "public"."social_media_posts" to "authenticated";

grant select on table "public"."social_media_posts" to "authenticated";

grant trigger on table "public"."social_media_posts" to "authenticated";

grant truncate on table "public"."social_media_posts" to "authenticated";

grant update on table "public"."social_media_posts" to "authenticated";

grant delete on table "public"."social_media_posts" to "service_role";

grant insert on table "public"."social_media_posts" to "service_role";

grant references on table "public"."social_media_posts" to "service_role";

grant select on table "public"."social_media_posts" to "service_role";

grant trigger on table "public"."social_media_posts" to "service_role";

grant truncate on table "public"."social_media_posts" to "service_role";

grant update on table "public"."social_media_posts" to "service_role";

grant delete on table "public"."supporters" to "anon";

grant insert on table "public"."supporters" to "anon";

grant references on table "public"."supporters" to "anon";

grant select on table "public"."supporters" to "anon";

grant trigger on table "public"."supporters" to "anon";

grant truncate on table "public"."supporters" to "anon";

grant update on table "public"."supporters" to "anon";

grant delete on table "public"."supporters" to "authenticated";

grant insert on table "public"."supporters" to "authenticated";

grant references on table "public"."supporters" to "authenticated";

grant select on table "public"."supporters" to "authenticated";

grant trigger on table "public"."supporters" to "authenticated";

grant truncate on table "public"."supporters" to "authenticated";

grant update on table "public"."supporters" to "authenticated";

grant delete on table "public"."supporters" to "service_role";

grant insert on table "public"."supporters" to "service_role";

grant references on table "public"."supporters" to "service_role";

grant select on table "public"."supporters" to "service_role";

grant trigger on table "public"."supporters" to "service_role";

grant truncate on table "public"."supporters" to "service_role";

grant update on table "public"."supporters" to "service_role";


