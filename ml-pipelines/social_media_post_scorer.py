#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.pipeline import Pipeline

from social_media_analytics_pipeline import (
    CATEGORICAL_FEATURES,
    NUMERIC_FEATURES,
    REFERRAL_THRESHOLD,
    SELECTED_FEATURES,
    as_bool,
    as_float,
    as_int,
    fit_models,
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

    for col in ("has_call_to_action", "features_resident_story", "is_boosted"):
        value = as_bool(normalized.get(col))
        normalized[col] = "Yes" if value is True else "No" if value is False else None

    for col in CATEGORICAL_FEATURES:
        if col in {"has_call_to_action", "features_resident_story", "is_boosted"}:
            continue
        value = normalized.get(col)
        normalized[col] = str(value).strip() if value not in (None, "") else None

    return pd.DataFrame([normalized], columns=SELECTED_FEATURES)


def build_referral_count_regressor(df: pd.DataFrame) -> Pipeline | None:
    if df.empty:
        return None
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
    regressor.fit(df[SELECTED_FEATURES].copy(), df["donation_referrals"].copy())
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

    model_info = fit_models(df, artifact_dir)
    if not model_info.get("isTrained"):
        raise ValueError("The social scoring models could not be trained from the available data.")

    classifier_path = Path(str(model_info["artifacts"]["classifierPath"]))
    regressor_path = Path(str(model_info["artifacts"]["regressorPath"]))
    classifier = joblib.load(classifier_path)
    donation_regressor = joblib.load(regressor_path)
    referral_count_regressor = build_referral_count_regressor(df)

    payload_df = normalize_payload(payload)
    referral_probability = float(classifier.predict_proba(payload_df)[0, 1])
    predicted_donation_value = float(donation_regressor.predict(payload_df)[0])
    predicted_referral_count = float(referral_count_regressor.predict(payload_df)[0]) if referral_count_regressor is not None else None

    platform = str(payload.get("platform") or "").strip()
    platform_media_summary = (
        df.groupby(["platform", "media_type"], as_index=False)
        .agg(
            posts=("post_label", "size"),
            referralRate=("has_referral", "mean"),
            avgDonationValuePhp=("estimated_donation_value_php", "mean"),
        )
        .sort_values(["platform", "referralRate", "avgDonationValuePhp"], ascending=[True, False, False])
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
                "referralRate": safe_round(row["referralRate"]),
                "avgDonationValuePhp": safe_round(row["avgDonationValuePhp"], 2),
                "stabilityFlag": str(row["stabilityFlag"]),
            }
            for _, row in platform_media_summary.loc[platform_media_summary["platform"].eq(platform)].iterrows()
        ]

    result = {
        "prediction": {
            "predictedReferralProbability": safe_round(referral_probability),
            "predictedReferralCount": safe_round(max(predicted_referral_count or 0, 0), 2),
            "predictedDonationValuePhp": safe_round(max(predicted_donation_value, 0), 2),
            "likelyReferralDriver": referral_probability >= REFERRAL_THRESHOLD,
        },
        "selectedPlatform": platform or None,
        "selectedPlatformMedia": selected_platform_media,
    }

    output_path.write_text(json.dumps(result, indent=2))
    print(json.dumps({"ok": True, "output": str(output_path)}))


if __name__ == "__main__":
    main()
