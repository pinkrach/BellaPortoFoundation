from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
import math
from pathlib import Path

import numpy as np
import pandas as pd


def _to_datetime(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce")


def _to_numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def _safe_float(value: object, default: float = 0.0) -> float:
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


@dataclass
class DonorLapseArtifacts:
    supporters: pd.DataFrame
    monthly_retention: pd.DataFrame
    segment_summary: pd.DataFrame


def build_donor_lapse_artifacts(
    supporters: pd.DataFrame,
    donations: pd.DataFrame,
    as_of: pd.Timestamp | None = None,
) -> DonorLapseArtifacts:
    supporters_df = supporters.copy()
    donations_df = donations.copy()

    if supporters_df.empty:
        empty = pd.DataFrame()
        return DonorLapseArtifacts(empty, empty, empty)

    donations_df["donation_date"] = _to_datetime(donations_df.get("donation_date", pd.Series(dtype="object")))
    donations_df["gift_value"] = _to_numeric(donations_df.get("amount", pd.Series(dtype="object"))).fillna(
        _to_numeric(donations_df.get("estimated_value", pd.Series(dtype="object")))
    )
    donations_df = donations_df.dropna(subset=["donation_date"]).copy()

    if as_of is None:
        as_of = donations_df["donation_date"].max() if not donations_df.empty else pd.Timestamp.utcnow().normalize()
    if pd.isna(as_of):
        as_of = pd.Timestamp.utcnow().normalize()

    supporter_rows: list[dict[str, object]] = []

    for _, supporter in supporters_df.iterrows():
        supporter_id = supporter.get("supporter_id")
        supporter_events = donations_df[donations_df.get("supporter_id") == supporter_id].sort_values("donation_date").copy()

        if supporter_events.empty:
            supporter_rows.append(
                {
                    "supporter_id": supporter_id,
                    "supporter_name": supporter.get("display_name") or supporter.get("organization_name") or "Unknown supporter",
                    "supporter_type": supporter.get("supporter_type"),
                    "status": supporter.get("status"),
                    "donation_count": 0,
                    "lifetime_value": 0.0,
                    "days_since_last_donation": None,
                    "median_gap_days": None,
                    "recency_ratio": None,
                    "recurring_share": 0.0,
                    "campaign_diversity": 0,
                    "lapse_score": 0.95,
                    "lapse_band": "High",
                    "upgrade_hint": "Reactivation campaign",
                }
            )
            continue

        supporter_events["gift_value"] = supporter_events["gift_value"].fillna(0.0)
        donation_dates = supporter_events["donation_date"].dropna().sort_values()
        intervals = donation_dates.diff().dt.days.dropna()
        median_gap = float(intervals.median()) if not intervals.empty else np.nan
        mean_gap = float(intervals.mean()) if not intervals.empty else np.nan
        days_since_last = int((as_of - donation_dates.iloc[-1]).days)
        baseline_gap = median_gap if np.isfinite(median_gap) and median_gap > 0 else mean_gap
        if not np.isfinite(baseline_gap) or baseline_gap <= 0:
            baseline_gap = max(days_since_last, 30)
        recency_ratio = days_since_last / baseline_gap if baseline_gap else np.nan

        recent_values = supporter_events["gift_value"].tail(2)
        avg_recent = float(recent_values.mean()) if not recent_values.empty else 0.0
        avg_lifetime = float(supporter_events["gift_value"].mean()) if not supporter_events.empty else 0.0
        monetary_momentum = avg_recent - avg_lifetime
        recurring_share = float(pd.Series(supporter_events.get("is_recurring", pd.Series(dtype="object"))).fillna(False).astype(int).mean())

        lapse_score = 0.45
        lapse_score += min(max(_safe_float(recency_ratio, 1.0) - 1.0, 0.0), 2.5) * 0.2
        lapse_score += 0.15 if supporter_events["gift_value"].sum() <= supporter_events["gift_value"].median() * 3 else 0.0
        lapse_score -= min(max(monetary_momentum, 0.0), max(avg_lifetime, 1.0)) / max(avg_lifetime * 4, 1.0)
        lapse_score -= recurring_share * 0.2
        lapse_score = float(np.clip(lapse_score, 0.02, 0.98))

        if lapse_score >= 0.7:
            band = "High"
        elif lapse_score >= 0.4:
            band = "Medium"
        else:
            band = "Low"

        upgrade_hint = "Upgrade ask" if monetary_momentum > 0 and lapse_score < 0.55 else "Stewardship touch"
        if band == "High":
            upgrade_hint = "Reactivation campaign"

        supporter_rows.append(
            {
                "supporter_id": supporter_id,
                "supporter_name": supporter.get("display_name") or supporter.get("organization_name") or "Unknown supporter",
                "supporter_type": supporter.get("supporter_type"),
                "status": supporter.get("status"),
                "donation_count": int(len(supporter_events)),
                "lifetime_value": round(float(supporter_events["gift_value"].sum()), 2),
                "days_since_last_donation": days_since_last,
                "median_gap_days": round(_safe_float(median_gap, np.nan), 2) if np.isfinite(median_gap) else None,
                "recency_ratio": round(_safe_float(recency_ratio, np.nan), 2) if np.isfinite(recency_ratio) else None,
                "recurring_share": round(recurring_share, 4),
                "campaign_diversity": int(pd.Series(supporter_events.get("campaign_name")).dropna().nunique()),
                "last_gift_value": round(float(supporter_events["gift_value"].iloc[-1]), 2),
                "avg_gift_value": round(avg_lifetime, 2),
                "lapse_score": round(lapse_score, 4),
                "lapse_band": band,
                "upgrade_hint": upgrade_hint,
            }
        )

    supporter_scores = pd.DataFrame(supporter_rows).sort_values(
        ["lapse_score", "lifetime_value"],
        ascending=[False, False],
    )

    monthly = donations_df.copy()
    if monthly.empty:
        monthly_retention = pd.DataFrame(columns=["month", "donors", "repeat_donors", "retention_rate"])
    else:
        monthly["month"] = monthly["donation_date"].dt.to_period("M").dt.to_timestamp()
        donor_month = monthly.groupby(["month", "supporter_id"]).size().reset_index(name="gift_count")
        months = sorted(donor_month["month"].dropna().unique())
        rows = []
        prior_supporters: set[object] = set()
        for month in months:
            current_supporters = set(donor_month.loc[donor_month["month"] == month, "supporter_id"].tolist())
            repeat_donors = len(current_supporters & prior_supporters) if prior_supporters else 0
            retention_rate = repeat_donors / len(prior_supporters) if prior_supporters else np.nan
            rows.append(
                {
                    "month": str(month)[:10],
                    "donors": len(current_supporters),
                    "repeat_donors": repeat_donors,
                    "retention_rate": round(float(retention_rate), 4) if pd.notna(retention_rate) else None,
                }
            )
            prior_supporters = current_supporters
        monthly_retention = pd.DataFrame(rows)

    segment_summary = (
        supporter_scores.groupby("supporter_type", dropna=False)
        .agg(
            supporters=("supporter_id", "count"),
            avg_lapse_score=("lapse_score", "mean"),
            high_risk_supporters=("lapse_band", lambda values: int((pd.Series(values) == "High").sum())),
            avg_lifetime_value=("lifetime_value", "mean"),
        )
        .reset_index()
        .rename(columns={"supporter_type": "segment"})
    )
    if not segment_summary.empty:
        segment_summary["avg_lapse_score"] = segment_summary["avg_lapse_score"].round(4)
        segment_summary["avg_lifetime_value"] = segment_summary["avg_lifetime_value"].round(2)

    return DonorLapseArtifacts(
        supporters=supporter_scores.reset_index(drop=True),
        monthly_retention=monthly_retention.reset_index(drop=True),
        segment_summary=segment_summary.reset_index(drop=True),
    )


def donor_lapse_export_rows(artifacts: DonorLapseArtifacts, limit: int = 25) -> list[dict[str, object]]:
    if artifacts.supporters.empty:
        return []
    export_df = artifacts.supporters.head(limit).copy()
    return export_df.to_dict(orient="records")


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


def main() -> None:
    parser = argparse.ArgumentParser(description="Build donor lapse risk payload.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    payload = json.loads(Path(args.input).read_text())
    tables = {name: pd.DataFrame(rows) for name, rows in payload.get("tables", {}).items()}
    as_of = pd.to_datetime(payload.get("asOf"), errors="coerce") if payload.get("asOf") else None
    artifacts = build_donor_lapse_artifacts(
        supporters=tables.get("supporters", pd.DataFrame()),
        donations=tables.get("donations", pd.DataFrame()),
        as_of=as_of,
    )
    result = {
        "supporters": artifacts.supporters.to_dict(orient="records"),
        "monthlyRetention": artifacts.monthly_retention.to_dict(orient="records"),
        "segmentSummary": artifacts.segment_summary.to_dict(orient="records"),
    }
    Path(args.output).write_text(json.dumps(_sanitize_for_json(result), indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
