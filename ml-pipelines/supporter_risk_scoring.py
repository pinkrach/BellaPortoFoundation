#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
import requests


def _parse_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return str(value).strip().lower() in {"true", "1", "yes", "y", "t"}


def _safe_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    try:
        n = float(value)
        if math.isnan(n):
            return default
        return n
    except (TypeError, ValueError):
        return default


@dataclass
class SupabaseClient:
    base_url: str
    api_key: str

    @property
    def _headers(self) -> dict[str, str]:
        return {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def fetch_all(self, table: str, select: str, where: str = "", order: str = "") -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        page_size = 1000
        start = 0
        while True:
            end = start + page_size - 1
            params = [f"select={select}"]
            if where:
                params.append(where)
            if order:
                params.append(f"order={order}")
            query = "&".join(params)
            url = f"{self.base_url.rstrip('/')}/rest/v1/{table}?{query}"

            headers = dict(self._headers)
            headers["Range-Unit"] = "items"
            headers["Range"] = f"{start}-{end}"

            response = requests.get(url, headers=headers, timeout=60)
            response.raise_for_status()
            page = response.json()
            if not isinstance(page, list):
                raise RuntimeError(f"Unexpected response from Supabase table {table}.")

            rows.extend(page)
            if len(page) < page_size:
                break
            start += page_size
        return rows

    def upsert_rows(self, table: str, rows: list[dict[str, Any]], on_conflict: str) -> None:
        if not rows:
            return

        url = f"{self.base_url.rstrip('/')}/rest/v1/{table}?on_conflict={on_conflict}"
        headers = dict(self._headers)
        headers["Prefer"] = "resolution=merge-duplicates,return=minimal"
        response = requests.post(url, headers=headers, data=json.dumps(rows), timeout=90)
        response.raise_for_status()


def build_current_snapshot_dataset(
    supporters: pd.DataFrame,
    events: pd.DataFrame,
    cutoff_date: pd.Timestamp,
) -> pd.DataFrame:
    events = events.sort_values(["supporter_id", "donation_date"]).copy()
    cutoff = pd.Timestamp(cutoff_date).normalize()
    past = events[events["donation_date"] <= cutoff].copy()
    if past.empty:
        return pd.DataFrame()

    rows: list[dict[str, Any]] = []
    for sid, grp in past.groupby("supporter_id"):
        grp = grp.sort_values("donation_date")
        dates = grp["donation_date"].tolist()
        vals = grp["gift_value"].astype(float).tolist()
        if not dates:
            continue

        recency = int((cutoff - dates[-1]).days)
        n_gifts = len(vals)

        if n_gifts >= 2:
            intervals = np.diff(pd.Series(dates).values).astype("timedelta64[D]").astype(int)
            baseline_interval = float(np.mean(intervals))
            median_interval = float(np.median(intervals))
            std_interval = float(np.std(intervals))
            deviation_ratio = recency / baseline_interval if baseline_interval > 0 else np.nan
        else:
            baseline_interval = np.nan
            median_interval = np.nan
            std_interval = np.nan
            deviation_ratio = np.nan

        avg_last_2 = float(np.mean(vals[-2:]))
        lifetime_avg = float(np.mean(vals))
        monetary_momentum = avg_last_2 - lifetime_avg

        recent_365 = grp[grp["donation_date"] > cutoff - pd.Timedelta(days=365)]
        freq_365 = int(len(recent_365))
        monetary_365 = float(recent_365["gift_value"].sum()) if len(recent_365) else 0.0

        in_kind_share = float((grp["donation_type"] == "InKind").mean())
        recurring_ratio = float(grp["is_recurring"].mean())
        gift_value_std = float(np.std(vals)) if n_gifts >= 2 else 0.0
        gift_value_p90 = float(np.percentile(vals, 90))

        channel_counts = grp["channel_source"].fillna("Unknown").value_counts(normalize=True)
        channel_entropy = float(-(channel_counts * np.log(channel_counts + 1e-9)).sum())
        first_gift_age_days = int((cutoff - dates[0]).days)

        rows.append(
            {
                "supporter_id": int(sid),
                "n_gifts": n_gifts,
                "current_recency": recency,
                "Baseline_Interval": baseline_interval,
                "Median_Interval": median_interval,
                "Std_Interval": std_interval,
                "Deviation_Ratio": deviation_ratio,
                "Monetary_Momentum": monetary_momentum,
                "Avg_Gift_Value": lifetime_avg,
                "Gift_Value_Std": gift_value_std,
                "Gift_Value_P90": gift_value_p90,
                "Frequency_365": freq_365,
                "Monetary_365": monetary_365,
                "Recurring_Ratio": recurring_ratio,
                "InKind_Share": in_kind_share,
                "Channel_Entropy": channel_entropy,
                "First_Gift_Age_Days": first_gift_age_days,
            }
        )

    return pd.DataFrame(rows)


def load_live_data(client: SupabaseClient) -> tuple[pd.DataFrame, pd.DataFrame]:
    supporter_rows = client.fetch_all(
        table="supporters",
        select="supporter_id,supporter_type",
        order="supporter_id.asc",
    )
    donation_rows = client.fetch_all(
        table="donations",
        select="donation_id,supporter_id,donation_date,donation_type,amount,estimated_value,is_recurring,channel_source",
        order="donation_date.asc",
    )

    supporters = pd.DataFrame(supporter_rows)
    donations = pd.DataFrame(donation_rows)

    if supporters.empty:
        return supporters, pd.DataFrame()

    supporters = supporters[
        supporters["supporter_type"].isin(["MonetaryDonor", "InKindDonor"])
    ].copy()
    supporters["supporter_id"] = pd.to_numeric(supporters["supporter_id"], errors="coerce")
    supporters = supporters.dropna(subset=["supporter_id"]).copy()
    supporters["supporter_id"] = supporters["supporter_id"].astype(int)
    allowed_ids = set(supporters["supporter_id"].tolist())

    if donations.empty:
        return supporters, pd.DataFrame(
            columns=[
                "donation_id",
                "supporter_id",
                "donation_date",
                "donation_type",
                "gift_value",
                "is_recurring",
                "channel_source",
            ]
        )

    donations["supporter_id"] = pd.to_numeric(donations["supporter_id"], errors="coerce")
    donations = donations.dropna(subset=["supporter_id"]).copy()
    donations["supporter_id"] = donations["supporter_id"].astype(int)

    donations = donations[
        donations["supporter_id"].isin(allowed_ids)
        & donations["donation_type"].isin(["Monetary", "InKind"])
    ].copy()
    donations["donation_date"] = pd.to_datetime(donations["donation_date"], errors="coerce")
    donations = donations.dropna(subset=["donation_date"])

    def gift_value(row: pd.Series) -> float:
        if row["donation_type"] == "Monetary":
            return _safe_float(row.get("amount"), 0.0)
        return _safe_float(row.get("estimated_value"), 0.0)

    donations["gift_value"] = donations.apply(gift_value, axis=1)
    donations["is_recurring"] = donations["is_recurring"].map(_parse_bool).fillna(False)

    events = donations[
        [
            "donation_id",
            "supporter_id",
            "donation_date",
            "donation_type",
            "gift_value",
            "is_recurring",
            "channel_source",
        ]
    ].sort_values(["supporter_id", "donation_date"])

    return supporters, events


def resolve_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Score supporter donation churn risk and upsert to Supabase.")
    parser.add_argument("--supabase-url", default=os.getenv("SUPABASE_URL", ""))
    parser.add_argument(
        "--supabase-key",
        default=os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY", ""),
    )
    parser.add_argument(
        "--model-dir",
        default=os.getenv("RISK_MODEL_ARTIFACT_DIR", str(Path(__file__).resolve().parent / "model_artifacts")),
    )
    parser.add_argument(
        "--model-path",
        default="best_retention_model.joblib",
        help="File name or absolute path to the trained model artifact.",
    )
    parser.add_argument(
        "--meta-path",
        default="best_retention_model_meta.json",
        help="File name or absolute path to metadata artifact.",
    )
    parser.add_argument(
        "--table-name",
        default=os.getenv("SUPPORTER_RISK_TABLE", "supporter_risk_scores"),
    )
    parser.add_argument(
        "--cutoff-date",
        default="",
        help="Optional explicit cutoff date (YYYY-MM-DD). Defaults to current UTC date.",
    )
    return parser.parse_args()


def resolve_artifact_path(model_dir: Path, value: str) -> Path:
    path = Path(value)
    if path.is_absolute():
        return path
    return model_dir / path


def main() -> int:
    args = resolve_args()
    if not args.supabase_url or not args.supabase_key:
        raise RuntimeError("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).")

    model_dir = Path(args.model_dir).resolve()
    model_path = resolve_artifact_path(model_dir, args.model_path)
    meta_path = resolve_artifact_path(model_dir, args.meta_path)
    if not model_path.exists():
        raise FileNotFoundError(f"Model artifact not found: {model_path}")
    if not meta_path.exists():
        raise FileNotFoundError(f"Metadata artifact not found: {meta_path}")

    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    feature_cols = list(meta.get("feature_cols", []))
    if not feature_cols:
        raise RuntimeError("Metadata is missing feature_cols.")
    threshold = float(meta.get("threshold", 0.5))
    model_name = str(meta.get("best_model_name", "unknown"))

    model = joblib.load(model_path)
    supabase = SupabaseClient(base_url=args.supabase_url, api_key=args.supabase_key)
    supporters, events = load_live_data(supabase)

    cutoff = pd.Timestamp(datetime.now(UTC).date())
    if args.cutoff_date:
        cutoff = pd.Timestamp(args.cutoff_date).normalize()

    snapshot = build_current_snapshot_dataset(supporters, events, cutoff)
    snapshot_ids = set(snapshot["supporter_id"].astype(int).tolist()) if not snapshot.empty else set()

    now_iso = datetime.now(UTC).isoformat()
    model_version = f"{model_name}:{meta_path.stat().st_mtime_ns}"

    upsert_rows: list[dict[str, Any]] = []

    # Default for supporters with no donation history (no score row from snapshot)
    for sid in pd.to_numeric(supporters["supporter_id"], errors="coerce").dropna().astype(int):
        if sid in snapshot_ids:
            continue
        upsert_rows.append(
            {
                "supporter_id": int(sid),
                "risk_probability": 1.0,
                "is_at_risk": True,
                "risk_threshold": threshold,
                "risk_reason": "no_donation_history",
                "model_name": model_name,
                "model_version": model_version,
                "scored_at": now_iso,
                "feature_cutoff_date": cutoff.date().isoformat(),
            }
        )

    if not snapshot.empty:
        X = snapshot.reindex(columns=feature_cols)
        proba = model.predict_proba(X)[:, 1]

        for sid, p in zip(snapshot["supporter_id"].astype(int).tolist(), proba.tolist()):
            prob = float(max(0.0, min(1.0, p)))
            upsert_rows.append(
                {
                    "supporter_id": int(sid),
                    "risk_probability": prob,
                    "is_at_risk": bool(prob >= threshold),
                    "risk_threshold": threshold,
                    "risk_reason": "model_score",
                    "model_name": model_name,
                    "model_version": model_version,
                    "scored_at": now_iso,
                    "feature_cutoff_date": cutoff.date().isoformat(),
                }
            )

    # PostgREST payload limits: batch upserts.
    batch_size = 500
    for idx in range(0, len(upsert_rows), batch_size):
        supabase.upsert_rows(args.table_name, upsert_rows[idx : idx + batch_size], on_conflict="supporter_id")

    print(
        json.dumps(
            {
                "status": "ok",
                "supporters_total": int(len(supporters)),
                "snapshot_rows": int(len(snapshot)),
                "upserted_rows": int(len(upsert_rows)),
                "table": args.table_name,
                "threshold": threshold,
                "model_name": model_name,
                "cutoff_date": cutoff.date().isoformat(),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
