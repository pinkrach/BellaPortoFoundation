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
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
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
    "time_bucket",
    "platform_media",
    "story_cta_combo",
]

NUMERIC_FEATURES = ["post_hour", "num_hashtags", "caption_length", "boost_budget_php"]
CATEGORICAL_FEATURES = [column for column in SELECTED_FEATURES if column not in NUMERIC_FEATURES]


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
    numeric = as_float(value)
    if numeric is None or np.isnan(numeric):
        return None
    return int(numeric)


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


def min_max_scale(series: pd.Series) -> pd.Series:
    numeric = pd.to_numeric(series, errors="coerce")
    minimum = numeric.min()
    maximum = numeric.max()
    if pd.isna(minimum) or pd.isna(maximum) or minimum == maximum:
        return pd.Series(np.zeros(len(series)), index=series.index)
    return (numeric - minimum) / (maximum - minimum)


def safe_divide(numerator: pd.Series, denominator: pd.Series) -> pd.Series:
    denominator = pd.to_numeric(denominator, errors="coerce").replace(0, np.nan)
    return pd.to_numeric(numerator, errors="coerce") / denominator


def build_post_label(row: pd.Series) -> str:
    platform = str(row.get("platform") or "Unknown").strip()
    post_type = str(row.get("post_type") or "Post").strip()
    created = row.get("created_at")
    stamp = created.strftime("%Y-%m-%d") if isinstance(created, pd.Timestamp) and not pd.isna(created) else "undated"
    return f"{post_type} on {platform} ({stamp})"


def prepare_dataframe(rows: list[dict[str, Any]]) -> pd.DataFrame:
    df = pd.DataFrame(rows)
    if df.empty:
        return df

    required_columns = SELECTED_FEATURES + [
        "created_at",
        "reach",
        "shares",
        "saves",
        "click_throughs",
        "profile_visits",
        "forwards",
        "watch_time_seconds",
        "avg_view_duration_seconds",
        "likes",
        "comments",
        "impressions",
        "caption",
    ]
    for column in required_columns:
        if column not in df.columns:
            df[column] = None

    df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce", utc=True)
    numeric_columns = [
        "post_hour",
        "num_hashtags",
        "caption_length",
        "boost_budget_php",
        "reach",
        "shares",
        "saves",
        "click_throughs",
        "profile_visits",
        "forwards",
        "watch_time_seconds",
        "avg_view_duration_seconds",
        "likes",
        "comments",
        "impressions",
    ]
    for column in numeric_columns:
        if column == "post_hour" or column == "num_hashtags" or column == "caption_length":
            df[column] = df[column].apply(as_int)
        else:
            df[column] = df[column].apply(as_float)

    for column in ["has_call_to_action", "features_resident_story", "is_boosted"]:
        df[column] = df[column].apply(as_bool)

    df["day_of_week"] = df["day_of_week"].fillna(df["created_at"].dt.day_name())
    df["post_hour"] = df["post_hour"].fillna(df["created_at"].dt.hour)
    df["caption_length"] = df["caption_length"].fillna(df["caption"].fillna("").astype(str).str.len())
    df["boost_budget_php"] = df["boost_budget_php"].fillna(0)
    df["forwards"] = df["forwards"].fillna(0)
    df["watch_time_seconds"] = df["watch_time_seconds"].fillna(0)
    df["avg_view_duration_seconds"] = df["avg_view_duration_seconds"].fillna(0)

    for column in CATEGORICAL_FEATURES:
        if column in {"has_call_to_action", "features_resident_story", "is_boosted"}:
            df[column] = df[column].map(lambda value: "Yes" if value is True else "No" if value is False else None)
        else:
            df[column] = df[column].map(lambda value: str(value).strip() if value not in [None, ""] else None)

    df["engagement_rate_manual"] = (
        df["likes"].fillna(0) + df["comments"].fillna(0) + df["shares"].fillna(0) + df["saves"].fillna(0)
    ) / df["reach"].replace(0, np.nan)
    df["share_rate"] = safe_divide(df["shares"], df["reach"])
    df["save_rate"] = safe_divide(df["saves"], df["reach"])
    df["forward_rate"] = safe_divide(df["forwards"], df["reach"])
    df["click_rate"] = safe_divide(df["click_throughs"], df["reach"])
    df["awareness_lift_proxy"] = (
        df["share_rate"].fillna(0) * 0.45
        + df["forward_rate"].fillna(0) * 0.30
        + df["click_rate"].fillna(0) * 0.25
    )

    df["time_bucket"] = pd.cut(
        df["post_hour"],
        bins=[-1, 5, 11, 17, 23],
        labels=["overnight", "morning", "afternoon", "evening"],
    ).astype("object")
    df["platform_media"] = df["platform"].fillna("Unknown") + " x " + df["media_type"].fillna("Unknown")
    df["story_cta_combo"] = np.where(
        (df["features_resident_story"] == "Yes") & (df["has_call_to_action"] == "Yes"),
        "story_with_cta",
        np.where(
            df["features_resident_story"] == "Yes",
            "story_no_cta",
            np.where(df["has_call_to_action"] == "Yes", "cta_only", "neither"),
        ),
    )

    normalized = pd.DataFrame(
        {
            "reach": min_max_scale(df["reach"]),
            "shares": min_max_scale(df["shares"]),
            "saves": min_max_scale(df["saves"]),
            "forwards": min_max_scale(df["forwards"]),
            "clicks": min_max_scale(df["click_throughs"]),
        }
    )
    df["community_reach_score"] = (
        0.30 * normalized["reach"]
        + 0.25 * normalized["shares"]
        + 0.20 * normalized["saves"]
        + 0.15 * normalized["forwards"]
        + 0.10 * normalized["clicks"]
    )
    share_cutoff = pd.to_numeric(df["shares"], errors="coerce").median()
    click_cutoff = pd.to_numeric(df["click_throughs"], errors="coerce").median()
    df["likely_community_referral"] = (
        (pd.to_numeric(df["shares"], errors="coerce").fillna(0) >= share_cutoff)
        & (pd.to_numeric(df["click_throughs"], errors="coerce").fillna(0) >= click_cutoff)
    ).astype(int)
    df["post_label"] = df.apply(build_post_label, axis=1)
    return df.sort_values("created_at", na_position="last").reset_index(drop=True)


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


def fit_model(df: pd.DataFrame, artifact_dir: Path) -> dict[str, Any]:
    result: dict[str, Any] = {
        "isTrained": False,
        "testRmse": None,
        "testMae": None,
        "testR2": None,
        "scoredRows": [],
        "topDrivers": [],
    }
    if len(df) < 25:
        return result

    model_df = df.dropna(subset=["created_at"]).copy()
    if len(model_df) < 25:
        return result

    split_index = max(int(len(model_df) * 0.8), 20)
    split_index = min(split_index, len(model_df) - 5)
    if split_index <= 0:
        return result

    train_df = model_df.iloc[:split_index].copy()
    test_df = model_df.iloc[split_index:].copy()
    X_train = train_df[SELECTED_FEATURES].copy()
    y_train = train_df["community_reach_score"].copy()
    X_test = test_df[SELECTED_FEATURES].copy()
    y_test = test_df["community_reach_score"].copy()

    model = Pipeline(
        [
            ("prep", make_preprocessor()),
            ("model", RandomForestRegressor(n_estimators=300, min_samples_leaf=2, random_state=27)),
        ]
    )
    model.fit(X_train, y_train)
    predictions = model.predict(X_test)

    scored_df = df.copy()
    scored_df["predicted_community_reach_score"] = model.predict(df[SELECTED_FEATURES].copy())

    feature_names = model.named_steps["prep"].get_feature_names_out()
    importances = model.named_steps["model"].feature_importances_
    top_drivers = (
        pd.DataFrame({"feature": feature_names, "importance": importances})
        .sort_values("importance", ascending=False)
        .head(8)
    )

    artifact_dir.mkdir(parents=True, exist_ok=True)
    model_path = artifact_dir / "social_community_live_random_forest.joblib"
    joblib.dump(model, model_path)

    result.update(
        {
            "isTrained": True,
            "testRmse": safe_round(np.sqrt(mean_squared_error(y_test, predictions)), 4),
            "testMae": safe_round(mean_absolute_error(y_test, predictions), 4),
            "testR2": safe_round(r2_score(y_test, predictions), 4),
            "scoredRows": scored_df.to_dict(orient="records"),
            "topDrivers": top_drivers.to_dict(orient="records"),
            "artifacts": {"regressorPath": str(model_path)},
        }
    )
    return result


def build_summary(df: pd.DataFrame, model_info: dict[str, Any]) -> dict[str, Any]:
    now_iso = datetime.now(timezone.utc).isoformat()
    model_public = {key: value for key, value in model_info.items() if key != "scoredRows"}
    if df.empty:
        return {
            "generatedAt": now_iso,
            "dataset": {"rowCount": 0},
            "model": model_public,
            "kpis": [],
            "postTypeReachChart": [],
            "platformReachChart": [],
            "platformMediaChart": [],
            "platformTrustedMedia": [],
            "timeBucketChart": [],
            "liftMetrics": [],
            "timingSignals": [],
            "recommendations": [],
            "summary": {"headline": "No outreach posts were available to analyze.", "bestPlatform": "N/A", "bestFormat": "N/A"},
        }

    scored_df = pd.DataFrame(model_info.get("scoredRows", [])) if model_info.get("scoredRows") else df.copy()
    if "predicted_community_reach_score" not in scored_df.columns:
        scored_df["predicted_community_reach_score"] = np.nan

    post_type_reach = (
        df.dropna(subset=["post_type"])
        .groupby("post_type", as_index=False)
        .agg(posts=("post_label", "size"), avgCommunityReachScore=("community_reach_score", "mean"))
        .sort_values(["avgCommunityReachScore", "posts"], ascending=[False, False])
    )
    platform_reach = (
        df.dropna(subset=["platform"])
        .groupby("platform", as_index=False)
        .agg(
            posts=("post_label", "size"),
            avgCommunityReachScore=("community_reach_score", "mean"),
            avgReach=("reach", "mean"),
        )
        .sort_values(["avgCommunityReachScore", "posts"], ascending=[False, False])
    )
    platform_media_reach = (
        df.dropna(subset=["platform", "media_type"])
        .groupby(["platform", "media_type"], as_index=False)
        .agg(
            posts=("post_label", "size"),
            avgCommunityReachScore=("community_reach_score", "mean"),
            likelyCommunityReferralRate=("likely_community_referral", "mean"),
            avgShareRate=("share_rate", "mean"),
        )
        .sort_values(["platform", "avgCommunityReachScore", "posts"], ascending=[True, False, False])
    )
    platform_media_reach["stabilityFlag"] = platform_media_reach["posts"].map(
        lambda posts: "Trusted default" if posts >= 12 else "Promising, low sample" if posts >= 8 else "Too few posts"
    )
    time_bucket_reach = (
        df.dropna(subset=["time_bucket"])
        .groupby("time_bucket", as_index=False)
        .agg(posts=("post_label", "size"), avgCommunityReachScore=("community_reach_score", "mean"))
        .sort_values(["avgCommunityReachScore", "posts"], ascending=[False, False])
    )

    def lift_metric(feature_col: str, with_label: str, without_label: str) -> dict[str, Any]:
        with_mask = df[feature_col] == "Yes"
        without_mask = df[feature_col] == "No"
        with_rate = safe_round(df.loc[with_mask, "likely_community_referral"].mean())
        without_rate = safe_round(df.loc[without_mask, "likely_community_referral"].mean())
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

    best_platform = platform_reach.iloc[0]["platform"] if not platform_reach.empty else "N/A"
    best_format = post_type_reach.iloc[0]["post_type"] if not post_type_reach.empty else "N/A"
    best_time_bucket = time_bucket_reach.iloc[0]["time_bucket"] if not time_bucket_reach.empty else "N/A"
    best_story_combo = lift_metric("features_resident_story", "Resident story", "No resident story")
    best_cta_combo = lift_metric("has_call_to_action", "CTA", "No CTA")

    recommendations = [
        f"Start outreach-first campaigns on {best_platform} because it currently has the strongest community reach profile.",
        f"Use {best_format} when the goal is broad awareness and community sharing rather than direct fundraising conversion.",
        f"Default scheduling toward the {best_time_bucket} window unless the campaign has strong platform-specific constraints.",
    ]
    if best_story_combo.get("liftPoints") is not None:
        recommendations.append(
            f"Resident-story posts currently improve the community-referral proxy by about {best_story_combo['liftPoints']} percentage points."
        )

    top_scored = scored_df.sort_values(["predicted_community_reach_score", "shares", "click_throughs"], ascending=[False, False, False]).head(8)

    return {
        "generatedAt": now_iso,
        "dataset": {
            "rowCount": int(len(df)),
            "dateMin": df["created_at"].min().isoformat() if df["created_at"].notna().any() else None,
            "dateMax": df["created_at"].max().isoformat() if df["created_at"].notna().any() else None,
            "avgCommunityReachScore": safe_round(df["community_reach_score"].mean(), 4),
            "avgShareRate": safe_round(df["share_rate"].mean(), 4),
            "likelyCommunityReferralRate": safe_round(df["likely_community_referral"].mean(), 4),
        },
        "model": model_public,
        "kpis": [
            {"label": "Avg community reach score", "value": round((df["community_reach_score"].mean() or 0) * 100, 1), "detail": "Weighted score across reach, shares, saves, forwards, and clicks", "unit": "%"},
            {"label": "Avg share rate", "value": round((df["share_rate"].mean() or 0) * 100, 1), "detail": "Average shares divided by reach", "unit": "%"},
            {"label": "Best outreach platform", "value": None, "detail": str(best_platform)},
            {"label": "Best outreach format", "value": None, "detail": str(best_format)},
        ],
        "postTypeReachChart": [
            {
                "postType": str(row["post_type"]),
                "posts": int(row["posts"]),
                "avgCommunityReachScore": safe_round(row["avgCommunityReachScore"], 4),
            }
            for _, row in post_type_reach.head(8).iterrows()
        ],
        "platformReachChart": [
            {
                "platform": str(row["platform"]),
                "posts": int(row["posts"]),
                "avgCommunityReachScore": safe_round(row["avgCommunityReachScore"], 4),
                "avgReach": safe_round(row["avgReach"], 2),
            }
            for _, row in platform_reach.head(8).iterrows()
        ],
        "platformMediaChart": [
            {
                "platform": str(row["platform"]),
                "mediaType": str(row["media_type"]),
                "posts": int(row["posts"]),
                "avgCommunityReachScore": safe_round(row["avgCommunityReachScore"], 4),
                "likelyCommunityReferralRate": safe_round(row["likelyCommunityReferralRate"], 4),
                "avgShareRate": safe_round(row["avgShareRate"], 4),
                "stabilityFlag": str(row["stabilityFlag"]),
            }
            for _, row in platform_media_reach.iterrows()
        ],
        "platformTrustedMedia": [
            {
                "platform": str(group.iloc[0]["platform"]),
                "bestMediaType": str(group.iloc[0]["media_type"]),
                "posts": int(group.iloc[0]["posts"]),
                "avgCommunityReachScore": safe_round(group.iloc[0]["avgCommunityReachScore"], 4),
                "likelyCommunityReferralRate": safe_round(group.iloc[0]["likelyCommunityReferralRate"], 4),
                "avgShareRate": safe_round(group.iloc[0]["avgShareRate"], 4),
                "stabilityFlag": str(group.iloc[0]["stabilityFlag"]),
            }
            for _, group in platform_media_reach.loc[platform_media_reach["posts"] >= 12].groupby("platform", sort=False)
        ],
        "timeBucketChart": [
            {
                "timeBucket": str(row["time_bucket"]),
                "posts": int(row["posts"]),
                "avgCommunityReachScore": safe_round(row["avgCommunityReachScore"], 4),
            }
            for _, row in time_bucket_reach.head(8).iterrows()
        ],
        "liftMetrics": [best_story_combo, best_cta_combo],
        "timingSignals": [
            {"label": "Best time bucket", "value": str(best_time_bucket), "detail": "Highest current community reach score by posting window"},
            {"label": "Best outreach platform", "value": str(best_platform), "detail": "Highest current average community reach score by platform"},
            {"label": "Best outreach format", "value": str(best_format), "detail": "Highest current average community reach score by post type"},
            {
                "label": "Boosted winner",
                "value": "Boosted" if df.loc[df["is_boosted"] == "Yes", "community_reach_score"].mean() >= df.loc[df["is_boosted"] == "No", "community_reach_score"].mean() else "Organic",
                "detail": "Which posting mode currently has the higher average community reach score",
            },
        ],
        "summary": {
            "headline": f"Current outreach data points to {best_format} on {best_platform} as the strongest awareness-building combination.",
            "bestPlatform": str(best_platform),
            "bestFormat": str(best_format),
        },
        "recommendations": recommendations,
        "topDrivers": model_public.get("topDrivers", []),
        "scoredPosts": [
            {
                "label": str(row.get("post_label") or "Post"),
                "platform": row.get("platform"),
                "postType": row.get("post_type"),
                "createdAt": row.get("created_at").isoformat() if isinstance(row.get("created_at"), pd.Timestamp) and not pd.isna(row.get("created_at")) else None,
                "predictedCommunityReachScore": safe_round(row.get("predicted_community_reach_score"), 4),
                "shareRate": safe_round(row.get("share_rate"), 4),
                "clickRate": safe_round(row.get("click_rate"), 4),
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
    model_info = fit_model(df, artifact_dir)
    summary = build_summary(df, model_info)

    artifact_dir.mkdir(parents=True, exist_ok=True)
    (artifact_dir / "social_community_summary.json").write_text(json.dumps(summary, indent=2))
    output_path.write_text(json.dumps(summary, indent=2))
    print(json.dumps({"ok": True, "rows": len(df), "output": str(output_path)}))


if __name__ == "__main__":
    main()
