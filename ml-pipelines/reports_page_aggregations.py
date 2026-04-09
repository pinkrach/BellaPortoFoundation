from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from annual_accomplishment_report_builder import build_annual_report
from donation_allocation_dashboard_data import build_allocation_dashboard_data
from donor_lapse_risk import build_donor_lapse_artifacts, donor_lapse_export_rows


def _series(df: pd.DataFrame, name: str) -> pd.Series:
    if name in df.columns:
        return df[name]
    return pd.Series([np.nan] * len(df), index=df.index)


def _to_datetime(df: pd.DataFrame, column: str) -> None:
    if column in df.columns:
        df[column] = pd.to_datetime(df[column], errors="coerce")


def _to_numeric(df: pd.DataFrame, column: str) -> None:
    if column in df.columns:
        df[column] = pd.to_numeric(df[column], errors="coerce")


def _money_series(df: pd.DataFrame) -> pd.Series:
    amount = pd.to_numeric(_series(df, "amount"), errors="coerce")
    estimated = pd.to_numeric(_series(df, "estimated_value"), errors="coerce")
    return amount.fillna(estimated).fillna(0.0)


def _safe_round(value: object, digits: int = 2) -> float | None:
    try:
        num = float(value)
    except (TypeError, ValueError):
        return None
    if np.isnan(num):
        return None
    return round(num, digits)


def _sanitize_for_json(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _sanitize_for_json(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_sanitize_for_json(item) for item in value]
    if isinstance(value, tuple):
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


def _latest_by(df: pd.DataFrame, id_col: str, date_col: str) -> pd.DataFrame:
    if df.empty or id_col not in df.columns or date_col not in df.columns:
        return df.iloc[0:0].copy()
    ordered = df.sort_values([id_col, date_col]).copy()
    return ordered.groupby(id_col, as_index=False).tail(1)


def _monthly_sum(df: pd.DataFrame, date_col: str, value_col: str, label: str) -> pd.DataFrame:
    if df.empty or date_col not in df.columns or value_col not in df.columns:
        return pd.DataFrame(columns=["month", label, "label"])
    grouped = (
        df.dropna(subset=[date_col])
        .assign(month=df[date_col].dt.to_period("M").dt.to_timestamp())
        .groupby("month", as_index=False)[value_col]
        .sum()
        .sort_values("month")
    )
    grouped["label"] = grouped["month"].dt.strftime("%b %Y")
    grouped[value_col] = grouped[value_col].round(2)
    return grouped.rename(columns={value_col: label})


def _monthly_mean(df: pd.DataFrame, date_col: str, value_col: str, label: str) -> pd.DataFrame:
    if df.empty or date_col not in df.columns or value_col not in df.columns:
        return pd.DataFrame(columns=["month", label, "label"])
    grouped = (
        df.dropna(subset=[date_col])
        .assign(month=df[date_col].dt.to_period("M").dt.to_timestamp())
        .groupby("month", as_index=False)[value_col]
        .mean()
        .sort_values("month")
    )
    grouped["label"] = grouped["month"].dt.strftime("%b %Y")
    grouped[value_col] = grouped[value_col].round(2)
    return grouped.rename(columns={value_col: label})


def _load_json(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        return None


def _parse_payload(input_path: Path) -> tuple[dict[str, pd.DataFrame], dict[str, Any]]:
    payload = json.loads(input_path.read_text())
    tables_raw = payload.get("tables", {})
    tables = {name: pd.DataFrame(rows) for name, rows in tables_raw.items()}
    filters = payload.get("filters", {})
    return tables, filters


def _apply_filters(tables: dict[str, pd.DataFrame], filters: dict[str, Any]) -> dict[str, pd.DataFrame]:
    safehouse_id = filters.get("safehouseId")
    campaign_name = filters.get("campaignName")
    date_from = pd.to_datetime(filters.get("dateFrom"), errors="coerce") if filters.get("dateFrom") else None
    date_to = pd.to_datetime(filters.get("dateTo"), errors="coerce") if filters.get("dateTo") else None

    date_columns = {
        "donations": "donation_date",
        "donation_allocations": "allocation_date",
        "education_records": "record_date",
        "health_wellbeing_records": "record_date",
        "home_visitations": "visit_date",
        "incident_reports": "incident_date",
        "intervention_plans": "created_at",
        "process_recordings": "session_date",
        "public_impact_snapshots": "snapshot_date",
        "safehouse_monthly_metrics": "month_start",
        "social_media_posts": "created_at",
    }

    working = {name: original.copy() for name, original in tables.items()}

    filtered: dict[str, pd.DataFrame] = {}
    for name, df in working.items():
        if name in date_columns:
            _to_datetime(df, date_columns[name])
            date_col = date_columns[name]
            if date_from is not None and date_col in df.columns:
                df = df[df[date_col] >= date_from]
            if date_to is not None and date_col in df.columns:
                df = df[df[date_col] <= date_to]

        if campaign_name not in (None, "", "all") and "campaign_name" in df.columns:
            df = df[df["campaign_name"].fillna("").astype(str) == str(campaign_name)]

        filtered[name] = df.reset_index(drop=True)

    if safehouse_id not in (None, "", "all"):
        safehouse_key = str(safehouse_id)

        if "safehouses" in filtered and "safehouse_id" in filtered["safehouses"].columns:
            filtered["safehouses"] = filtered["safehouses"][filtered["safehouses"]["safehouse_id"].astype(str) == safehouse_key].reset_index(drop=True)

        if "residents" in filtered and "safehouse_id" in filtered["residents"].columns:
            filtered["residents"] = filtered["residents"][filtered["residents"]["safehouse_id"].astype(str) == safehouse_key].reset_index(drop=True)
            resident_ids = set(filtered["residents"]["resident_id"].tolist())
        else:
            resident_ids = set()

        for resident_table in [
            "education_records",
            "health_wellbeing_records",
            "home_visitations",
            "incident_reports",
            "intervention_plans",
            "process_recordings",
        ]:
            if resident_table in filtered and "resident_id" in filtered[resident_table].columns and resident_ids:
                filtered[resident_table] = filtered[resident_table][filtered[resident_table]["resident_id"].isin(resident_ids)].reset_index(drop=True)
            elif resident_table in filtered and "resident_id" in filtered[resident_table].columns:
                filtered[resident_table] = filtered[resident_table].iloc[0:0].copy()

        if "safehouse_monthly_metrics" in filtered and "safehouse_id" in filtered["safehouse_monthly_metrics"].columns:
            filtered["safehouse_monthly_metrics"] = filtered["safehouse_monthly_metrics"][
                filtered["safehouse_monthly_metrics"]["safehouse_id"].astype(str) == safehouse_key
            ].reset_index(drop=True)

        donation_ids_for_safehouse: set[Any] = set()
        if "donation_allocations" in filtered and "safehouse_id" in filtered["donation_allocations"].columns:
            filtered["donation_allocations"] = filtered["donation_allocations"][
                filtered["donation_allocations"]["safehouse_id"].astype(str) == safehouse_key
            ].reset_index(drop=True)
            if "donation_id" in filtered["donation_allocations"].columns:
                donation_ids_for_safehouse = set(filtered["donation_allocations"]["donation_id"].tolist())

        if "donations" in filtered and "donation_id" in filtered["donations"].columns:
            if donation_ids_for_safehouse:
                filtered["donations"] = filtered["donations"][filtered["donations"]["donation_id"].isin(donation_ids_for_safehouse)].reset_index(drop=True)
            else:
                filtered["donations"] = filtered["donations"].iloc[0:0].copy()

        if "supporters" in filtered and "supporter_id" in filtered["supporters"].columns and "donations" in filtered:
            supporter_ids = set(filtered["donations"].get("supporter_id", pd.Series(dtype="object")).dropna().tolist())
            if supporter_ids:
                filtered["supporters"] = filtered["supporters"][filtered["supporters"]["supporter_id"].isin(supporter_ids)].reset_index(drop=True)
            else:
                filtered["supporters"] = filtered["supporters"].iloc[0:0].copy()

    if campaign_name not in (None, "", "all") and "donations" in filtered and "donation_allocations" in filtered:
        donation_ids = set(filtered["donations"].get("donation_id", pd.Series(dtype="object")).dropna().tolist())
        if "donation_id" in filtered["donation_allocations"].columns:
            filtered["donation_allocations"] = filtered["donation_allocations"][filtered["donation_allocations"]["donation_id"].isin(donation_ids)].reset_index(drop=True)

    return filtered


def _safehouse_name_map(safehouses: pd.DataFrame) -> dict[Any, str]:
    if safehouses.empty:
        return {}
    return {
        row.get("safehouse_id"): row.get("name") or row.get("safehouse_code") or f"Safehouse {row.get('safehouse_id')}"
        for _, row in safehouses.iterrows()
    }


def _build_summary(tables: dict[str, pd.DataFrame], filters: dict[str, Any], artifact_dir: Path) -> dict[str, Any]:
    residents = tables.get("residents", pd.DataFrame()).copy()
    education = tables.get("education_records", pd.DataFrame()).copy()
    health = tables.get("health_wellbeing_records", pd.DataFrame()).copy()
    visits = tables.get("home_visitations", pd.DataFrame()).copy()
    incidents = tables.get("incident_reports", pd.DataFrame()).copy()
    interventions = tables.get("intervention_plans", pd.DataFrame()).copy()
    process = tables.get("process_recordings", pd.DataFrame()).copy()
    safehouses = tables.get("safehouses", pd.DataFrame()).copy()
    monthly_metrics = tables.get("safehouse_monthly_metrics", pd.DataFrame()).copy()
    supporters = tables.get("supporters", pd.DataFrame()).copy()
    donations = tables.get("donations", pd.DataFrame()).copy()
    allocations = tables.get("donation_allocations", pd.DataFrame()).copy()
    social_posts = tables.get("social_media_posts", pd.DataFrame()).copy()
    snapshots = tables.get("public_impact_snapshots", pd.DataFrame()).copy()
    partner_assignments = tables.get("partner_assignments", pd.DataFrame()).copy()

    for frame, column in [
        (education, "record_date"),
        (health, "record_date"),
        (visits, "visit_date"),
        (incidents, "incident_date"),
        (interventions, "created_at"),
        (process, "session_date"),
        (donations, "donation_date"),
        (allocations, "allocation_date"),
        (social_posts, "created_at"),
        (snapshots, "snapshot_date"),
        (monthly_metrics, "month_start"),
    ]:
        _to_datetime(frame, column)

    for frame, column in [
        (education, "progress_percent"),
        (education, "attendance_rate"),
        (health, "general_health_score"),
        (monthly_metrics, "active_residents"),
        (monthly_metrics, "avg_education_progress"),
        (monthly_metrics, "avg_health_score"),
        (monthly_metrics, "incident_count"),
        (monthly_metrics, "process_recording_count"),
        (monthly_metrics, "home_visitation_count"),
        (safehouses, "capacity_girls"),
        (safehouses, "capacity_staff"),
        (donations, "amount"),
        (donations, "estimated_value"),
        (allocations, "amount_allocated"),
        (social_posts, "donation_referrals"),
        (social_posts, "estimated_donation_value_php"),
        (social_posts, "reach"),
        (social_posts, "engagement_rate"),
    ]:
        _to_numeric(frame, column)

    donations["donation_value"] = _money_series(donations)
    safehouse_map = _safehouse_name_map(safehouses)
    as_of_candidates = []
    for df, column in [
        (donations, "donation_date"),
        (monthly_metrics, "month_start"),
        (incidents, "incident_date"),
        (social_posts, "created_at"),
        (snapshots, "snapshot_date"),
    ]:
        if column in df.columns and not df.empty:
            as_of_candidates.append(df[column].max())
    as_of = max([value for value in as_of_candidates if pd.notna(value)], default=pd.Timestamp.utcnow().normalize())
    filter_date_to = pd.to_datetime(filters.get("dateTo"), errors="coerce") if filters.get("dateTo") else pd.NaT
    latest_donation_date = donations["donation_date"].dropna().max() if "donation_date" in donations.columns and not donations.empty else pd.NaT
    reporting_year = (
        int(filter_date_to.year) if pd.notna(filter_date_to)
        else int(latest_donation_date.year) if pd.notna(latest_donation_date)
        else int(as_of.year)
    )
    donations_ytd = float(donations.loc[donations["donation_date"].dt.year == reporting_year, "donation_value"].sum()) if not donations.empty else 0.0
    if donations_ytd == 0 and not donations.empty:
        donations_ytd = float(donations["donation_value"].sum())

    active_residents_df = residents[residents.get("case_status", pd.Series(dtype="object")).astype(str).str.lower() == "active"].copy()
    latest_education = _latest_by(education, "resident_id", "record_date")
    latest_health = _latest_by(health, "resident_id", "record_date")

    latest_metrics = (
        monthly_metrics.sort_values(["safehouse_id", "month_start"]).groupby("safehouse_id", as_index=False).tail(1)
        if not monthly_metrics.empty
        else monthly_metrics
    )
    latest_metrics["safehouseName"] = latest_metrics.get("safehouse_id", pd.Series(dtype="object")).map(safehouse_map)
    latest_metrics["capacity"] = latest_metrics.get("safehouse_id", pd.Series(dtype="object")).map(
        safehouses.set_index("safehouse_id")["capacity_girls"].to_dict() if not safehouses.empty else {}
    )
    latest_metrics["staffCapacity"] = latest_metrics.get("safehouse_id", pd.Series(dtype="object")).map(
        safehouses.set_index("safehouse_id")["capacity_staff"].to_dict() if not safehouses.empty else {}
    )
    latest_metrics["occupancyRatio"] = (
        latest_metrics["active_residents"] / latest_metrics["capacity"].replace({0: np.nan})
        if "active_residents" in latest_metrics.columns
        else np.nan
    )

    latest_education_mean = float(latest_education.get("progress_percent", pd.Series(dtype="float64")).dropna().mean()) if not latest_education.empty else 0.0
    latest_health_mean = float(latest_health.get("general_health_score", pd.Series(dtype="float64")).dropna().mean()) if not latest_health.empty else 0.0
    reintegration_success_rate = float(
        residents.get("reintegration_status", pd.Series(dtype="object")).astype(str).str.lower().eq("completed").mean()
    ) if not residents.empty else 0.0

    public_impact_summary = _load_json(artifact_dir / "public_impact_summary.json")
    social_dashboard_summary = _load_json(artifact_dir / "social_dashboard_summary.json")
    social_community_summary = _load_json(artifact_dir / "social_community_summary.json")
    resident_risk_summary = _load_json(artifact_dir / "resident_risk_summary.json")

    if resident_risk_summary and resident_risk_summary.get("highRiskResidents"):
        at_risk_residents = len(resident_risk_summary["highRiskResidents"])
    else:
        at_risk_residents = int(
            residents.get("current_risk_level", pd.Series(dtype="object")).astype(str).str.lower().isin(["high", "critical"]).sum()
        )

    active_campaigns = int(
        pd.concat(
            [
                donations.get("campaign_name", pd.Series(dtype="object")),
                social_posts.get("campaign_name", pd.Series(dtype="object")),
            ],
            ignore_index=True,
        ).dropna().replace("", np.nan).dropna().nunique()
    )

    kpis = [
        {
            "key": "donationsYtd",
            "label": "Total donations YTD",
            "value": round(donations_ytd, 2),
            "detail": "Donation value in the current reporting scope.",
            "unit": "currency",
        },
        {
            "key": "activeResidents",
            "label": "Active residents",
            "value": int(len(active_residents_df)),
            "detail": "Current active resident caseload.",
        },
        {
            "key": "reintegrationSuccessRate",
            "label": "Reintegration success rate",
            "value": round(reintegration_success_rate * 100, 1),
            "detail": "Residents with completed reintegration status.",
            "unit": "%",
        },
        {
            "key": "avgEducationProgress",
            "label": "Avg education progress",
            "value": round(latest_education_mean, 1),
            "detail": "Latest education progress across residents.",
            "unit": "%",
        },
        {
            "key": "avgHealthScore",
            "label": "Avg health score",
            "value": round(latest_health_mean, 2),
            "detail": "Latest resident health and wellbeing score.",
            "unit": "score",
        },
        {
            "key": "activeSafehouses",
            "label": "Active safehouses",
            "value": int(safehouses.get("status", pd.Series(dtype="object")).astype(str).str.lower().eq("active").sum()),
            "detail": "Safehouses currently marked active.",
        },
        {
            "key": "activeCampaigns",
            "label": "Active campaigns",
            "value": active_campaigns,
            "detail": "Distinct campaigns in filtered donation and outreach data.",
        },
        {
            "key": "atRiskResidents",
            "label": "At-risk residents",
            "value": at_risk_residents,
            "detail": "High-risk residents from ML or current risk labels.",
        },
    ]

    donor_lapse = build_donor_lapse_artifacts(supporters, donations, as_of=as_of)
    high_risk_supporters = donor_lapse.supporters[donor_lapse.supporters["lapse_band"].astype(str).str.lower() == "high"].copy() if not donor_lapse.supporters.empty else donor_lapse.supporters
    lapse_risk_rows = (high_risk_supporters if not high_risk_supporters.empty else donor_lapse.supporters).head(10)
    allocation_dashboard = build_allocation_dashboard_data(donations, allocations, monthly_metrics)

    donation_trends = _monthly_sum(donations, "donation_date", "donation_value", "value")
    campaign_performance = (
        donations.dropna(subset=["campaign_name"])
        .assign(month=donations["donation_date"].dt.to_period("M").dt.to_timestamp())
        .groupby(["campaign_name", "month"], as_index=False)
        .agg(
            donationValue=("donation_value", "sum"),
            donations=("donation_id", "count"),
        )
        .sort_values(["campaign_name", "month"])
    )
    if not campaign_performance.empty:
        campaign_performance["forecastNextValue"] = (
            campaign_performance.groupby("campaign_name")["donationValue"].transform(lambda values: values.rolling(3, min_periods=1).mean())
        ).round(2)
        campaign_performance["label"] = campaign_performance["month"].dt.strftime("%b %Y")

    top_upgrade = (
        donations.sort_values(["supporter_id", "donation_date"])
        .groupby("supporter_id")
        .agg(
            supporterName=("supporter_id", lambda ids: ids.iloc[0]),
            donationCount=("donation_id", "count"),
            avgDonationValue=("donation_value", "mean"),
            latestDonationValue=("donation_value", "last"),
        )
        .reset_index()
    )
    if not top_upgrade.empty:
        name_lookup = supporters.set_index("supporter_id").get("display_name", pd.Series(dtype="object")).to_dict() if not supporters.empty else {}
        top_upgrade["supporterName"] = top_upgrade["supporter_id"].map(name_lookup).fillna("Unknown supporter")
        top_upgrade["upgradeScore"] = ((top_upgrade["latestDonationValue"] / top_upgrade["avgDonationValue"].replace({0: np.nan})) - 1).fillna(0)
        top_upgrade["upgradeScore"] = top_upgrade["upgradeScore"].clip(lower=-1, upper=3)
        top_upgrade = top_upgrade.sort_values("upgradeScore", ascending=False).head(10)
        top_upgrade["avgDonationValue"] = top_upgrade["avgDonationValue"].round(2)
        top_upgrade["latestDonationValue"] = top_upgrade["latestDonationValue"].round(2)
        top_upgrade["upgradeScore"] = top_upgrade["upgradeScore"].round(2)

    education_trend = _monthly_mean(education, "record_date", "progress_percent", "value")
    health_trend = _monthly_mean(health, "record_date", "general_health_score", "value")

    process_monthly = process.copy()
    if not process_monthly.empty:
        process_monthly["month"] = process_monthly["session_date"].dt.to_period("M").dt.to_timestamp()
        process_progress = (
            process_monthly.groupby("month", as_index=False)
            .agg(
                progressRate=("progress_noted", lambda values: float(pd.Series(values).fillna(False).astype(int).mean())),
                concernRate=("concerns_flagged", lambda values: float(pd.Series(values).fillna(False).astype(int).mean())),
                sessions=("recording_id", "count"),
            )
            .sort_values("month")
        )
        process_progress["label"] = process_progress["month"].dt.strftime("%b %Y")
        process_progress["progressRate"] = (process_progress["progressRate"] * 100).round(1)
        process_progress["concernRate"] = (process_progress["concernRate"] * 100).round(1)
    else:
        process_progress = pd.DataFrame(columns=["month", "progressRate", "concernRate", "sessions", "label"])

    visit_trend = visits.copy()
    if not visit_trend.empty:
        visit_trend["month"] = visit_trend["visit_date"].dt.to_period("M").dt.to_timestamp()
        visit_trend = (
            visit_trend.groupby("month", as_index=False)
            .agg(
                favorableRate=("visit_outcome", lambda values: float((pd.Series(values) == "Favorable").mean())),
                followupRate=("follow_up_needed", lambda values: float(pd.Series(values).fillna(False).astype(int).mean())),
                visitCount=("visitation_id", "count"),
            )
            .sort_values("month")
        )
        visit_trend["label"] = visit_trend["month"].dt.strftime("%b %Y")
        visit_trend["favorableRate"] = (visit_trend["favorableRate"] * 100).round(1)
        visit_trend["followupRate"] = (visit_trend["followupRate"] * 100).round(1)
    else:
        visit_trend = pd.DataFrame(columns=["month", "favorableRate", "followupRate", "visitCount", "label"])

    incident_trend = incidents.copy()
    if not incident_trend.empty:
        incident_trend["month"] = incident_trend["incident_date"].dt.to_period("M").dt.to_timestamp()
        incident_trend = (
            incident_trend.groupby("month", as_index=False)
            .agg(
                incidentCount=("incident_id", "count"),
                unresolvedCount=("resolved", lambda values: int((~pd.Series(values).fillna(False)).sum())),
            )
            .sort_values("month")
        )
        incident_trend["label"] = incident_trend["month"].dt.strftime("%b %Y")
    else:
        incident_trend = pd.DataFrame(columns=["month", "incidentCount", "unresolvedCount", "label"])

    risk_distribution = (
        residents.get("current_risk_level", pd.Series(dtype="object"))
        .fillna("Unknown")
        .value_counts()
        .rename_axis("label")
        .reset_index(name="value")
    )

    latest_metrics = latest_metrics.fillna({"safehouseName": "Unknown safehouse"})
    safehouse_occupancy = latest_metrics[["safehouseName", "active_residents", "capacity", "occupancyRatio"]].copy()
    if not safehouse_occupancy.empty:
        safehouse_occupancy = safehouse_occupancy.rename(
            columns={"active_residents": "occupancy", "capacity": "capacityGirls"}
        )
        safehouse_occupancy["occupancyRatio"] = (safehouse_occupancy["occupancyRatio"] * 100).round(1)

    safehouse_forecast = monthly_metrics.copy()
    if not safehouse_forecast.empty:
        safehouse_forecast = safehouse_forecast.sort_values(["safehouse_id", "month_start"])
        safehouse_forecast["occupancyRatio"] = safehouse_forecast["active_residents"] / safehouses.set_index("safehouse_id")["capacity_girls"].replace({0: np.nan}).reindex(safehouse_forecast["safehouse_id"]).values
        forecast_rows = []
        for safehouse_id, group in safehouse_forecast.groupby("safehouse_id"):
            group = group.tail(3)
            incident_mean = float(group["incident_count"].fillna(0).mean())
            occupancy_mean = float(group["occupancyRatio"].fillna(0).mean())
            forecast_rows.append(
                {
                    "safehouseId": int(safehouse_id) if pd.notna(safehouse_id) else None,
                    "safehouseName": safehouse_map.get(safehouse_id, f"Safehouse {safehouse_id}"),
                    "predictedIncidentCount": round(incident_mean + (1 if occupancy_mean >= 0.9 else 0), 2),
                    "pressureScore": round((occupancy_mean * 60) + (incident_mean * 10), 1),
                    "occupancyRatio": round(occupancy_mean * 100, 1),
                }
            )
        safehouse_forecast = pd.DataFrame(forecast_rows).sort_values("pressureScore", ascending=False)
    else:
        safehouse_forecast = pd.DataFrame(columns=["safehouseName", "predictedIncidentCount", "pressureScore", "occupancyRatio"])

    staffing_indicators = latest_metrics[["safehouseName", "active_residents", "staffCapacity", "occupancyRatio"]].copy()
    if not staffing_indicators.empty:
        staffing_indicators["residentsPerStaff"] = (
            staffing_indicators["active_residents"] / staffing_indicators["staffCapacity"].replace({0: np.nan})
        ).round(2)
        staffing_indicators["occupancyRatio"] = (staffing_indicators["occupancyRatio"] * 100).round(1)

    reintegration_base = residents[[
        col for col in [
            "resident_id",
            "internal_code",
            "safehouse_id",
            "reintegration_status",
            "case_status",
            "current_risk_level",
        ] if col in residents.columns
    ]].copy()
    if not reintegration_base.empty:
        reintegration_base = reintegration_base.merge(
            latest_education[["resident_id", "progress_percent"]].rename(columns={"progress_percent": "educationProgress"}),
            on="resident_id",
            how="left",
        ).merge(
            latest_health[["resident_id", "general_health_score"]].rename(columns={"general_health_score": "healthScore"}),
            on="resident_id",
            how="left",
        )
        incident_counts = incidents.groupby("resident_id")["incident_id"].count().rename("incidentCount").reset_index() if not incidents.empty else pd.DataFrame(columns=["resident_id", "incidentCount"])
        plan_status = interventions.groupby("resident_id")["status"].apply(lambda values: float((pd.Series(values) == "Completed").mean())).rename("planCompletedShare").reset_index() if not interventions.empty else pd.DataFrame(columns=["resident_id", "planCompletedShare"])
        reintegration_base = reintegration_base.merge(incident_counts, on="resident_id", how="left").merge(plan_status, on="resident_id", how="left")
        risk_penalty = reintegration_base["current_risk_level"].astype(str).str.lower().map({"critical": 25, "high": 15, "medium": 8, "low": 0}).fillna(10)
        reintegration_base["readinessScore"] = (
            reintegration_base["educationProgress"].fillna(0) * 0.45
            + reintegration_base["healthScore"].fillna(0) * 12
            + reintegration_base["planCompletedShare"].fillna(0) * 20
            - reintegration_base["incidentCount"].fillna(0) * 2
            - risk_penalty
        ).round(1)
        reintegration_base["safehouseName"] = reintegration_base["safehouse_id"].map(safehouse_map)
    reintegration_funnel = [
        {
            "label": "In care",
            "value": int(residents.get("case_status", pd.Series(dtype="object")).astype(str).str.lower().eq("active").sum()),
        },
        {
            "label": "Planning",
            "value": int(residents.get("reintegration_status", pd.Series(dtype="object")).astype(str).str.lower().eq("planning").sum()),
        },
        {
            "label": "In progress",
            "value": int(residents.get("reintegration_status", pd.Series(dtype="object")).astype(str).str.lower().eq("in progress").sum()),
        },
        {
            "label": "Completed",
            "value": int(residents.get("reintegration_status", pd.Series(dtype="object")).astype(str).str.lower().eq("completed").sum()),
        },
    ]
    intervention_completion = (
        interventions.get("status", pd.Series(dtype="object"))
        .fillna("Unknown")
        .value_counts()
        .rename_axis("label")
        .reset_index(name="value")
    )

    outreach_best_platform = None
    outreach_best_time = None
    conversion_by_post_type = pd.DataFrame(columns=["postType", "referralRate", "avgDonationValuePhp", "posts"])
    donation_value_forecast = pd.DataFrame(columns=["label", "value"])
    public_snapshots = pd.DataFrame(columns=["label", "activeResidentsServed", "avgHealthScore", "avgEducationProgress", "totalDonationImpact"])

    if social_community_summary:
        outreach_best_platform = social_community_summary.get("summary", {}).get("bestPlatform")
        timing_signals = social_community_summary.get("timingSignals", [])
        outreach_best_time = timing_signals[0]["value"] if timing_signals else None
    if social_dashboard_summary:
        conversion_by_post_type = pd.DataFrame(
            [
                {
                    "postType": row.get("postType"),
                    "referralRate": round(float(row.get("referralRate", 0)) * 100, 1) if row.get("referralRate") is not None else None,
                    "avgDonationValuePhp": _safe_round(row.get("avgDonationValuePhp"), 2),
                    "posts": row.get("posts", 0),
                }
                for row in social_dashboard_summary.get("postTypeReferralChart", [])
            ]
        )
        donation_value_forecast = pd.DataFrame(
            [
                {
                    "label": row.get("postType"),
                    "value": _safe_round(row.get("avgDonationValuePhp"), 2),
                }
                for row in social_dashboard_summary.get("postTypeValueChart", [])
            ]
        )
    else:
        if not social_posts.empty:
            social_posts["hasReferral"] = social_posts["donation_referrals"].fillna(0) > 0
            conversion_by_post_type = (
                social_posts.groupby("post_type", as_index=False)
                .agg(
                    posts=("post_id", "count"),
                    referralRate=("hasReferral", "mean"),
                    avgDonationValuePhp=("estimated_donation_value_php", "mean"),
                )
                .sort_values("referralRate", ascending=False)
            )
            conversion_by_post_type["referralRate"] = (conversion_by_post_type["referralRate"] * 100).round(1)
            donation_value_forecast = conversion_by_post_type.rename(columns={"post_type": "label", "avgDonationValuePhp": "value"})[
                ["label", "value"]
            ].copy()
            best_platform_df = social_posts.groupby("platform", as_index=False)["reach"].mean().sort_values("reach", ascending=False)
            if not best_platform_df.empty:
                outreach_best_platform = best_platform_df.iloc[0]["platform"]
            best_hour = social_posts.groupby("post_hour", as_index=False)["reach"].mean().sort_values("reach", ascending=False)
            if not best_hour.empty:
                outreach_best_time = f"{int(best_hour.iloc[0]['post_hour'])}:00"

    if public_impact_summary:
        public_snapshots = pd.DataFrame(public_impact_summary.get("impactTimeline", []))
        if not public_snapshots.empty:
            public_snapshots = public_snapshots.tail(6)
    elif not snapshots.empty:
        public_snapshots["label"] = snapshots["snapshot_date"].dt.strftime("%b %Y")

    annual_report = build_annual_report(
        residents=residents,
        process_recordings=process,
        intervention_plans=interventions,
        home_visitations=visits,
        incident_reports=incidents,
        donations=donations,
        allocations=allocations,
        monthly_metrics=monthly_metrics,
    )

    summary = {
        "generatedAt": pd.Timestamp.utcnow().isoformat(),
        "asOf": as_of.isoformat(),
        "filters": {
            "dateFrom": filters.get("dateFrom"),
            "dateTo": filters.get("dateTo"),
            "safehouseId": filters.get("safehouseId"),
            "campaignName": filters.get("campaignName"),
        },
        "availableFilters": {
            "safehouses": [
                {"value": str(row.get("safehouse_id")), "label": row.get("name") or row.get("safehouse_code") or f"Safehouse {row.get('safehouse_id')}"}
                for _, row in safehouses.iterrows()
            ],
            "campaigns": [
                {"value": str(value), "label": str(value)}
                for value in sorted(
                    pd.concat(
                        [donations.get("campaign_name", pd.Series(dtype="object")), social_posts.get("campaign_name", pd.Series(dtype="object"))],
                        ignore_index=True,
                    ).dropna().replace("", np.nan).dropna().unique().tolist()
                )
            ],
            "dateRange": {
                "min": min(
                    [date.isoformat() for date in [
                        donations["donation_date"].min() if not donations.empty else pd.NaT,
                        education["record_date"].min() if not education.empty else pd.NaT,
                        monthly_metrics["month_start"].min() if not monthly_metrics.empty else pd.NaT,
                    ] if pd.notna(date)],
                    default=None,
                ),
                "max": as_of.isoformat(),
            },
        },
        "kpis": kpis,
        "donation": {
            "trends": donation_trends.to_dict(orient="records"),
            "retention": donor_lapse.monthly_retention.to_dict(orient="records"),
            "lapseRisk": lapse_risk_rows.to_dict(orient="records"),
            "segmentSummary": donor_lapse.segment_summary.to_dict(orient="records"),
            "allocationByProgramArea": allocation_dashboard["allocation_mix"].rename(columns={"program_area": "label", "amount": "value"}).to_dict(orient="records"),
            "campaignPerformance": campaign_performance.tail(18).to_dict(orient="records") if not campaign_performance.empty else [],
            "donorUpgradeOpportunities": top_upgrade.to_dict(orient="records") if not top_upgrade.empty else [],
        },
        "residentOutcomes": {
            "educationTrend": education_trend.to_dict(orient="records"),
            "healthTrend": health_trend.to_dict(orient="records"),
            "processProgress": process_progress.to_dict(orient="records"),
            "homeVisitOutcomeTrend": visit_trend.to_dict(orient="records"),
            "incidentTrend": incident_trend.to_dict(orient="records"),
            "riskLevelDistribution": risk_distribution.to_dict(orient="records"),
        },
        "safehouse": {
            "occupancyVsCapacity": safehouse_occupancy.to_dict(orient="records"),
            "incidentForecast": safehouse_forecast.to_dict(orient="records"),
            "educationBySafehouse": latest_metrics[["safehouseName", "avg_education_progress"]].rename(columns={"avg_education_progress": "value", "safehouseName": "label"}).to_dict(orient="records") if not latest_metrics.empty else [],
            "healthBySafehouse": latest_metrics[["safehouseName", "avg_health_score"]].rename(columns={"avg_health_score": "value", "safehouseName": "label"}).to_dict(orient="records") if not latest_metrics.empty else [],
            "staffingPressure": staffing_indicators.to_dict(orient="records") if not staffing_indicators.empty else [],
        },
        "reintegration": {
            "readiness": reintegration_base.sort_values("readinessScore", ascending=False).head(10).to_dict(orient="records") if not reintegration_base.empty else [],
            "completionRate": round(reintegration_success_rate * 100, 1),
            "funnel": reintegration_funnel,
            "interventionCompletion": intervention_completion.to_dict(orient="records"),
        },
        "outreachImpact": {
            "bestPlatform": outreach_best_platform,
            "bestPostingTime": outreach_best_time,
            "conversionByPostType": conversion_by_post_type.to_dict(orient="records") if not conversion_by_post_type.empty else [],
            "donationValueForecast": donation_value_forecast.to_dict(orient="records") if not donation_value_forecast.empty else [],
            "publicImpactSnapshots": public_snapshots.to_dict(orient="records") if not public_snapshots.empty else [],
        },
        "annualReport": annual_report,
        "exports": {
            "overview": [{item["label"]: item["value"] for item in kpis}],
            "donation": donation_trends.to_dict(orient="records"),
            "residentOutcomes": incident_trend.to_dict(orient="records"),
            "safehouse": safehouse_occupancy.to_dict(orient="records"),
            "reintegration": reintegration_base.to_dict(orient="records") if not reintegration_base.empty else [],
            "outreachImpact": conversion_by_post_type.to_dict(orient="records") if not conversion_by_post_type.empty else [],
            "annualReport": annual_report.get("exportRows", []),
            "donorLapse": donor_lapse_export_rows(donor_lapse),
        },
    }

    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Build reports dashboard aggregations.")
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--artifact-dir", required=True)
    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)
    artifact_dir = Path(args.artifact_dir)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    tables, filters = _parse_payload(input_path)
    filtered_tables = _apply_filters(tables, filters)
    summary = _build_summary(filtered_tables, filters, artifact_dir)

    output_path.write_text(json.dumps(_sanitize_for_json(summary), indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
