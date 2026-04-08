# Supporter Risk Nightly Timer

This Azure Function runs the supporter risk scoring script every day at 2:00 AM UTC.

## Schedule

- NCRONTAB: `0 0 2 * * *`
- Meaning: every day at `02:00:00` UTC

## What it runs

- Script: `ml-pipelines/supporter_risk_scoring.py`
- Artifacts directory (default): `ml-pipelines/model_artifacts`
- Destination table: `public.supporter_risk_scores`

## Required app settings

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (recommended) or `SUPABASE_ANON_KEY`
- `RISK_MODEL_ARTIFACT_DIR` (optional override)
- `SUPPORTER_RISK_TABLE` (optional, defaults to `supporter_risk_scores`)

## Deploy notes

1. Make sure model artifacts are available at the configured artifact directory:
   - `best_retention_model.joblib`
   - `best_retention_model_meta.json`
2. Apply Supabase migration that creates `supporter_risk_scores`.
3. Deploy this function app and confirm logs after 2 AM UTC or run manually from Azure portal.
