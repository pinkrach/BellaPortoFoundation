from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
import math

import numpy as np
import pandas as pd


SERVICE_BUCKETS = ("Caring", "Healing", "Teaching")


def _to_datetime(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce")


def _to_numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def _split_services(series: pd.Series) -> list[str]:
    values: list[str] = []
    for cell in series.fillna("").astype(str):
        for part in cell.split(","):
            token = part.strip()
            if token:
                values.append(token)
    return values


def _sanitize_for_json(value):
    if isinstance(value, dict):
        return {key: _sanitize_for_json(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_sanitize_for_json(item) for item in value]
    if isinstance(value, pd.Timestamp):
        return value.isoformat() if pd.notna(value) else None
    if value is pd.NA or value is None:
        return None
    if isinstance(value, (np.floating, float)):
        numeric = float(value)
        return None if not math.isfinite(numeric) else numeric
    if isinstance(value, (np.integer, int)):
        return int(value)
    try:
        if pd.isna(value):
            return None
    except TypeError:
        pass
    return value


def build_annual_report(
    residents: pd.DataFrame,
    process_recordings: pd.DataFrame,
    intervention_plans: pd.DataFrame,
    home_visitations: pd.DataFrame,
    incident_reports: pd.DataFrame,
    donations: pd.DataFrame,
    allocations: pd.DataFrame,
    monthly_metrics: pd.DataFrame,
) -> dict[str, object]:
    residents_df = residents.copy()
    process_df = process_recordings.copy()
    plans_df = intervention_plans.copy()
    visits_df = home_visitations.copy()
    incidents_df = incident_reports.copy()
    donations_df = donations.copy()
    allocations_df = allocations.copy()
    metrics_df = monthly_metrics.copy()

    residents_served = int(residents_df["resident_id"].nunique()) if "resident_id" in residents_df.columns else 0
    active_residents = int((residents_df.get("case_status", pd.Series(dtype="object")).astype(str).str.lower() == "active").sum())
    completed_reintegrations = int(
        residents_df.get("reintegration_status", pd.Series(dtype="object")).astype(str).str.lower().eq("completed").sum()
    )

    metrics_df["avg_education_progress"] = _to_numeric(metrics_df.get("avg_education_progress", pd.Series(dtype="object")))
    metrics_df["avg_health_score"] = _to_numeric(metrics_df.get("avg_health_score", pd.Series(dtype="object")))
    metrics_df["incident_count"] = _to_numeric(metrics_df.get("incident_count", pd.Series(dtype="object"))).fillna(0)

    avg_education = float(metrics_df["avg_education_progress"].dropna().mean()) if not metrics_df.empty else 0.0
    avg_health = float(metrics_df["avg_health_score"].dropna().mean()) if not metrics_df.empty else 0.0
    total_incidents = int(incidents_df["incident_id"].nunique()) if "incident_id" in incidents_df.columns else 0
    resolved_incidents = int(pd.Series(incidents_df.get("resolved", pd.Series(dtype="object"))).fillna(False).astype(bool).sum())
    incident_resolution_rate = resolved_incidents / total_incidents if total_incidents else 0.0

    donations_df["donation_value"] = _to_numeric(donations_df.get("amount", pd.Series(dtype="object"))).fillna(
        _to_numeric(donations_df.get("estimated_value", pd.Series(dtype="object")))
    )
    allocations_df["amount_allocated"] = _to_numeric(allocations_df.get("amount_allocated", pd.Series(dtype="object"))).fillna(0)

    process_services = Counter(_split_services(process_df.get("interventions_applied", pd.Series(dtype="object"))))
    plan_services = Counter(_split_services(plans_df.get("services_provided", pd.Series(dtype="object"))))
    combined = process_services + plan_services

    service_buckets = []
    for bucket in SERVICE_BUCKETS:
        service_buckets.append(
            {
                "label": bucket,
                "count": int(combined.get(bucket, 0)),
                "detail": {
                    "processSessions": int(process_services.get(bucket, 0)),
                    "interventionPlans": int(plan_services.get(bucket, 0)),
                },
            }
        )

    program_area_counts = (
        allocations_df.groupby("program_area", dropna=False)["allocation_id"].count().sort_values(ascending=False).head(6)
        if not allocations_df.empty and "program_area" in allocations_df.columns
        else pd.Series(dtype="int64")
    )
    beneficiary_counts = [
        {"label": "Residents served", "value": residents_served},
        {"label": "Active residents", "value": active_residents},
        {"label": "Completed reintegrations", "value": completed_reintegrations},
        {"label": "Supporters engaged", "value": int(donations_df.get("supporter_id", pd.Series(dtype="object")).nunique()) if not donations_df.empty else 0},
    ]

    service_counts = [
        {"label": "Process recordings", "value": int(process_df.get("recording_id", pd.Series(dtype="object")).nunique()) if not process_df.empty else 0},
        {"label": "Home visitations", "value": int(visits_df.get("visitation_id", pd.Series(dtype="object")).nunique()) if not visits_df.empty else 0},
        {"label": "Intervention plans", "value": int(plans_df.get("plan_id", pd.Series(dtype="object")).nunique()) if not plans_df.empty else 0},
        {"label": "Allocations made", "value": int(allocations_df.get("allocation_id", pd.Series(dtype="object")).nunique()) if not allocations_df.empty else 0},
    ]

    outcomes = [
        {"label": "Average education progress", "value": round(avg_education, 2), "unit": "%"},
        {"label": "Average health score", "value": round(avg_health, 2), "unit": "score"},
        {"label": "Incident resolution rate", "value": round(incident_resolution_rate * 100, 1), "unit": "%"},
        {"label": "Donation value", "value": round(float(donations_df["donation_value"].fillna(0).sum()), 2), "unit": "currency"},
    ]

    highlights = [
        f"Caring services were recorded {int(combined.get('Caring', 0))} times across counseling and intervention workflows.",
        f"Healing supports averaged a health score of {avg_health:.2f} while {resolved_incidents} incidents were resolved.",
        f"Teaching-related records helped sustain average education progress of {avg_education:.1f}% across the reporting period.",
    ]

    top_program_areas = [str(label) for label in program_area_counts.index.tolist()[:3]]
    narrative_summary = (
        f"The annual accomplishment report highlights {residents_served} residents served, "
        f"{completed_reintegrations} completed reintegrations, and {round(float(donations_df['donation_value'].fillna(0).sum()), 2)} in donation value. "
        f"Top investment areas included {', '.join(top_program_areas) if top_program_areas else 'direct resident support'}, "
        f"while Caring, Healing, and Teaching remained the dominant service themes."
    )

    export_rows = []
    for bucket in service_buckets:
        export_rows.append(
            {
                "section": "service_bucket",
                "label": bucket["label"],
                "count": bucket["count"],
                "process_sessions": bucket["detail"]["processSessions"],
                "intervention_plans": bucket["detail"]["interventionPlans"],
            }
        )
    for outcome in outcomes:
        export_rows.append(
            {
                "section": "outcome",
                "label": outcome["label"],
                "value": outcome["value"],
                "unit": outcome["unit"],
            }
        )

    return {
        "serviceBuckets": service_buckets,
        "beneficiaryCounts": beneficiary_counts,
        "serviceCounts": service_counts,
        "outcomes": outcomes,
        "programAreas": [
            {"label": str(label) if pd.notna(label) else "Unassigned", "value": int(value)}
            for label, value in program_area_counts.items()
        ],
        "highlights": highlights,
        "narrativeSummary": narrative_summary,
        "exportRows": export_rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build annual accomplishment report payload.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    payload = json.loads(Path(args.input).read_text())
    tables = {name: pd.DataFrame(rows) for name, rows in payload.get("tables", {}).items()}
    report = build_annual_report(
        residents=tables.get("residents", pd.DataFrame()),
        process_recordings=tables.get("process_recordings", pd.DataFrame()),
        intervention_plans=tables.get("intervention_plans", pd.DataFrame()),
        home_visitations=tables.get("home_visitations", pd.DataFrame()),
        incident_reports=tables.get("incident_reports", pd.DataFrame()),
        donations=tables.get("donations", pd.DataFrame()),
        allocations=tables.get("donation_allocations", pd.DataFrame()),
        monthly_metrics=tables.get("safehouse_monthly_metrics", pd.DataFrame()),
    )
    Path(args.output).write_text(json.dumps(_sanitize_for_json(report), indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
