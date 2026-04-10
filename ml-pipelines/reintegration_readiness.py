from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

RANDOM_STATE = 27
RISK_MAP = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}
SEVERITY_MAP = {"Low": 1, "Medium": 2, "High": 3}
COOP_MAP = {"Low": 1, "Neutral": 2, "High": 3}
VISIT_OUTCOME_MAP = {"Unfavorable": 0, "Mixed": 1, "Favorable": 2}
EMOTION_MAP = {"Distressed": 1, "Angry": 2, "Sad": 3, "Withdrawn": 4, "Neutral": 5, "Calm": 6, "Hopeful": 7}


@dataclass
class ReintegrationReadinessArtifacts:
    residents: pd.DataFrame
    metrics: pd.DataFrame
    selected_model_name: str | None
    is_trained: bool


def _safe_series(df: pd.DataFrame, column: str, default: Any = np.nan) -> pd.Series:
    if column in df.columns:
        return df[column]
    return pd.Series([default] * len(df), index=df.index)


def _duration_to_months(value: Any) -> float:
    if pd.isna(value):
        return np.nan
    text = str(value).lower()
    years = 0.0
    months = 0.0
    parts = text.replace("years", "year").replace("months", "month").split()
    for idx, token in enumerate(parts):
        if token == "year" and idx > 0:
            years = float(parts[idx - 1])
        if token == "month" and idx > 0:
            months = float(parts[idx - 1])
    return years * 12 + months


def _build_preprocessor(numeric_cols: list[str], categorical_cols: list[str]) -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), numeric_cols),
            (
                "cat",
                Pipeline([("imputer", SimpleImputer(strategy="most_frequent")), ("onehot", OneHotEncoder(handle_unknown="ignore"))]),
                categorical_cols,
            ),
        ]
    )


def _latest_and_trend(df: pd.DataFrame, id_col: str, date_col: str, value_cols: list[str], prefix: str) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame(columns=[id_col])
    ordered = df.sort_values([id_col, date_col]).copy()
    rows: list[dict[str, Any]] = []
    for resident_id, group in ordered.groupby(id_col):
        record: dict[str, Any] = {id_col: resident_id}
        for col in value_cols:
            clean = pd.to_numeric(group[col], errors="coerce")
            record[f"{prefix}_{col}_latest"] = clean.iloc[-1]
            record[f"{prefix}_{col}_delta"] = clean.iloc[-1] - clean.iloc[0]
        rows.append(record)
    return pd.DataFrame(rows)


def _summarize_visits(visits: pd.DataFrame, reference_date: pd.Timestamp) -> pd.DataFrame:
    if visits.empty:
        return pd.DataFrame(columns=["resident_id"])
    visits = visits.copy()
    visits["family_cooperation_score"] = _safe_series(visits, "family_cooperation_level").map(COOP_MAP).fillna(0)
    visits["visit_outcome_score"] = _safe_series(visits, "visit_outcome").map(VISIT_OUTCOME_MAP).fillna(0)
    rows = []
    for resident_id, group in visits.sort_values("visit_date").groupby("resident_id"):
        recent = group[group["visit_date"] >= reference_date - pd.Timedelta(days=180)]
        rows.append(
            {
                "resident_id": resident_id,
                "visit_count_180d": len(recent),
                "visit_favorable_share": (group["visit_outcome"] == "Favorable").mean(),
                "visit_safety_concern_rate": _safe_series(group, "safety_concerns_noted", False).fillna(False).astype(int).mean(),
                "visit_family_cooperation_mean": group["family_cooperation_score"].mean(),
            }
        )
    return pd.DataFrame(rows)


def _summarize_process(process: pd.DataFrame, reference_date: pd.Timestamp) -> pd.DataFrame:
    if process.empty:
        return pd.DataFrame(columns=["resident_id"])
    process = process.copy()
    process["emotion_start_score"] = _safe_series(process, "emotional_state_observed").map(EMOTION_MAP).fillna(0)
    process["emotion_end_score"] = _safe_series(process, "emotional_state_end").map(EMOTION_MAP).fillna(0)
    process["emotion_shift"] = process["emotion_end_score"] - process["emotion_start_score"]
    rows = []
    for resident_id, group in process.sort_values("session_date").groupby("resident_id"):
        recent = group[group["session_date"] >= reference_date - pd.Timedelta(days=90)]
        rows.append(
            {
                "resident_id": resident_id,
                "process_sessions_90d": len(recent),
                "process_concern_rate": _safe_series(group, "concerns_flagged", False).fillna(False).astype(int).mean(),
                "process_progress_rate": _safe_series(group, "progress_noted", False).fillna(False).astype(int).mean(),
                "process_emotion_shift_mean": group["emotion_shift"].mean(),
            }
        )
    return pd.DataFrame(rows)


def _summarize_interventions(plans: pd.DataFrame) -> pd.DataFrame:
    if plans.empty:
        return pd.DataFrame(columns=["resident_id"])
    rows = []
    for resident_id, group in plans.sort_values("created_at").groupby("resident_id"):
        rows.append(
            {
                "resident_id": resident_id,
                "plan_completed_share": (_safe_series(group, "status") == "Completed").mean(),
                "plan_in_progress_share": (_safe_series(group, "status") == "In Progress").mean(),
                "plan_category_diversity": _safe_series(group, "plan_category").nunique(),
            }
        )
    return pd.DataFrame(rows)


def _summarize_incidents(incidents: pd.DataFrame, reference_date: pd.Timestamp) -> pd.DataFrame:
    if incidents.empty:
        return pd.DataFrame(columns=["resident_id"])
    incidents = incidents.copy()
    incidents["incident_severity_score"] = _safe_series(incidents, "severity").map(SEVERITY_MAP).fillna(0)
    rows = []
    for resident_id, group in incidents.sort_values("incident_date").groupby("resident_id"):
        recent = group[group["incident_date"] >= reference_date - pd.Timedelta(days=180)]
        rows.append(
            {
                "resident_id": resident_id,
                "incident_recent_180d": len(recent),
                "incident_unresolved_count": (~_safe_series(group, "resolved", False).fillna(False)).sum(),
                "incident_high_severity_count": (_safe_series(group, "severity") == "High").sum(),
                "incident_count": len(group),
            }
        )
    return pd.DataFrame(rows)


def _prepare_dataset(
    residents: pd.DataFrame,
    education: pd.DataFrame,
    health: pd.DataFrame,
    visits: pd.DataFrame,
    process: pd.DataFrame,
    plans: pd.DataFrame,
    incidents: pd.DataFrame,
    safehouses: pd.DataFrame,
) -> tuple[pd.DataFrame, list[str], list[str], list[str]]:
    if residents.empty:
        return pd.DataFrame(), [], [], []

    residents = residents.copy()
    safehouses = safehouses.copy()
    residents["length_of_stay_months"] = _safe_series(residents, "length_of_stay").apply(_duration_to_months)
    residents["present_age_months"] = _safe_series(residents, "present_age").apply(_duration_to_months)

    for frame, date_col in [
        (education, "record_date"),
        (health, "record_date"),
        (visits, "visit_date"),
        (process, "session_date"),
        (plans, "updated_at"),
        (incidents, "incident_date"),
    ]:
        if not frame.empty and date_col in frame.columns:
            frame[date_col] = pd.to_datetime(frame[date_col], errors="coerce")

    reference_candidates = [
        _safe_series(education, "record_date").max(),
        _safe_series(health, "record_date").max(),
        _safe_series(visits, "visit_date").max(),
        _safe_series(process, "session_date").max(),
        _safe_series(plans, "updated_at").max(),
        _safe_series(incidents, "incident_date").max(),
    ]
    reference_date = max([value for value in reference_candidates if pd.notna(value)], default=pd.Timestamp.utcnow())

    edu_summary = _latest_and_trend(education, "resident_id", "record_date", ["attendance_rate", "progress_percent"], "education")
    health_summary = _latest_and_trend(
        health,
        "resident_id",
        "record_date",
        ["general_health_score", "sleep_quality_score", "energy_level_score"],
        "health",
    )
    visit_summary = _summarize_visits(visits, reference_date)
    process_summary = _summarize_process(process, reference_date)
    plan_summary = _summarize_interventions(plans)
    incident_summary = _summarize_incidents(incidents, reference_date)

    model_df = residents.merge(edu_summary, on="resident_id", how="left")
    for extra in [health_summary, visit_summary, process_summary, plan_summary, incident_summary]:
        model_df = model_df.merge(extra, on="resident_id", how="left")

    safehouse_map = safehouses.set_index("safehouse_id").get("name", pd.Series(dtype="object")).to_dict() if not safehouses.empty else {}
    model_df["safehouseName"] = model_df["safehouse_id"].map(safehouse_map)
    model_df["readiness_flag"] = (
        (_safe_series(model_df, "reintegration_status") == "Completed")
        | ((_safe_series(model_df, "case_status") == "Closed") & _safe_series(model_df, "reintegration_type").notna())
    ).astype(int)

    feature_cols = [
        "safehouse_id",
        "case_category",
        "referral_source",
        "initial_case_assessment",
        "initial_risk_level",
        "current_risk_level",
        "family_is_4ps",
        "family_solo_parent",
        "family_indigenous",
        "family_informal_settler",
        "has_special_needs",
        "length_of_stay_months",
        "present_age_months",
        "education_progress_percent_latest",
        "education_progress_percent_delta",
        "education_attendance_rate_latest",
        "health_general_health_score_latest",
        "health_general_health_score_delta",
        "health_sleep_quality_score_latest",
        "health_energy_level_score_latest",
        "visit_count_180d",
        "visit_favorable_share",
        "visit_safety_concern_rate",
        "visit_family_cooperation_mean",
        "process_sessions_90d",
        "process_concern_rate",
        "process_progress_rate",
        "process_emotion_shift_mean",
        "plan_completed_share",
        "plan_in_progress_share",
        "plan_category_diversity",
        "incident_recent_180d",
        "incident_unresolved_count",
        "incident_high_severity_count",
    ]
    feature_cols = [col for col in feature_cols if col in model_df.columns]
    numeric_cols = [col for col in feature_cols if pd.api.types.is_numeric_dtype(model_df[col])]
    categorical_cols = [col for col in feature_cols if col not in numeric_cols]
    return model_df, feature_cols, numeric_cols, categorical_cols


def build_reintegration_readiness_artifacts(
    residents: pd.DataFrame,
    education: pd.DataFrame,
    health: pd.DataFrame,
    visits: pd.DataFrame,
    process: pd.DataFrame,
    plans: pd.DataFrame,
    incidents: pd.DataFrame,
    safehouses: pd.DataFrame,
) -> ReintegrationReadinessArtifacts:
    model_df, feature_cols, numeric_cols, categorical_cols = _prepare_dataset(
        residents=residents,
        education=education.copy(),
        health=health.copy(),
        visits=visits.copy(),
        process=process.copy(),
        plans=plans.copy(),
        incidents=incidents.copy(),
        safehouses=safehouses.copy(),
    )
    if model_df.empty or model_df["readiness_flag"].nunique() < 2:
        fallback = model_df.copy()
        if not fallback.empty:
            fallback["readiness_probability"] = (
                (
                    pd.to_numeric(_safe_series(fallback, "education_progress_percent_latest"), errors="coerce").fillna(0) / 100 * 0.35
                    + pd.to_numeric(_safe_series(fallback, "health_general_health_score_latest"), errors="coerce").fillna(0) / 5 * 0.25
                    + pd.to_numeric(_safe_series(fallback, "plan_completed_share"), errors="coerce").fillna(0) * 0.2
                    + (1 - pd.to_numeric(_safe_series(fallback, "incident_recent_180d"), errors="coerce").fillna(0).clip(0, 10) / 10) * 0.2
                )
            ).clip(0, 1)
            fallback["readinessScore"] = (fallback["readiness_probability"] * 100).round(1)
            fallback["readiness_band"] = pd.cut(
                fallback["readiness_probability"],
                bins=[-np.inf, 0.4, 0.7, np.inf],
                labels=["Low", "Medium", "High"],
            ).astype(str)
            fallback = fallback.sort_values("readiness_probability", ascending=False)
        return ReintegrationReadinessArtifacts(fallback, pd.DataFrame(), None, False)

    preprocessor = _build_preprocessor(numeric_cols, categorical_cols)
    candidates: list[tuple[str, Any]] = [
        ("Logistic regression", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=RANDOM_STATE)),
        (
            "Random forest",
            RandomForestClassifier(
                n_estimators=300,
                max_depth=8,
                min_samples_leaf=2,
                class_weight="balanced",
                random_state=RANDOM_STATE,
            ),
        ),
        ("Gradient boosting", GradientBoostingClassifier(random_state=RANDOM_STATE)),
    ]

    cv = StratifiedKFold(n_splits=min(4, max(2, int(model_df["readiness_flag"].value_counts().min()))), shuffle=True, random_state=RANDOM_STATE)
    metrics_rows: list[dict[str, Any]] = []
    best_name = None
    best_score = -np.inf
    best_pipeline = None

    for name, model in candidates:
        pipeline = Pipeline([("preprocessor", preprocessor), ("model", model)])
        result = cross_validate(
            pipeline,
            model_df[feature_cols],
            model_df["readiness_flag"],
            cv=cv,
            scoring={"roc_auc": "roc_auc", "precision": "precision", "recall": "recall", "f1": "f1"},
        )
        score_row = {
            "model": name,
            "cvRocAuc": float(np.nanmean(result["test_roc_auc"])),
            "cvPrecision": float(np.nanmean(result["test_precision"])),
            "cvRecall": float(np.nanmean(result["test_recall"])),
            "cvF1": float(np.nanmean(result["test_f1"])),
        }
        metrics_rows.append(score_row)
        if score_row["cvRocAuc"] > best_score:
            best_score = score_row["cvRocAuc"]
            best_name = name
            best_pipeline = pipeline

    assert best_pipeline is not None
    best_pipeline.fit(model_df[feature_cols], model_df["readiness_flag"])
    model_df["readiness_probability"] = best_pipeline.predict_proba(model_df[feature_cols])[:, 1]
    model_df["readinessScore"] = (model_df["readiness_probability"] * 100).round(1)
    model_df["readiness_band"] = pd.cut(
        model_df["readiness_probability"],
        bins=[-np.inf, 0.4, 0.7, np.inf],
        labels=["Low", "Medium", "High"],
    ).astype(str)

    holdout_score = float(roc_auc_score(model_df["readiness_flag"], model_df["readiness_probability"])) if model_df["readiness_flag"].nunique() > 1 else np.nan
    metrics = pd.concat(
        [
            pd.DataFrame(metrics_rows),
            pd.DataFrame([{"model": best_name, "holdoutLikeRocAuc": holdout_score}]),
        ],
        ignore_index=True,
    )

    residents_ranked = model_df.sort_values(["readiness_probability", "education_progress_percent_latest"], ascending=[False, False]).reset_index(drop=True)
    return ReintegrationReadinessArtifacts(
        residents=residents_ranked,
        metrics=metrics,
        selected_model_name=best_name,
        is_trained=True,
    )
