#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    average_precision_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


SELECTED_FEATURES = [
    "platform",
    "day_of_week",
    "post_hour",
    "post_type",
    "media_type",
    "num_hashtags",
    "has_call_to_action",
    "call_to_action_type",
    "content_topic",
    "sentiment_tone",
    "caption_length",
    "features_resident_story",
    "campaign_name",
    "is_boosted",
    "boost_budget_php",
]

NUMERIC_FEATURES = ["post_hour", "num_hashtags", "caption_length", "boost_budget_php"]
CATEGORICAL_FEATURES = [col for col in SELECTED_FEATURES if col not in NUMERIC_FEATURES]
REFERRAL_THRESHOLD = 0.55


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--artifact-dir", required=True)
    return parser.parse_args()


def as_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def as_int(value: Any) -> int | None:
    num = as_float(value)
    if num is None or np.isnan(num):
        return None
    return int(num)


def as_bool(value: Any) -> bool | None:
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


def build_post_label(row: pd.Series) -> str:
    campaign = str(row.get("campaign_name") or "").strip()
    post_type = str(row.get("post_type") or "Post").strip()
    platform = str(row.get("platform") or "Unknown").strip()
    created = row.get("created_at")
    stamp = created.strftime("%Y-%m-%d") if isinstance(created, pd.Timestamp) and not pd.isna(created) else "undated"
    if campaign:
        return f"{campaign} ({platform}, {stamp})"
    return f"{post_type} on {platform} ({stamp})"


def prepare_dataframe(rows: list[dict[str, Any]]) -> pd.DataFrame:
    df = pd.DataFrame(rows)
    if df.empty:
        return df

    for col in SELECTED_FEATURES + [
        "created_at",
        "donation_referrals",
        "estimated_donation_value_php",
        "caption",
    ]:
        if col not in df.columns:
            df[col] = None

    df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce", utc=True)
    df["post_hour"] = df["post_hour"].apply(as_int)
    df["num_hashtags"] = df["num_hashtags"].apply(as_int)
    df["caption_length"] = df["caption_length"].apply(as_int)
    df["boost_budget_php"] = df["boost_budget_php"].apply(as_float)
    df["donation_referrals"] = df["donation_referrals"].apply(as_float).fillna(0)
    df["estimated_donation_value_php"] = df["estimated_donation_value_php"].apply(as_float).fillna(0)
    df["has_call_to_action"] = df["has_call_to_action"].apply(as_bool)
    df["features_resident_story"] = df["features_resident_story"].apply(as_bool)
    df["is_boosted"] = df["is_boosted"].apply(as_bool)

    for col in CATEGORICAL_FEATURES:
        if col in {"has_call_to_action", "features_resident_story", "is_boosted"}:
            df[col] = df[col].map(lambda value: "Yes" if value is True else "No" if value is False else None)
        else:
            df[col] = df[col].map(lambda value: str(value).strip() if value not in [None, ""] else None)

    df["has_referral"] = (df["donation_referrals"] > 0).astype(int)
    df["post_label"] = df.apply(build_post_label, axis=1)
    df = df.sort_values("created_at", na_position="last").reset_index(drop=True)
    return df


def make_preprocessor() -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("numeric", Pipeline([("imputer", SimpleImputer(strategy="median"))]), NUMERIC_FEATURES),
            (
                "categorical",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("encoder", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                CATEGORICAL_FEATURES,
            ),
        ]
    )


def fit_models(df: pd.DataFrame, artifact_dir: Path) -> dict[str, Any]:
    artifact_dir.mkdir(parents=True, exist_ok=True)
    result: dict[str, Any] = {
        "isTrained": False,
        "threshold": REFERRAL_THRESHOLD,
        "precision": None,
        "recall": None,
        "f1": None,
        "rocAuc": None,
        "averagePrecision": None,
        "scoredRows": [],
    }

    if len(df) < 25 or df["has_referral"].nunique() < 2:
        return result

    model_df = df.dropna(subset=["created_at"]).copy()
    if len(model_df) < 25 or model_df["has_referral"].nunique() < 2:
        return result

    split_index = max(int(len(model_df) * 0.8), 20)
    split_index = min(split_index, len(model_df) - 5)
    if split_index <= 0:
        return result

    train_df = model_df.iloc[:split_index].copy()
    test_df = model_df.iloc[split_index:].copy()
    if len(test_df) < 5 or train_df["has_referral"].nunique() < 2 or test_df["has_referral"].nunique() < 2:
        return result

    X_train = train_df[SELECTED_FEATURES].copy()
    X_test = test_df[SELECTED_FEATURES].copy()
    y_train = train_df["has_referral"].copy()
    y_test = test_df["has_referral"].copy()

    classifier = Pipeline(
        [
            ("prep", make_preprocessor()),
            (
                "model",
                RandomForestClassifier(
                    n_estimators=300,
                    min_samples_leaf=2,
                    random_state=42,
                ),
            ),
        ]
    )
    classifier.fit(X_train, y_train)
    test_prob = classifier.predict_proba(X_test)[:, 1]
    test_pred = (test_prob >= REFERRAL_THRESHOLD).astype(int)

    result.update(
        {
            "isTrained": True,
            "precision": safe_round(precision_score(y_test, test_pred, zero_division=0)),
            "recall": safe_round(recall_score(y_test, test_pred, zero_division=0)),
            "f1": safe_round(f1_score(y_test, test_pred, zero_division=0)),
            "rocAuc": safe_round(roc_auc_score(y_test, test_prob)),
            "averagePrecision": safe_round(average_precision_score(y_test, test_prob)),
        }
    )

    all_prob = classifier.predict_proba(df[SELECTED_FEATURES].copy())[:, 1]
    scored_df = df.copy()
    scored_df["predicted_referral_probability"] = all_prob

    regressor = Pipeline(
        [
            ("prep", make_preprocessor()),
            (
                "model",
                RandomForestRegressor(
                    n_estimators=300,
                    min_samples_leaf=2,
                    random_state=42,
                ),
            ),
        ]
    )
    regressor.fit(train_df[SELECTED_FEATURES].copy(), train_df["estimated_donation_value_php"].copy())
    scored_df["predicted_donation_value_php"] = regressor.predict(df[SELECTED_FEATURES].copy())

    classifier_path = artifact_dir / "social_referral_live_random_forest.joblib"
    regressor_path = artifact_dir / "social_donation_live_random_forest.joblib"
    joblib.dump(classifier, classifier_path)
    joblib.dump(regressor, regressor_path)

    result["artifacts"] = {
        "classifierPath": str(classifier_path),
        "regressorPath": str(regressor_path),
    }
    result["scoredRows"] = scored_df.to_dict(orient="records")
    return result


def summarize_group(
    df: pd.DataFrame,
    group_col: str,
    value_col: str,
    agg_name: str,
    ascending: bool = False,
    limit: int = 6,
) -> list[dict[str, Any]]:
    if df.empty or group_col not in df.columns:
        return []
    grouped = (
        df.dropna(subset=[group_col])
        .groupby(group_col, as_index=False)
        .agg(posts=("post_label", "size"), value=(value_col, "mean"))
        .sort_values(["value", "posts"], ascending=[ascending, False])
        .head(limit)
    )
    return [
        {
            "label": str(row[group_col]),
            "posts": int(row["posts"]),
            agg_name: safe_round(row["value"], 4),
        }
        for _, row in grouped.iterrows()
    ]


def build_summary(df: pd.DataFrame, model_info: dict[str, Any]) -> dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    model_public = {
        key: value
        for key, value in model_info.items()
        if key not in {"scoredRows"}
    }

    if df.empty:
        return {
            "generatedAt": now_iso,
            "dataset": {"rowCount": 0},
            "model": model_public,
            "kpis": [],
            "postTypeReferralChart": [],
            "postTypeValueChart": [],
            "liftMetrics": [],
            "hourPerformance": [],
            "recommendations": [],
            "scoredPosts": [],
        }

    scored_df = pd.DataFrame(model_info.get("scoredRows", [])) if model_info.get("scoredRows") else df.copy()
    if "predicted_referral_probability" not in scored_df.columns:
        scored_df["predicted_referral_probability"] = np.nan
    if "predicted_donation_value_php" not in scored_df.columns:
        scored_df["predicted_donation_value_php"] = np.nan

    post_type_referral = (
        df.dropna(subset=["post_type"])
        .groupby("post_type", as_index=False)
        .agg(
            posts=("post_label", "size"),
            referralRate=("has_referral", "mean"),
        )
        .sort_values(["referralRate", "posts"], ascending=[False, False])
    )

    post_type_value = (
        df.dropna(subset=["post_type"])
        .groupby("post_type", as_index=False)
        .agg(
            posts=("post_label", "size"),
            avgDonationValuePhp=("estimated_donation_value_php", "mean"),
        )
        .sort_values(["avgDonationValuePhp", "posts"], ascending=[False, False])
    )

    def lift_metric(feature_col: str, with_label: str, without_label: str) -> dict[str, Any]:
        with_mask = df[feature_col] == "Yes"
        without_mask = df[feature_col] == "No"
        with_rate = safe_round(df.loc[with_mask, "has_referral"].mean())
        without_rate = safe_round(df.loc[without_mask, "has_referral"].mean())
        lift_points = None
        if with_rate is not None and without_rate is not None:
            lift_points = round((with_rate - without_rate) * 100, 1)
        return {
            "factor": with_label,
            "withLabel": with_label,
            "withoutLabel": without_label,
            "withRate": with_rate,
            "withoutRate": without_rate,
            "liftPoints": lift_points,
        }

    best_referral_type = post_type_referral.iloc[0]["post_type"] if not post_type_referral.empty else "N/A"
    best_value_type = post_type_value.iloc[0]["post_type"] if not post_type_value.empty else "N/A"
    best_hour_referral = summarize_group(df, "post_hour", "has_referral", "referralRate", ascending=False, limit=8)
    best_hour_value = summarize_group(df, "post_hour", "estimated_donation_value_php", "avgDonationValuePhp", ascending=False, limit=8)
    best_tone_referral = summarize_group(df, "sentiment_tone", "has_referral", "referralRate", ascending=False, limit=5)
    best_tone_value = summarize_group(df, "sentiment_tone", "estimated_donation_value_php", "avgDonationValuePhp", ascending=False, limit=5)

    posts_above_threshold = 0
    if "predicted_referral_probability" in scored_df.columns:
        posts_above_threshold = int((scored_df["predicted_referral_probability"] >= REFERRAL_THRESHOLD).sum())

    avg_donation_value = safe_round(df["estimated_donation_value_php"].mean(), 2) or 0
    referral_rate = safe_round(df["has_referral"].mean(), 4) or 0
    model_precision = model_info.get("precision")
    resident_story_lift = lift_metric("features_resident_story", "Resident story", "No resident story")
    cta_lift = lift_metric("has_call_to_action", "CTA", "No CTA")

    recommendations = [
        f"Prioritize {best_referral_type} posts first because they currently lead the dataset for referral performance.",
        f"Use {best_value_type} when the team wants stronger average donation value per post.",
    ]
    if resident_story_lift.get("liftPoints") is not None:
        recommendations.append(
            f"Adding a resident story currently improves referral rate by about {resident_story_lift['liftPoints']} percentage points."
        )
    if cta_lift.get("liftPoints") is not None:
        recommendations.append(
            f"Adding a CTA currently improves referral rate by about {cta_lift['liftPoints']} percentage points."
        )

    top_scored = (
        scored_df.sort_values(["predicted_referral_probability", "estimated_donation_value_php"], ascending=[False, False])
        .head(8)
    )

    return {
        "generatedAt": now_iso,
        "dataset": {
            "rowCount": int(len(df)),
            "dateMin": df["created_at"].min().isoformat() if df["created_at"].notna().any() else None,
            "dateMax": df["created_at"].max().isoformat() if df["created_at"].notna().any() else None,
            "referralRate": referral_rate,
            "avgDonationValuePhp": avg_donation_value,
            "postsAboveThreshold": posts_above_threshold,
        },
        "model": model_public,
        "kpis": [
            {
                "label": "Posts analyzed",
                "value": int(len(df)),
                "detail": "Current social media dataset",
            },
            {
                "label": "Referral rate",
                "value": round(referral_rate * 100, 1),
                "detail": "Posts that generated at least one referral",
                "unit": "%",
            },
            {
                "label": "Model precision",
                "value": round((model_precision or 0) * 100, 1) if model_precision is not None else None,
                "detail": f"At the {int(REFERRAL_THRESHOLD * 100)}% decision threshold",
                "unit": "%",
            },
            {
                "label": "Avg donation value",
                "value": avg_donation_value,
                "detail": "Average estimated donation value per post",
                "unit": "PHP",
            },
        ],
        "postTypeReferralChart": [
            {
                "postType": str(row["post_type"]),
                "posts": int(row["posts"]),
                "referralRate": safe_round(row["referralRate"]),
            }
            for _, row in post_type_referral.head(8).iterrows()
        ],
        "postTypeValueChart": [
            {
                "postType": str(row["post_type"]),
                "posts": int(row["posts"]),
                "avgDonationValuePhp": safe_round(row["avgDonationValuePhp"], 2),
            }
            for _, row in post_type_value.head(8).iterrows()
        ],
        "liftMetrics": [resident_story_lift, cta_lift],
        "hourPerformance": best_hour_referral,
        "tonePerformance": best_tone_referral,
        "timingSignals": [
            {
                "label": "Best referral hour",
                "value": best_hour_referral[0]["label"] if best_hour_referral else "N/A",
                "detail": "Highest current referral rate by posting hour",
            },
            {
                "label": "Best donation-value hour",
                "value": best_hour_value[0]["label"] if best_hour_value else "N/A",
                "detail": "Highest current average donation value by posting hour",
            },
            {
                "label": "Best referral tone",
                "value": best_tone_referral[0]["label"] if best_tone_referral else "N/A",
                "detail": "Highest current referral rate by tone",
            },
            {
                "label": "Best donation-value tone",
                "value": best_tone_value[0]["label"] if best_tone_value else "N/A",
                "detail": "Highest current average donation value by tone",
            },
        ],
        "summary": {
            "headline": f"Current data suggests starting with {best_referral_type} posts when the goal is more donation referrals.",
            "bestOverallFormat": best_referral_type,
            "bestValueFormat": best_value_type,
        },
        "recommendations": recommendations,
        "scoredPosts": [
            {
                "label": str(row.get("post_label") or "Post"),
                "platform": row.get("platform"),
                "postType": row.get("post_type"),
                "createdAt": row.get("created_at").isoformat() if isinstance(row.get("created_at"), pd.Timestamp) and not pd.isna(row.get("created_at")) else None,
                "predictedReferralProbability": safe_round(row.get("predicted_referral_probability")),
                "actualDonationValuePhp": safe_round(row.get("estimated_donation_value_php"), 2),
                "predictedDonationValuePhp": safe_round(row.get("predicted_donation_value_php"), 2),
            }
            for _, row in top_scored.iterrows()
        ],
    }


def main() -> None:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)
    artifact_dir = Path(args.artifact_dir)

    rows = json.loads(input_path.read_text())
    if not isinstance(rows, list):
        raise ValueError("Input JSON must be an array of social media post rows.")

    df = prepare_dataframe(rows)
    model_info = fit_models(df, artifact_dir)
    summary = build_summary(df, model_info)

    artifact_dir.mkdir(parents=True, exist_ok=True)
    (artifact_dir / "social_dashboard_summary.json").write_text(json.dumps(summary, indent=2))
    output_path.write_text(json.dumps(summary, indent=2))
    print(json.dumps({"ok": True, "rows": len(df), "output": str(output_path)}))


if __name__ == "__main__":
    main()
