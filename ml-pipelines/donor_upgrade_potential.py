from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, HistGradientBoostingRegressor, RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, roc_auc_score
from sklearn.model_selection import KFold, StratifiedKFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

RANDOM_STATE = 27


@dataclass
class DonorUpgradeArtifacts:
    opportunities: pd.DataFrame
    metrics: pd.DataFrame
    classification_model_name: str | None
    regression_model_name: str | None
    is_trained: bool


def _safe_series(df: pd.DataFrame, column: str, default: Any = np.nan) -> pd.Series:
    if column in df.columns:
        return df[column]
    return pd.Series([default] * len(df), index=df.index)


def _build_preprocessor(numeric_cols: list[str], categorical_cols: list[str]) -> ColumnTransformer:
    return ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imputer", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), numeric_cols),
            (
                "cat",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        ("onehot", OneHotEncoder(handle_unknown="ignore")),
                    ]
                ),
                categorical_cols,
            ),
        ]
    )


def _cumulative_nunique(values: pd.Series) -> list[int]:
    seen: set[str] = set()
    counts: list[int] = []
    for value in values.fillna("Missing").astype(str):
        seen.add(value)
        counts.append(len(seen))
    return counts


def _train_test_split_by_time(df: pd.DataFrame, time_col: str, test_share: float = 0.25) -> tuple[pd.DataFrame, pd.DataFrame]:
    ordered = df.sort_values(time_col).reset_index(drop=True)
    if len(ordered) < 8:
        return ordered.copy(), ordered.copy()
    split_idx = max(int(len(ordered) * (1 - test_share)), 1)
    split_idx = min(split_idx, len(ordered) - 1)
    return ordered.iloc[:split_idx].copy(), ordered.iloc[split_idx:].copy()


def _fit_best_classifier(
    train_df: pd.DataFrame,
    feature_cols: list[str],
    numeric_cols: list[str],
    categorical_cols: list[str],
    target_col: str,
) -> tuple[Pipeline | None, pd.DataFrame, str | None]:
    if train_df.empty or train_df[target_col].nunique() < 2:
        return None, pd.DataFrame(), None

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

    cv = StratifiedKFold(n_splits=min(4, max(2, int(train_df[target_col].value_counts().min()))), shuffle=True, random_state=RANDOM_STATE)
    scores: list[dict[str, Any]] = []
    best_name = None
    best_score = -np.inf
    best_pipeline = None

    for name, model in candidates:
        pipeline = Pipeline([("preprocessor", preprocessor), ("model", model)])
        cv_result = cross_validate(
            pipeline,
            train_df[feature_cols],
            train_df[target_col],
            cv=cv,
            scoring={"roc_auc": "roc_auc", "precision": "precision", "recall": "recall", "f1": "f1"},
        )
        score_row = {
            "modelType": "classification",
            "model": name,
            "cvRocAuc": float(np.nanmean(cv_result["test_roc_auc"])),
            "cvPrecision": float(np.nanmean(cv_result["test_precision"])),
            "cvRecall": float(np.nanmean(cv_result["test_recall"])),
            "cvF1": float(np.nanmean(cv_result["test_f1"])),
        }
        scores.append(score_row)
        if score_row["cvRocAuc"] > best_score:
            best_score = score_row["cvRocAuc"]
            best_name = name
            best_pipeline = pipeline

    if best_pipeline is not None:
        best_pipeline.fit(train_df[feature_cols], train_df[target_col])

    return best_pipeline, pd.DataFrame(scores), best_name


def _fit_best_regressor(
    train_df: pd.DataFrame,
    feature_cols: list[str],
    numeric_cols: list[str],
    categorical_cols: list[str],
    target_col: str,
) -> tuple[Pipeline | None, pd.DataFrame, str | None]:
    reg_train = train_df.dropna(subset=[target_col]).copy()
    if len(reg_train) < 10:
        return None, pd.DataFrame(), None

    preprocessor = _build_preprocessor(numeric_cols, categorical_cols)
    candidates: list[tuple[str, Any]] = [
        ("Linear regression", LinearRegression()),
        ("Random forest regressor", RandomForestRegressor(n_estimators=300, max_depth=8, min_samples_leaf=2, random_state=RANDOM_STATE)),
        ("Histogram boosting regressor", HistGradientBoostingRegressor(random_state=RANDOM_STATE)),
    ]

    cv = KFold(n_splits=min(4, len(reg_train)), shuffle=True, random_state=RANDOM_STATE)
    scores: list[dict[str, Any]] = []
    best_name = None
    best_score = np.inf
    best_pipeline = None

    for name, model in candidates:
        pipeline = Pipeline([("preprocessor", preprocessor), ("model", model)])
        cv_result = cross_validate(
            pipeline,
            reg_train[feature_cols],
            reg_train[target_col],
            cv=cv,
            scoring={"rmse": "neg_root_mean_squared_error", "mae": "neg_mean_absolute_error", "r2": "r2"},
        )
        rmse = float(-np.nanmean(cv_result["test_rmse"]))
        score_row = {
            "modelType": "regression",
            "model": name,
            "cvRmse": rmse,
            "cvMae": float(-np.nanmean(cv_result["test_mae"])),
            "cvR2": float(np.nanmean(cv_result["test_r2"])),
        }
        scores.append(score_row)
        if rmse < best_score:
            best_score = rmse
            best_name = name
            best_pipeline = pipeline

    if best_pipeline is not None:
        best_pipeline.fit(reg_train[feature_cols], reg_train[target_col])

    return best_pipeline, pd.DataFrame(scores), best_name


def _prepare_dataset(
    supporters: pd.DataFrame,
    donations: pd.DataFrame,
    allocations: pd.DataFrame,
    social_posts: pd.DataFrame,
) -> tuple[pd.DataFrame, list[str], list[str], list[str]]:
    if donations.empty:
        return pd.DataFrame(), [], [], []

    donations = donations.copy()
    supporters = supporters.copy()
    allocations = allocations.copy()
    social_posts = social_posts.copy()

    donations["donation_date"] = pd.to_datetime(_safe_series(donations, "donation_date"), errors="coerce")
    donations["donation_value"] = pd.to_numeric(_safe_series(donations, "amount"), errors="coerce").fillna(
        pd.to_numeric(_safe_series(donations, "estimated_value"), errors="coerce")
    )
    donations = donations[donations["donation_value"].notna() & (donations["donation_value"] > 0)].copy()
    if donations.empty:
        return pd.DataFrame(), [], [], []

    allocations["amount_allocated"] = pd.to_numeric(_safe_series(allocations, "amount_allocated"), errors="coerce")
    allocation_features = allocations.groupby("donation_id", as_index=False).agg(
        donation_allocation_total=("amount_allocated", "sum"),
        donation_program_area_count=("program_area", "nunique"),
    )
    donations = donations.merge(allocation_features, on="donation_id", how="left")

    if not social_posts.empty:
        post_features = social_posts[["post_id", "engagement_rate", "click_throughs", "donation_referrals"]].rename(columns={"post_id": "referral_post_id"})
        donations = donations.merge(post_features, on="referral_post_id", how="left")

    supporter_columns = [
        "supporter_id",
        "display_name",
        "supporter_type",
        "relationship_type",
        "region",
        "country",
        "status",
        "acquisition_channel",
    ]
    available_supporter_columns = [col for col in supporter_columns if col in supporters.columns]
    donations = donations.merge(supporters[available_supporter_columns], on="supporter_id", how="left")
    donations = donations.sort_values(["supporter_id", "donation_date", "donation_id"]).reset_index(drop=True)

    donor_events: list[pd.DataFrame] = []
    for _, group in donations.groupby("supporter_id", sort=False):
        group = group.copy().reset_index(drop=True)
        if len(group) < 2:
            continue
        group["donation_number"] = np.arange(1, len(group) + 1)
        group["days_since_prev"] = group["donation_date"].diff().dt.days
        group["hist_value_sum"] = group["donation_value"].cumsum()
        group["hist_value_mean"] = group["donation_value"].expanding().mean()
        group["hist_value_median"] = group["donation_value"].expanding().median()
        group["hist_value_max"] = group["donation_value"].cummax()
        group["hist_recurring_share"] = _safe_series(group, "is_recurring", False).fillna(False).astype(int).expanding().mean()
        group["hist_social_referral_share"] = _safe_series(group, "referral_post_id").notna().astype(int).expanding().mean()
        group["hist_campaign_diversity"] = _cumulative_nunique(_safe_series(group, "campaign_name", "NoCampaign"))
        group["hist_channel_diversity"] = _cumulative_nunique(_safe_series(group, "channel_source", "Unknown"))
        group["next_donation_amount"] = group["donation_value"].shift(-1)
        group["upgrade_flag"] = (group["next_donation_amount"] > (group["hist_value_median"] * 1.10)).astype(int)
        donor_events.append(group.iloc[:-1].copy())

    if not donor_events:
        return pd.DataFrame(), [], [], []

    donor_events_df = pd.concat(donor_events, ignore_index=True)
    feature_cols = [
        "donation_number",
        "days_since_prev",
        "hist_value_sum",
        "hist_value_mean",
        "hist_value_median",
        "hist_value_max",
        "hist_recurring_share",
        "hist_social_referral_share",
        "hist_campaign_diversity",
        "hist_channel_diversity",
        "donation_allocation_total",
        "donation_program_area_count",
        "engagement_rate",
        "click_throughs",
        "donation_referrals",
        "donation_type",
        "channel_source",
        "campaign_name",
        "supporter_type",
        "relationship_type",
        "region",
        "country",
        "status",
        "acquisition_channel",
    ]
    feature_cols = [col for col in feature_cols if col in donor_events_df.columns]
    numeric_cols = [col for col in feature_cols if pd.api.types.is_numeric_dtype(donor_events_df[col])]
    categorical_cols = [col for col in feature_cols if col not in numeric_cols]
    return donor_events_df, feature_cols, numeric_cols, categorical_cols


def _fallback_opportunities(
    supporters: pd.DataFrame,
    donations: pd.DataFrame,
) -> pd.DataFrame:
    if donations.empty:
        return pd.DataFrame(columns=["supporter_id", "supporter_name", "upgrade_probability", "upgrade_band", "predicted_next_amount", "latestDonationValue", "avgDonationValue", "donationCount"])

    donations = donations.copy()
    donations["donation_date"] = pd.to_datetime(_safe_series(donations, "donation_date"), errors="coerce")
    donations["donation_value"] = pd.to_numeric(_safe_series(donations, "amount"), errors="coerce").fillna(
        pd.to_numeric(_safe_series(donations, "estimated_value"), errors="coerce")
    )
    grouped = (
        donations.sort_values(["supporter_id", "donation_date"])
        .groupby("supporter_id", as_index=False)
        .agg(
            donationCount=("donation_id", "count"),
            avgDonationValue=("donation_value", "mean"),
            latestDonationValue=("donation_value", "last"),
        )
    )
    name_lookup = supporters.set_index("supporter_id").get("display_name", pd.Series(dtype="object")).to_dict() if not supporters.empty else {}
    grouped["supporter_name"] = grouped["supporter_id"].map(name_lookup).fillna("Unknown supporter")
    grouped["upgrade_probability"] = (((grouped["latestDonationValue"] / grouped["avgDonationValue"].replace({0: np.nan})) - 1).fillna(0).clip(-1, 3) + 1) / 4
    grouped["predicted_next_amount"] = grouped["avgDonationValue"] * (1 + grouped["upgrade_probability"])
    grouped["upgrade_band"] = pd.cut(
        grouped["upgrade_probability"],
        bins=[-np.inf, 0.4, 0.7, np.inf],
        labels=["Low", "Medium", "High"],
    ).astype(str)
    return grouped.sort_values("upgrade_probability", ascending=False).head(10)


def build_donor_upgrade_artifacts(
    supporters: pd.DataFrame,
    donations: pd.DataFrame,
    allocations: pd.DataFrame,
    social_posts: pd.DataFrame,
) -> DonorUpgradeArtifacts:
    donor_events_df, feature_cols, numeric_cols, categorical_cols = _prepare_dataset(supporters, donations, allocations, social_posts)
    if donor_events_df.empty:
        fallback = _fallback_opportunities(supporters, donations)
        return DonorUpgradeArtifacts(
            opportunities=fallback,
            metrics=pd.DataFrame(),
            classification_model_name=None,
            regression_model_name=None,
            is_trained=False,
        )

    train_df, test_df = _train_test_split_by_time(donor_events_df.dropna(subset=["donation_date"]), "donation_date")
    classifier, classifier_scores, classifier_name = _fit_best_classifier(
        train_df=train_df,
        feature_cols=feature_cols,
        numeric_cols=numeric_cols,
        categorical_cols=categorical_cols,
        target_col="upgrade_flag",
    )
    regressor, regression_scores, regressor_name = _fit_best_regressor(
        train_df=train_df,
        feature_cols=feature_cols,
        numeric_cols=numeric_cols,
        categorical_cols=categorical_cols,
        target_col="next_donation_amount",
    )

    metrics_frames = [frame for frame in [classifier_scores, regression_scores] if not frame.empty]
    metrics = pd.concat(metrics_frames, ignore_index=True) if metrics_frames else pd.DataFrame()

    latest_rows = donor_events_df.sort_values(["supporter_id", "donation_date"]).groupby("supporter_id", as_index=False).tail(1).copy()
    name_lookup = supporters.set_index("supporter_id").get("display_name", pd.Series(dtype="object")).to_dict() if not supporters.empty else {}
    latest_rows["supporter_name"] = latest_rows["supporter_id"].map(name_lookup).fillna("Unknown supporter")

    if classifier is not None:
        latest_rows["upgrade_probability"] = classifier.predict_proba(latest_rows[feature_cols])[:, 1]
        if not test_df.empty and test_df["upgrade_flag"].nunique() > 1:
            test_scored = classifier.predict_proba(test_df[feature_cols])[:, 1]
            metrics = pd.concat(
                [
                    metrics,
                    pd.DataFrame(
                        [
                            {
                                "modelType": "classification_holdout",
                                "model": classifier_name,
                                "rocAuc": float(roc_auc_score(test_df["upgrade_flag"], test_scored)),
                            }
                        ]
                    ),
                ],
                ignore_index=True,
            )
    else:
        latest_rows["upgrade_probability"] = (((latest_rows["hist_value_max"] / latest_rows["hist_value_mean"].replace({0: np.nan})) - 1).fillna(0) / 2).clip(0, 1)

    if regressor is not None:
        latest_rows["predicted_next_amount"] = regressor.predict(latest_rows[feature_cols])
        reg_test = test_df.dropna(subset=["next_donation_amount"]).copy()
        if not reg_test.empty:
            reg_predictions = regressor.predict(reg_test[feature_cols])
            metrics = pd.concat(
                [
                    metrics,
                    pd.DataFrame(
                        [
                            {
                                "modelType": "regression_holdout",
                                "model": regressor_name,
                                "rmse": float(np.sqrt(mean_squared_error(reg_test["next_donation_amount"], reg_predictions))),
                                "mae": float(mean_absolute_error(reg_test["next_donation_amount"], reg_predictions)),
                            }
                        ]
                    ),
                ],
                ignore_index=True,
            )
    else:
        latest_rows["predicted_next_amount"] = latest_rows["hist_value_mean"] * (1 + latest_rows["upgrade_probability"])

    latest_rows["predicted_next_amount"] = latest_rows["predicted_next_amount"].clip(lower=0).round(2)
    latest_rows["avgDonationValue"] = latest_rows["hist_value_mean"].round(2)
    latest_rows["latestDonationValue"] = latest_rows["hist_value_max"].round(2)
    latest_rows["donationCount"] = latest_rows["donation_number"].astype(int)
    latest_rows["upgrade_probability"] = latest_rows["upgrade_probability"].clip(0, 1)
    latest_rows["upgrade_band"] = pd.cut(
        latest_rows["upgrade_probability"],
        bins=[-np.inf, 0.4, 0.7, np.inf],
        labels=["Low", "Medium", "High"],
    ).astype(str)

    opportunities = latest_rows.sort_values(["upgrade_probability", "predicted_next_amount"], ascending=[False, False])[
        [
            "supporter_id",
            "supporter_name",
            "donationCount",
            "avgDonationValue",
            "latestDonationValue",
            "predicted_next_amount",
            "upgrade_probability",
            "upgrade_band",
        ]
    ].head(10).reset_index(drop=True)

    return DonorUpgradeArtifacts(
        opportunities=opportunities,
        metrics=metrics.reset_index(drop=True),
        classification_model_name=classifier_name,
        regression_model_name=regressor_name,
        is_trained=classifier is not None or regressor is not None,
    )
