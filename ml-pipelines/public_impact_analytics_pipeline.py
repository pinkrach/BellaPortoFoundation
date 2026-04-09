#!/usr/bin/env python3
from __future__ import annotations

import argparse
import ast
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


FORECAST_TARGETS = [
    "forecast_active_residents_served_next",
    "forecast_avg_health_score_next",
    "forecast_avg_education_progress_next",
    "forecast_total_donation_impact_next",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--artifact-dir", required=True)
    return parser.parse_args()


def parse_payload(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    try:
        return ast.literal_eval(str(value))
    except (ValueError, SyntaxError):
        return {}


def safe_round(value: Any, digits: int = 4) -> float | None:
    if value is None:
        return None
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if np.isnan(numeric) or np.isinf(numeric):
        return None
    return round(numeric, digits)


def load_input(input_path: Path) -> dict[str, pd.DataFrame]:
    payload = json.loads(input_path.read_text())
    if not isinstance(payload, dict):
        raise ValueError("Input JSON must be an object keyed by table name.")
    frames = {}
    for key, rows in payload.items():
        if not isinstance(rows, list):
            raise ValueError(f"Expected '{key}' to be a list of rows.")
        frames[key] = pd.DataFrame(rows)
    return frames


def prepare_monthly_dataset(frames: dict[str, pd.DataFrame]) -> pd.DataFrame:
    snapshots = frames.get("public_impact_snapshots", pd.DataFrame()).copy()
    safehouse = frames.get("safehouse_monthly_metrics", pd.DataFrame()).copy()
    allocations = frames.get("donation_allocations", pd.DataFrame()).copy()
    donations = frames.get("donations", pd.DataFrame()).copy()

    if snapshots.empty:
        return pd.DataFrame()

    snapshots["snapshot_date"] = pd.to_datetime(snapshots.get("snapshot_date"), errors="coerce")
    snapshots["published_at"] = pd.to_datetime(snapshots.get("published_at"), errors="coerce")
    payload_df = pd.json_normalize(snapshots.get("metric_payload_json").apply(parse_payload))
    payload_df.columns = [f"payload_{column}" for column in payload_df.columns]
    snapshots_expanded = pd.concat([snapshots.drop(columns=["metric_payload_json"], errors="ignore").reset_index(drop=True), payload_df.reset_index(drop=True)], axis=1)
    snapshots_expanded["month"] = snapshots_expanded["snapshot_date"].dt.to_period("M").dt.to_timestamp()

    donations["donation_date"] = pd.to_datetime(donations.get("donation_date"), errors="coerce")
    donations["month"] = donations["donation_date"].dt.to_period("M").dt.to_timestamp()
    donations["donation_value"] = pd.to_numeric(donations.get("amount"), errors="coerce").fillna(pd.to_numeric(donations.get("estimated_value"), errors="coerce"))
    donations_monthly = donations.groupby("month").agg(
        total_donations_value=("donation_value", "sum"),
        donation_count=("donation_id", "size"),
        recurring_share=("is_recurring", "mean"),
        campaign_count=("campaign_name", "nunique"),
    ).reset_index()

    allocations["allocation_date"] = pd.to_datetime(allocations.get("allocation_date"), errors="coerce")
    allocations["month"] = allocations["allocation_date"].dt.to_period("M").dt.to_timestamp()
    allocations["amount_allocated"] = pd.to_numeric(allocations.get("amount_allocated"), errors="coerce")
    allocations_monthly = allocations.groupby("month").agg(
        total_allocations=("amount_allocated", "sum"),
        allocation_count=("allocation_id", "size"),
        safehouses_funded=("safehouse_id", "nunique"),
        program_areas_funded=("program_area", "nunique"),
    ).reset_index()

    safehouse["month_start"] = pd.to_datetime(safehouse.get("month_start"), errors="coerce")
    safehouse["month"] = safehouse["month_start"].dt.to_period("M").dt.to_timestamp()
    for column in ["active_residents", "avg_health_score", "avg_education_progress", "process_recording_count", "home_visitation_count", "incident_count"]:
        safehouse[column] = pd.to_numeric(safehouse.get(column), errors="coerce")
    safehouse_monthly = safehouse.groupby("month").agg(
        active_residents=("active_residents", "sum"),
        avg_health_score=("avg_health_score", "mean"),
        avg_education_progress=("avg_education_progress", "mean"),
        process_recording_count=("process_recording_count", "sum"),
        home_visitation_count=("home_visitation_count", "sum"),
        incident_count=("incident_count", "sum"),
    ).reset_index()

    monthly = (
        snapshots_expanded.merge(safehouse_monthly, on="month", how="left")
        .merge(allocations_monthly, on="month", how="left")
        .merge(donations_monthly, on="month", how="left")
        .sort_values("month")
        .reset_index(drop=True)
    )

    monthly["published_flag"] = monthly.get("is_published").astype(str).str.lower().eq("true").astype(int)
    monthly["month_num"] = monthly["month"].dt.month
    monthly["quarter"] = monthly["month"].dt.quarter
    monthly["year"] = monthly["month"].dt.year
    monthly["headline_length"] = monthly.get("headline").fillna("").astype(str).str.len()
    monthly["summary_length"] = monthly.get("summary_text").fillna("").astype(str).str.len()

    monthly["forecast_active_residents_served"] = pd.to_numeric(monthly.get("payload_total_residents"), errors="coerce").fillna(monthly["active_residents"])
    monthly["forecast_avg_health_score"] = pd.to_numeric(monthly.get("payload_avg_health_score"), errors="coerce").fillna(monthly["avg_health_score"])
    monthly["forecast_avg_education_progress"] = pd.to_numeric(monthly.get("payload_avg_education_progress"), errors="coerce").fillna(monthly["avg_education_progress"])
    monthly["forecast_total_donation_impact"] = pd.to_numeric(monthly.get("payload_donations_total_for_month"), errors="coerce").fillna(monthly["total_donations_value"])

    lag_columns = [
        "active_residents",
        "avg_health_score",
        "avg_education_progress",
        "incident_count",
        "total_allocations",
        "total_donations_value",
        "donation_count",
        "forecast_active_residents_served",
        "forecast_avg_health_score",
        "forecast_avg_education_progress",
        "forecast_total_donation_impact",
    ]
    for column in lag_columns:
        if column not in monthly.columns:
            continue
        monthly[f"{column}_lag1"] = monthly[column].shift(1)
        monthly[f"{column}_lag2"] = monthly[column].shift(2)
        monthly[f"{column}_rolling3"] = monthly[column].rolling(3, min_periods=1).mean().shift(1)
        monthly[f"{column}_delta1"] = monthly[column].diff(1)

    monthly["donation_to_allocation_ratio"] = monthly["total_donations_value"] / monthly["total_allocations"].replace(0, np.nan)
    monthly["incident_pressure"] = monthly["incident_count"] / monthly["active_residents"].replace(0, np.nan)
    monthly["health_to_education_ratio"] = monthly["avg_health_score"] / monthly["avg_education_progress"].replace(0, np.nan)

    for column in [
        "forecast_active_residents_served",
        "forecast_avg_health_score",
        "forecast_avg_education_progress",
        "forecast_total_donation_impact",
    ]:
        monthly[f"{column}_next"] = monthly[column].shift(-1)

    return monthly


def build_modeling_data(monthly: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    feature_columns = [
        "month_num",
        "quarter",
        "year",
        "published_flag",
        "headline_length",
        "summary_length",
        "active_residents_lag1",
        "active_residents_lag2",
        "active_residents_rolling3",
        "avg_health_score_lag1",
        "avg_health_score_lag2",
        "avg_health_score_rolling3",
        "avg_education_progress_lag1",
        "avg_education_progress_lag2",
        "avg_education_progress_rolling3",
        "incident_count_lag1",
        "incident_count_rolling3",
        "total_allocations_lag1",
        "total_allocations_rolling3",
        "total_donations_value_lag1",
        "total_donations_value_lag2",
        "total_donations_value_rolling3",
        "donation_count_lag1",
        "donation_count_rolling3",
        "donation_to_allocation_ratio",
        "incident_pressure",
        "health_to_education_ratio",
    ]
    feature_columns = [column for column in feature_columns if column in monthly.columns]
    modeling_df = monthly.dropna(subset=FORECAST_TARGETS).copy()
    return modeling_df, feature_columns


def fit_forecast_models(modeling_df: pd.DataFrame, feature_columns: list[str], artifact_dir: Path) -> dict[str, Any]:
    result: dict[str, Any] = {
        "selectedModel": None,
        "meanRmse": None,
        "meanMae": None,
        "meanR2": None,
        "targetMetrics": [],
        "nextForecast": {},
        "topDrivers": {},
    }
    if len(modeling_df) < 12:
        return result

    train_df = modeling_df.iloc[:-6].copy() if len(modeling_df) > 12 else modeling_df.iloc[:-3].copy()
    test_df = modeling_df.iloc[len(train_df):].copy()
    if train_df.empty or test_df.empty:
        return result

    X_train = train_df[feature_columns]
    y_train = train_df[FORECAST_TARGETS]
    X_test = test_df[feature_columns]
    y_test = test_df[FORECAST_TARGETS]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), feature_columns),
        ]
    )

    models = {
        "LinearRegression": MultiOutputRegressor(LinearRegression()),
        "GradientBoostingRegressor": MultiOutputRegressor(
            GradientBoostingRegressor(random_state=27, learning_rate=0.05, n_estimators=250, max_depth=3)
        ),
    }

    scored_models: list[dict[str, Any]] = []
    fitted: dict[str, tuple[Pipeline, np.ndarray]] = {}
    for name, estimator in models.items():
        pipeline = Pipeline([("preprocessor", preprocessor), ("model", estimator)])
        pipeline.fit(X_train, y_train)
        predictions = pipeline.predict(X_test)
        target_metrics = []
        for idx, target_name in enumerate(FORECAST_TARGETS):
            target_metrics.append(
                {
                    "target": target_name,
                    "rmse": safe_round(np.sqrt(mean_squared_error(y_test.iloc[:, idx], predictions[:, idx])), 4),
                    "mae": safe_round(mean_absolute_error(y_test.iloc[:, idx], predictions[:, idx]), 4),
                    "r2": safe_round(r2_score(y_test.iloc[:, idx], predictions[:, idx]), 4),
                }
            )
        scored_models.append(
            {
                "name": name,
                "meanRmse": float(np.mean([row["rmse"] or 0 for row in target_metrics])),
                "meanMae": float(np.mean([row["mae"] or 0 for row in target_metrics])),
                "meanR2": float(np.mean([row["r2"] or 0 for row in target_metrics])),
                "targetMetrics": target_metrics,
            }
        )
        fitted[name] = (pipeline, predictions)

    selected = sorted(scored_models, key=lambda row: row["meanRmse"])[0]
    selected_name = str(selected["name"])
    selected_pipeline, _ = fitted[selected_name]
    latest_features = modeling_df[feature_columns].iloc[[-1]]
    next_prediction = selected_pipeline.predict(latest_features)[0]

    transformed_feature_names = selected_pipeline.named_steps["preprocessor"].get_feature_names_out()
    top_drivers: dict[str, list[dict[str, Any]]] = {}
    for target_name, estimator in zip(FORECAST_TARGETS, selected_pipeline.named_steps["model"].estimators_):
        raw_importance = estimator.feature_importances_ if hasattr(estimator, "feature_importances_") else np.abs(np.ravel(estimator.coef_))
        top_drivers[target_name] = (
            pd.DataFrame({"feature": transformed_feature_names, "importance": raw_importance})
            .sort_values("importance", ascending=False)
            .head(6)
            .to_dict(orient="records")
        )

    artifact_dir.mkdir(parents=True, exist_ok=True)
    model_path = artifact_dir / "public_impact_forecast_live.joblib"
    joblib.dump(selected_pipeline, model_path)

    result.update(
        {
            "selectedModel": selected_name,
            "meanRmse": safe_round(selected["meanRmse"], 4),
            "meanMae": safe_round(selected["meanMae"], 4),
            "meanR2": safe_round(selected["meanR2"], 4),
            "targetMetrics": selected["targetMetrics"],
            "nextForecast": {
                "activeResidentsServed": safe_round(next_prediction[0], 2),
                "avgHealthScore": safe_round(next_prediction[1], 2),
                "avgEducationProgress": safe_round(next_prediction[2], 2),
                "totalDonationImpact": safe_round(next_prediction[3], 2),
            },
            "topDrivers": top_drivers,
            "artifacts": {"forecastModelPath": str(model_path)},
        }
    )
    return result


def build_story_scores(monthly: pd.DataFrame, forecast: dict[str, Any]) -> pd.DataFrame:
    if monthly.empty:
        return pd.DataFrame()
    latest = monthly.iloc[-1]
    next_forecast = forecast.get("nextForecast", {})
    donor_relevance = {
        "Active residents served": 0.85,
        "Average health score": 0.80,
        "Average education progress": 0.92,
        "Donation impact": 0.95,
    }
    rows = [
        {
            "metricName": "Active residents served",
            "latestValue": safe_round(latest.get("forecast_active_residents_served"), 2),
            "predictedNextValue": next_forecast.get("activeResidentsServed"),
        },
        {
            "metricName": "Average health score",
            "latestValue": safe_round(latest.get("forecast_avg_health_score"), 2),
            "predictedNextValue": next_forecast.get("avgHealthScore"),
        },
        {
            "metricName": "Average education progress",
            "latestValue": safe_round(latest.get("forecast_avg_education_progress"), 2),
            "predictedNextValue": next_forecast.get("avgEducationProgress"),
        },
        {
            "metricName": "Donation impact",
            "latestValue": safe_round(latest.get("forecast_total_donation_impact"), 2),
            "predictedNextValue": next_forecast.get("totalDonationImpact"),
        },
    ]
    scored_rows = []
    donation_response = safe_round(monthly["total_donations_value"].pct_change().iloc[-1] if len(monthly) >= 2 else 0, 4) or 0
    for row in rows:
        latest_value = row["latestValue"] or 0
        predicted_value = row["predictedNextValue"] or latest_value
        delta = predicted_value - latest_value
        base = abs(latest_value) if abs(latest_value) > 1e-6 else 1.0
        trend_strength = delta / base
        score = 0.55 * trend_strength + 0.30 * donor_relevance[row["metricName"]] + 0.15 * donation_response
        scored_rows.append(
            {
                **row,
                "recentDelta": safe_round(delta, 2),
                "trendStrength": safe_round(trend_strength, 4),
                "headlinePriorityScore": safe_round(score, 4),
            }
        )
    return pd.DataFrame(scored_rows).sort_values("headlinePriorityScore", ascending=False).reset_index(drop=True)


def build_summary(monthly: pd.DataFrame, forecast: dict[str, Any]) -> dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    if monthly.empty:
        return {
            "generatedAt": now_iso,
            "dataset": {"rowCount": 0},
            "model": forecast,
            "kpis": [],
            "impactTimeline": [],
            "storyScores": [],
            "summary": {"headline": "No public impact records were available to analyze.", "suggestedMetric": "N/A", "suggestedHeadline": "N/A"},
            "recommendations": [],
        }

    story_scores = build_story_scores(monthly, forecast)
    top_story = story_scores.iloc[0].to_dict() if not story_scores.empty else {}
    latest_month = monthly["month"].max()
    forecast_month = (latest_month + pd.offsets.MonthBegin(1)).date().isoformat() if pd.notna(latest_month) else None
    suggested_metric = str(top_story.get("metricName") or "N/A")
    delta = top_story.get("recentDelta")
    suggested_headline = (
        f"{suggested_metric} is projected to change by {delta:.2f} next month, making it the strongest public dashboard story."
        if isinstance(delta, (int, float))
        else "No public headline recommendation is available yet."
    )

    recommendations = [
        "Use the forecast cards to pre-stage next month’s donor dashboard before publishing.",
        "Keep the final headline human-reviewed so communications staff can validate tone and privacy.",
        "Prioritize metrics with strong operational improvement and strong donor relevance rather than whichever number is easiest to explain.",
    ]

    return {
        "generatedAt": now_iso,
        "dataset": {
            "rowCount": int(len(monthly)),
            "monthMin": monthly["month"].min().date().isoformat() if monthly["month"].notna().any() else None,
            "monthMax": monthly["month"].max().date().isoformat() if monthly["month"].notna().any() else None,
        },
        "forecastMonth": forecast_month,
        "model": forecast,
        "kpis": [
            {"label": "Forecast residents served", "value": forecast.get("nextForecast", {}).get("activeResidentsServed"), "detail": "Predicted active residents served for next month"},
            {"label": "Forecast health score", "value": forecast.get("nextForecast", {}).get("avgHealthScore"), "detail": "Predicted public average health score next month"},
            {"label": "Forecast education progress", "value": forecast.get("nextForecast", {}).get("avgEducationProgress"), "detail": "Predicted public education progress next month"},
            {"label": "Forecast donation impact", "value": forecast.get("nextForecast", {}).get("totalDonationImpact"), "detail": "Predicted total donation impact for the next public dashboard cycle", "unit": "PHP"},
        ],
        "impactTimeline": [
            {
                "month": row["month"].date().isoformat() if pd.notna(row["month"]) else None,
                "label": row["month"].strftime("%b %Y") if pd.notna(row["month"]) else "Unknown",
                "activeResidentsServed": safe_round(row["forecast_active_residents_served"], 2),
                "avgHealthScore": safe_round(row["forecast_avg_health_score"], 2),
                "avgEducationProgress": safe_round(row["forecast_avg_education_progress"], 2),
                "totalDonationImpact": safe_round(row["forecast_total_donation_impact"], 2),
            }
            for _, row in monthly.iterrows()
        ],
        "storyScores": story_scores.to_dict(orient="records"),
        "summary": {
            "headline": suggested_headline,
            "suggestedMetric": suggested_metric,
            "suggestedHeadline": suggested_headline,
        },
        "recommendations": recommendations,
    }


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)
    artifact_dir = Path(args.artifact_dir)

    frames = load_input(input_path)
    monthly = prepare_monthly_dataset(frames)
    modeling_df, feature_columns = build_modeling_data(monthly)
    forecast = fit_forecast_models(modeling_df, feature_columns, artifact_dir)
    summary = build_summary(monthly, forecast)

    artifact_dir.mkdir(parents=True, exist_ok=True)
    (artifact_dir / "public_impact_summary.json").write_text(json.dumps(summary, indent=2))
    output_path.write_text(json.dumps(summary, indent=2))
    print(json.dumps({"ok": True, "rows": len(monthly), "output": str(output_path)}))


if __name__ == "__main__":
    main()
