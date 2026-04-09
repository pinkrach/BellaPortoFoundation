from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd


def _to_datetime(series: pd.Series) -> pd.Series:
    return pd.to_datetime(series, errors="coerce")


def _to_numeric(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce")


def build_allocation_dashboard_data(
    donations: pd.DataFrame,
    allocations: pd.DataFrame,
    monthly_metrics: pd.DataFrame,
) -> dict[str, pd.DataFrame]:
    donations_df = donations.copy()
    allocations_df = allocations.copy()
    metrics_df = monthly_metrics.copy()

    donations_df["donation_date"] = _to_datetime(donations_df.get("donation_date", pd.Series(dtype="object")))
    donations_df["donation_value"] = _to_numeric(donations_df.get("amount", pd.Series(dtype="object"))).fillna(
        _to_numeric(donations_df.get("estimated_value", pd.Series(dtype="object")))
    )
    donations_df["month"] = donations_df["donation_date"].dt.to_period("M").dt.to_timestamp()

    allocations_df["allocation_date"] = _to_datetime(allocations_df.get("allocation_date", pd.Series(dtype="object")))
    allocations_df["amount_allocated"] = _to_numeric(allocations_df.get("amount_allocated", pd.Series(dtype="object"))).fillna(0.0)
    allocations_df["month"] = allocations_df["allocation_date"].dt.to_period("M").dt.to_timestamp()

    metrics_df["month_start"] = _to_datetime(metrics_df.get("month_start", pd.Series(dtype="object")))
    metrics_df["avg_education_progress"] = _to_numeric(metrics_df.get("avg_education_progress", pd.Series(dtype="object")))
    metrics_df["avg_health_score"] = _to_numeric(metrics_df.get("avg_health_score", pd.Series(dtype="object")))
    metrics_df["incident_count"] = _to_numeric(metrics_df.get("incident_count", pd.Series(dtype="object"))).fillna(0.0)
    metrics_df["outcome_index"] = (
        metrics_df["avg_education_progress"].fillna(metrics_df["avg_education_progress"].median()) / 10.0
        + metrics_df["avg_health_score"].fillna(metrics_df["avg_health_score"].median()) * 4.0
        - metrics_df["incident_count"] * 2.0
    )

    donation_trends = (
        donations_df.dropna(subset=["month"])
        .groupby("month", as_index=False)
        .agg(
            total_donations=("donation_value", "sum"),
            donation_count=("donation_id", "count"),
        )
        .sort_values("month")
    )
    if not donation_trends.empty:
        donation_trends["label"] = donation_trends["month"].dt.strftime("%b %Y")
        donation_trends["total_donations"] = donation_trends["total_donations"].round(2)

    allocation_mix = (
        allocations_df.dropna(subset=["program_area"])
        .groupby("program_area", as_index=False)
        .agg(
            amount=("amount_allocated", "sum"),
            allocations=("allocation_id", "count"),
            safehouses=("safehouse_id", "nunique"),
        )
        .sort_values("amount", ascending=False)
    )
    if not allocation_mix.empty:
        allocation_mix["amount"] = allocation_mix["amount"].round(2)

    safehouse_outcomes = (
        metrics_df.dropna(subset=["month_start"])
        .sort_values(["safehouse_id", "month_start"])
        .groupby("safehouse_id", as_index=False)
        .tail(1)[["safehouse_id", "month_start", "outcome_index", "avg_education_progress", "avg_health_score", "incident_count"]]
    )
    safehouse_allocation = (
        allocations_df.groupby("safehouse_id", as_index=False)
        .agg(allocation_total=("amount_allocated", "sum"))
        .merge(safehouse_outcomes, on="safehouse_id", how="left")
        .sort_values("allocation_total", ascending=False)
    )
    if not safehouse_allocation.empty:
        safehouse_allocation["allocation_total"] = safehouse_allocation["allocation_total"].round(2)
        safehouse_allocation["outcome_index"] = safehouse_allocation["outcome_index"].round(2)

    return {
        "donation_trends": donation_trends.reset_index(drop=True),
        "allocation_mix": allocation_mix.reset_index(drop=True),
        "safehouse_allocation": safehouse_allocation.reset_index(drop=True),
    }


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
    parser = argparse.ArgumentParser(description="Build donation allocation dashboard payload.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    payload = json.loads(Path(args.input).read_text())
    tables = {name: pd.DataFrame(rows) for name, rows in payload.get("tables", {}).items()}
    result = build_allocation_dashboard_data(
        donations=tables.get("donations", pd.DataFrame()),
        allocations=tables.get("donation_allocations", pd.DataFrame()),
        monthly_metrics=tables.get("safehouse_monthly_metrics", pd.DataFrame()),
    )
    serializable = {key: value.to_dict(orient="records") for key, value in result.items()}
    Path(args.output).write_text(json.dumps(_sanitize_for_json(serializable), indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
