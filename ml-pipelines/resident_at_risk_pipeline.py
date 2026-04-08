#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


FEATURE_WINDOW_DAYS = 90
LABEL_WINDOW_DAYS = 30
MIN_TRAIN_ROWS = 50
RISK_THRESHOLD = 0.6


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Path to input JSON payload")
    parser.add_argument("--output", required=True, help="Path to output JSON summary")
    parser.add_argument("--artifact-dir", required=True, help="Directory to write model artifacts")
    return parser.parse_args()


def safe_int(value: Any) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return None


def safe_bool(value: Any) -> bool | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    text = str(value).strip().lower()
    if text in {"true", "t", "1", "yes", "y"}:
        return True
    if text in {"false", "f", "0", "no", "n"}:
        return False
    return None


def parse_date(value: Any) -> pd.Timestamp | None:
    if value is None or value == "":
        return None
    try:
        ts = pd.to_datetime(value, errors="coerce", utc=True)
    except Exception:
        return None
    if ts is pd.NaT:
        return None
    return ts


def normalize_severity(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def build_feature_frame(
    residents: list[dict[str, Any]],
    incidents: list[dict[str, Any]],
    recordings: list[dict[str, Any]],
    as_of: pd.Timestamp,
) -> pd.DataFrame:
    residents_df = pd.DataFrame(residents)
    if residents_df.empty:
        return residents_df

    if "resident_id" not in residents_df.columns:
        residents_df["resident_id"] = None
    if "internal_code" not in residents_df.columns:
        residents_df["internal_code"] = None
    if "safehouse_id" not in residents_df.columns:
        residents_df["safehouse_id"] = None
    if "case_status" not in residents_df.columns:
        residents_df["case_status"] = None
    if "current_risk_level" not in residents_df.columns:
        residents_df["current_risk_level"] = None

    incidents_df = pd.DataFrame(incidents)
    if incidents_df.empty:
        incidents_df = pd.DataFrame(columns=["resident_id", "incident_date", "severity", "follow_up_required"])
    for col in ["resident_id", "incident_date", "severity", "follow_up_required"]:
        if col not in incidents_df.columns:
            incidents_df[col] = None
    incidents_df["resident_id"] = incidents_df["resident_id"].apply(safe_int)
    incidents_df["incident_date"] = incidents_df["incident_date"].apply(parse_date)
    incidents_df["severity"] = incidents_df["severity"].apply(normalize_severity)
    incidents_df["follow_up_required"] = incidents_df["follow_up_required"].apply(safe_bool)

    recordings_df = pd.DataFrame(recordings)
    if recordings_df.empty:
        recordings_df = pd.DataFrame(
            columns=["resident_id", "session_date", "session_type", "concerns_flagged", "referral_made", "progress_noted"]
        )
    for col in ["resident_id", "session_date", "session_type", "concerns_flagged", "referral_made", "progress_noted"]:
        if col not in recordings_df.columns:
            recordings_df[col] = None
    recordings_df["resident_id"] = recordings_df["resident_id"].apply(safe_int)
    # session_date is stored as text in schema, so parse leniently
    recordings_df["session_date"] = recordings_df["session_date"].apply(parse_date)
    recordings_df["concerns_flagged"] = recordings_df["concerns_flagged"].apply(safe_bool)
    recordings_df["referral_made"] = recordings_df["referral_made"].apply(safe_bool)
    recordings_df["progress_noted"] = recordings_df["progress_noted"].apply(safe_bool)
    recordings_df["session_type"] = recordings_df["session_type"].map(lambda v: str(v).strip() if v not in [None, ""] else None)

    window_start = as_of - pd.Timedelta(days=FEATURE_WINDOW_DAYS)
    label_end = as_of + pd.Timedelta(days=LABEL_WINDOW_DAYS)

    # Aggregate incidents in feature window.
    incidents_window = incidents_df[
        (incidents_df["incident_date"].notna())
        & (incidents_df["incident_date"] >= window_start)
        & (incidents_df["incident_date"] <= as_of)
    ].copy()
    incidents_window["is_high"] = incidents_window["severity"].str.lower().eq("high")
    incidents_agg = (
        incidents_window.groupby("resident_id", dropna=False)
        .agg(
            incidents_90d=("incident_id", "count") if "incident_id" in incidents_window.columns else ("severity", "count"),
            high_incidents_90d=("is_high", "sum"),
            followups_90d=("follow_up_required", lambda s: int(np.nansum([1 if v else 0 for v in s]))),
        )
        .reset_index()
    )

    # Aggregate recordings in feature window.
    recordings_window = recordings_df[
        (recordings_df["session_date"].notna())
        & (recordings_df["session_date"] >= window_start)
        & (recordings_df["session_date"] <= as_of)
    ].copy()
    rec_agg = (
        recordings_window.groupby("resident_id", dropna=False)
        .agg(
            sessions_90d=("recording_id", "count") if "recording_id" in recordings_window.columns else ("session_type", "count"),
            concerns_90d=("concerns_flagged", lambda s: int(np.nansum([1 if v else 0 for v in s]))),
            referrals_90d=("referral_made", lambda s: int(np.nansum([1 if v else 0 for v in s]))),
            progress_90d=("progress_noted", lambda s: int(np.nansum([1 if v else 0 for v in s]))),
        )
        .reset_index()
    )

    # Label: any incident in next 30d with severity High OR follow_up_required True.
    incidents_label = incidents_df[
        (incidents_df["incident_date"].notna())
        & (incidents_df["incident_date"] > as_of)
        & (incidents_df["incident_date"] <= label_end)
    ].copy()
    incidents_label["is_target"] = incidents_label["severity"].str.lower().eq("high") | (incidents_label["follow_up_required"] == True)
    label = (
        incidents_label.groupby("resident_id", dropna=False)["is_target"]
        .max()
        .reset_index()
        .rename(columns={"is_target": "label_next30d"})
    )

    base = residents_df.copy()
    base["resident_id"] = base["resident_id"].apply(safe_int)

    df = base.merge(incidents_agg, on="resident_id", how="left").merge(rec_agg, on="resident_id", how="left").merge(label, on="resident_id", how="left")

    for col in ["incidents_90d", "high_incidents_90d", "followups_90d", "sessions_90d", "concerns_90d", "referrals_90d", "progress_90d"]:
        if col not in df.columns:
            df[col] = 0
        df[col] = df[col].fillna(0).astype(int)

    df["label_next30d"] = df["label_next30d"].fillna(False).astype(int)
    df["asOf"] = as_of.isoformat()
    return df


def make_preprocessor(numeric: list[str], categorical: list[str]) -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("numeric", Pipeline([("imputer", SimpleImputer(strategy="median"))]), numeric),
            (
                "categorical",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("encoder", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical,
            ),
        ]
    )


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)
    artifact_dir = Path(args.artifact_dir)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    payload = json.loads(input_path.read_text())
    residents = payload.get("residents") or []
    incidents = payload.get("incident_reports") or []
    recordings = payload.get("process_recordings") or []

    now = datetime.now(timezone.utc)
    as_of = pd.Timestamp(now)

    df = build_feature_frame(residents, incidents, recordings, as_of=as_of)

    result: dict[str, Any] = {
        "generatedAt": now.isoformat(),
        "asOf": as_of.isoformat(),
        "dataset": {
            "residents": len(residents),
            "incidents": len(incidents),
            "recordings": len(recordings),
        },
        "model": {
            "isTrained": False,
            "threshold": RISK_THRESHOLD,
            "rocAuc": None,
            "averagePrecision": None,
            "artifactPath": None,
        },
        "highRiskResidents": [],
    }

    if df.empty:
        output_path.write_text(json.dumps(result, indent=2))
        return 0

    numeric_features = [
        "incidents_90d",
        "high_incidents_90d",
        "followups_90d",
        "sessions_90d",
        "concerns_90d",
        "referrals_90d",
        "progress_90d",
    ]
    categorical_features = ["case_status", "current_risk_level", "safehouse_id"]
    for col in categorical_features:
        if col not in df.columns:
            df[col] = None

    X = df[numeric_features + categorical_features].copy()
    y = df["label_next30d"].copy()

    model_path = artifact_dir / "resident_at_risk_live_random_forest.joblib"

    can_train = len(df) >= MIN_TRAIN_ROWS and y.nunique() >= 2
    classifier: Pipeline | None = None
    if can_train:
        classifier = Pipeline(
            [
                ("prep", make_preprocessor(numeric_features, categorical_features)),
                (
                    "model",
                    RandomForestClassifier(
                        n_estimators=300,
                        min_samples_leaf=2,
                        random_state=42,
                        class_weight="balanced",
                    ),
                ),
            ]
        )
        classifier.fit(X, y)
        prob = classifier.predict_proba(X)[:, 1]
        try:
            result["model"]["rocAuc"] = float(roc_auc_score(y, prob))
        except Exception:
            result["model"]["rocAuc"] = None
        try:
            result["model"]["averagePrecision"] = float(average_precision_score(y, prob))
        except Exception:
            result["model"]["averagePrecision"] = None
        result["model"]["isTrained"] = True
        result["model"]["artifactPath"] = str(model_path)
        joblib.dump(classifier, model_path)
        df["riskProbability"] = prob
    else:
        # Fallback heuristic: weighted recent signals.
        df["riskProbability"] = (
            0.15 * df["incidents_90d"]
            + 0.35 * df["high_incidents_90d"]
            + 0.25 * df["followups_90d"]
            + 0.25 * df["concerns_90d"]
        )
        max_score = float(df["riskProbability"].max()) if len(df) else 1.0
        if max_score <= 0:
            max_score = 1.0
        df["riskProbability"] = df["riskProbability"] / max_score

    df["riskLevel"] = np.where(df["riskProbability"] >= RISK_THRESHOLD, "High", "Normal")

    scored = df.sort_values("riskProbability", ascending=False).head(25)
    residents_out: list[dict[str, Any]] = []
    for _, row in scored.iterrows():
        residents_out.append(
            {
                "residentId": int(row["resident_id"]) if pd.notna(row["resident_id"]) else None,
                "internalCode": row.get("internal_code"),
                "safehouseId": row.get("safehouse_id"),
                "caseStatus": row.get("case_status"),
                "riskProbability": float(row["riskProbability"]) if pd.notna(row["riskProbability"]) else None,
                "riskLevel": row.get("riskLevel"),
                "signals": {
                    "incidents90d": int(row.get("incidents_90d", 0)),
                    "highIncidents90d": int(row.get("high_incidents_90d", 0)),
                    "followups90d": int(row.get("followups_90d", 0)),
                    "sessions90d": int(row.get("sessions_90d", 0)),
                    "concerns90d": int(row.get("concerns_90d", 0)),
                    "referrals90d": int(row.get("referrals_90d", 0)),
                },
            }
        )

    result["highRiskResidents"] = residents_out
    output_path.write_text(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

