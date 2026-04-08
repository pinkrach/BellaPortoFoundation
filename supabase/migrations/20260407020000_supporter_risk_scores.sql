create table if not exists public.supporter_risk_scores (
  supporter_id bigint primary key references public.supporters (supporter_id) on delete cascade,
  risk_probability double precision not null check (risk_probability >= 0 and risk_probability <= 1),
  is_at_risk boolean not null,
  risk_threshold double precision not null default 0.5 check (risk_threshold >= 0 and risk_threshold <= 1),
  risk_reason text,
  model_name text,
  model_version text,
  feature_cutoff_date date,
  scored_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_supporter_risk_scores_is_at_risk
  on public.supporter_risk_scores (is_at_risk);

create index if not exists idx_supporter_risk_scores_scored_at
  on public.supporter_risk_scores (scored_at desc);

create or replace function public.set_supporter_risk_scores_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_supporter_risk_scores_updated_at on public.supporter_risk_scores;
create trigger trg_supporter_risk_scores_updated_at
before update on public.supporter_risk_scores
for each row execute function public.set_supporter_risk_scores_updated_at();
