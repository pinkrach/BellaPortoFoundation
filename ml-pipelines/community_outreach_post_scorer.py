#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.pipeline import Pipeline

from community_outreach_analytics_pipeline import (
    CATEGORICAL_FEATURES,
    SELECTED_FEATURES,
    as_bool,
    as_float,
    as_int,
    fit_model,
    make_preprocessor,
    prepare_dataframe,
    safe_round,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--posts-input", required=True)
    parser.add_argument("--payload-input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--artifact-dir", required=True)
    return parser.parse_args()


def normalize_payload(payload: dict[str, Any]) -> pd.DataFrame:
    normalized: dict[str, Any] = {}
    for feature in SELECTED_FEATURES:
        normalized[feature] = payload.get(feature)

    caption = str(payload.get("caption") or "").strip()
    if not normalized.get("caption_length") and caption:
        normalized["caption_length"] = len(caption)

    normalized["post_hour"] = as_int(normalized.get("post_hour"))
    normalized["num_hashtags"] = as_int(normalized.get("num_hashtags"))
    normalized["caption_length"] = as_int(normalized.get("caption_length"))
    normalized["boost_budget_php"] = as_float(normalized.get("boost_budget_php"))

    for column in ("has_call_to_action", "features_resident_story", "is_boosted"):
        value = as_bool(normalized.get(column))
        normalized[column] = "Yes" if value is True else "No" if value is False else None

    for column in CATEGORICAL_FEATURES:
        if column in {"has_call_to_action", "features_resident_story", "is_boosted"}:
            continue
        value = normalized.get(column)
        normalized[column] = str(value).strip() if value not in (None, "") else None

    platform = normalized.get("platform") or "Unknown"
    media_type = normalized.get("media_type") or "Unknown"
    normalized["platform_media"] = f"{platform} x {media_type}"
    resident_story = normalized.get("features_resident_story")
    cta = normalized.get("has_call_to_action")
    if resident_story == "Yes" and cta == "Yes":
        normalized["story_cta_combo"] = "story_with_cta"
    elif resident_story == "Yes":
        normalized["story_cta_combo"] = "story_no_cta"
    elif cta == "Yes":
        normalized["story_cta_combo"] = "cta_only"
    else:
        normalized["story_cta_combo"] = "neither"

    post_hour = normalized.get("post_hour")
    if post_hour is None:
        normalized["time_bucket"] = None
    elif post_hour <= 5:
        normalized["time_bucket"] = "overnight"
    elif post_hour <= 11:
        normalized["time_bucket"] = "morning"
    elif post_hour <= 17:
        normalized["time_bucket"] = "afternoon"
    else:
        normalized["time_bucket"] = "evening"

    return pd.DataFrame([normalized], columns=SELECTED_FEATURES)


def build_referral_classifier(df: pd.DataFrame) -> Pipeline:
    classifier = Pipeline(
        [
            ("prep", make_preprocessor()),
            ("model", RandomForestClassifier(n_estimators=300, min_samples_leaf=2, random_state=27)),
        ]
    )
    classifier.fit(df[SELECTED_FEATURES].copy(), df["likely_community_referral"].copy())
    return classifier


def build_share_rate_regressor(df: pd.DataFrame) -> Pipeline:
    regressor = Pipeline(
        [
            ("prep", make_preprocessor()),
            ("model", RandomForestRegressor(n_estimators=300, min_samples_leaf=2, random_state=27)),
        ]
    )
    regressor.fit(df[SELECTED_FEATURES].copy(), df["share_rate"].fillna(0).copy())
    return regressor


def main() -> None:
    args = parse_args()
    posts_input = Path(args.posts_input)
    payload_input = Path(args.payload_input)
    output_path = Path(args.output)
    artifact_dir = Path(args.artifact_dir)

    rows = json.loads(posts_input.read_text())
    payload = json.loads(payload_input.read_text())
    if not isinstance(rows, list):
        raise ValueError("Posts input must be a JSON array.")
    if not isinstance(payload, dict):
        raise ValueError("Payload input must be a JSON object.")

    df = prepare_dataframe(rows)
    if df.empty:
        raise ValueError("No social posts were available to train the scorer.")

    model_info = fit_model(df, artifact_dir)
    if not model_info.get("isTrained"):
        raise ValueError("The community outreach models could not be trained from the available data.")

    regressor_path = Path(str(model_info["artifacts"]["regressorPath"]))
    reach_regressor = joblib.load(regressor_path)
    referral_classifier = build_referral_classifier(df)
    share_rate_regressor = build_share_rate_regressor(df)

    payload_df = normalize_payload(payload)
    predicted_reach_score = float(reach_regressor.predict(payload_df)[0])
    predicted_referral_probability = float(referral_classifier.predict_proba(payload_df)[0, 1])
    predicted_share_rate = float(share_rate_regressor.predict(payload_df)[0])

    platform = str(payload.get("platform") or "").strip()
    platform_media_summary = (
        df.groupby(["platform", "media_type"], as_index=False)
        .agg(
            posts=("post_label", "size"),
            avgCommunityReachScore=("community_reach_score", "mean"),
            likelyCommunityReferralRate=("likely_community_referral", "mean"),
            avgShareRate=("share_rate", "mean"),
        )
        .sort_values(["platform", "avgCommunityReachScore", "posts"], ascending=[True, False, False])
    )
    platform_media_summary["stabilityFlag"] = platform_media_summary["posts"].map(
        lambda posts: "Trusted default" if posts >= 12 else "Promising, low sample" if posts >= 8 else "Too few posts"
    )

    selected_platform_media = []
    if platform:
        selected_platform_media = [
            {
                "mediaType": str(row["media_type"]),
                "posts": int(row["posts"]),
                "avgCommunityReachScore": safe_round(row["avgCommunityReachScore"]),
                "likelyCommunityReferralRate": safe_round(row["likelyCommunityReferralRate"]),
                "avgShareRate": safe_round(row["avgShareRate"]),
                "stabilityFlag": str(row["stabilityFlag"]),
            }
            for _, row in platform_media_summary.loc[platform_media_summary["platform"].eq(platform)].iterrows()
        ]

    result = {
        "prediction": {
            "predictedCommunityReachScore": safe_round(max(predicted_reach_score, 0)),
            "predictedCommunityReferralProbability": safe_round(min(max(predicted_referral_probability, 0), 1)),
            "predictedShareRate": safe_round(max(predicted_share_rate, 0)),
            "likelyAwarenessDriver": predicted_reach_score >= float(df["community_reach_score"].median()),
        },
        "selectedPlatform": platform or None,
        "selectedPlatformMedia": selected_platform_media,
    }

    output_path.write_text(json.dumps(result, indent=2))
    print(json.dumps({"ok": True, "output": str(output_path)}))


if __name__ == "__main__":
    main()
