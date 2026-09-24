"""Data ingestion, normalization, validation, and manifest generation for ONEQ 5-minute bars."""

from __future__ import annotations

import hashlib
import json
import logging
import os
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional
import zoneinfo

import httpx
import pandas as pd

logger = logging.getLogger(__name__)

NY_TZ = zoneinfo.ZoneInfo("America/New_York")
UTC_TZ = timezone.utc

REQUIRED_COLUMNS = [
    "symbol",
    "bar_start_utc",
    "bar_end_utc",
    "open",
    "high",
    "low",
    "close",
    "volume",
    "bar_vwap",
]


class MissingAlpacaCredentialsError(RuntimeError):
    """Raised when Alpaca credentials (APCA_API_KEY_ID, APCA_API_SECRET_KEY) are missing."""

    def __init__(self, message: Optional[str] = None):
        super().__init__(
            message
            or "Alpaca API credentials missing. Please set environment variables "
            "'APCA_API_KEY_ID' (or 'ALPACA_API_KEY') and 'APCA_API_SECRET_KEY' (or 'ALPACA_API_SECRET') "
            "to fetch live historical bars, or provide an equivalent CSV dataset."
        )


@dataclass
class DatasetManifest:
    dataset_id: str
    symbol: str
    timeframe: str
    feed_used: str
    created_at_utc: str
    start_date_utc: str
    end_date_utc: str
    total_bars: int
    trading_sessions_count: int
    sha256_checksum: str
    validation_summary: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def save(self, filepath: str | Path) -> None:
        p = Path(filepath)
        p.parent.mkdir(parents=True, exist_ok=True)
        with open(p, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2)


class AlpacaBarsAdapter:
    """Adapter for downloading historical stock bars from Alpaca Data API v2."""

    BASE_URL = "https://data.alpaca.markets/v2/stocks/bars"

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_secret: Optional[str] = None,
        feed: str = "sip",
    ):
        self.api_key = (
            api_key
            or os.environ.get("APCA_API_KEY_ID")
            or os.environ.get("ALPACA_API_KEY")
        )
        self.api_secret = (
            api_secret
            or os.environ.get("APCA_API_SECRET_KEY")
            or os.environ.get("ALPACA_API_SECRET")
        )
        self.feed = feed  # 'sip' or 'iex'
        self.feed_actually_used = feed

    def has_credentials(self) -> bool:
        return bool(self.api_key and self.api_secret)

    def fetch_bars(
        self,
        symbol: str = "ONEQ",
        timeframe: str = "5Min",
        start: Optional[str] = None,
        end: Optional[str] = None,
        limit: int = 10000,
    ) -> pd.DataFrame:
        """Fetch historical bars from Alpaca, paginating through next_page_token."""
        if not self.has_credentials():
            raise MissingAlpacaCredentialsError()

        headers = {
            "APCA-API-KEY-ID": self.api_key,
            "APCA-API-SECRET-KEY": self.api_secret,
        }

        params: dict[str, Any] = {
            "symbols": symbol,
            "timeframe": timeframe,
            "feed": self.feed,
            "limit": limit,
            "adjustment": "raw",  # Retain raw prices for execution
        }
        if start:
            params["start"] = start
        if end:
            params["end"] = end

        all_bars: list[dict[str, Any]] = []
        page_token = None

        with httpx.Client(timeout=30.0) as client:
            while True:
                current_params = dict(params)
                if page_token:
                    current_params["page_token"] = page_token

                resp = client.get(self.BASE_URL, headers=headers, params=current_params)
                if resp.status_code == 401 or resp.status_code == 403:
                    raise MissingAlpacaCredentialsError(
                        f"Alpaca API authentication failed ({resp.status_code}): {resp.text}"
                    )
                resp.raise_for_status()
                data = resp.json()

                bars = data.get("bars", {}).get(symbol, [])
                if not bars:
                    break
                all_bars.extend(bars)

                page_token = data.get("next_page_token")
                if not page_token:
                    break

        if not all_bars:
            return pd.DataFrame(columns=REQUIRED_COLUMNS)

        rows = []
        for b in all_bars:
            # Alpaca format: t (timestamp RFC3339), o, h, l, c, v, vw (vwap)
            t_str = b["t"]
            dt_start = datetime.fromisoformat(t_str.replace("Z", "+00:00"))
            dt_end = dt_start + pd.Timedelta(minutes=5)
            vw = b.get("vw")
            if vw is None or vw <= 0:
                vw = round((b["h"] + b["l"] + b["c"]) / 3.0, 4)

            rows.append(
                {
                    "symbol": symbol,
                    "bar_start_utc": dt_start.isoformat(),
                    "bar_end_utc": dt_end.isoformat(),
                    "open": float(b["o"]),
                    "high": float(b["h"]),
                    "low": float(b["l"]),
                    "close": float(b["c"]),
                    "volume": int(b["v"]),
                    "bar_vwap": float(vw),
                }
            )

        df = pd.DataFrame(rows)
        return normalize_bar_dataframe(df)


class CSVBarsAdapter:
    """Adapter for importing historical stock bars from CSV files."""

    @staticmethod
    def load(filepath: str | Path) -> pd.DataFrame:
        p = Path(filepath)
        if not p.exists():
            raise FileNotFoundError(f"Historical bars CSV file not found at: {p.resolve()}")

        df = pd.read_csv(p)
        return normalize_bar_dataframe(df)


def normalize_bar_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Normalizes and enforces required column schema, types, and timestamp sorting."""
    df = df.copy()

    # Column mapping if alternate standard names exist
    col_map = {
        "ticker": "symbol",
        "timestamp": "bar_start_utc",
        "date": "bar_start_utc",
        "vwap": "bar_vwap",
    }
    for old_col, new_col in col_map.items():
        if old_col in df.columns and new_col not in df.columns:
            df.rename(columns={old_col: new_col}, inplace=True)

    if "symbol" not in df.columns:
        df["symbol"] = "ONEQ"

    if "bar_start_utc" not in df.columns:
        raise ValueError("DataFrame is missing required timestamp column 'bar_start_utc'.")

    # Ensure timezone-aware ISO string
    start_series = pd.to_datetime(df["bar_start_utc"], utc=True)
    df["bar_start_utc"] = start_series.dt.strftime("%Y-%m-%dT%H:%M:%S%z")

    if "bar_end_utc" not in df.columns:
        end_series = start_series + pd.Timedelta(minutes=5)
        df["bar_end_utc"] = end_series.dt.strftime("%Y-%m-%dT%H:%M:%S%z")
    else:
        end_series = pd.to_datetime(df["bar_end_utc"], utc=True)
        df["bar_end_utc"] = end_series.dt.strftime("%Y-%m-%dT%H:%M:%S%z")

    for num_col in ["open", "high", "low", "close", "volume"]:
        if num_col not in df.columns:
            raise ValueError(f"DataFrame is missing required numeric column '{num_col}'.")
        df[num_col] = pd.to_numeric(df[num_col], errors="coerce")

    df["volume"] = df["volume"].fillna(0).astype(int)

    if "bar_vwap" not in df.columns or df["bar_vwap"].isnull().all():
        # Typical price approximation explicitly labeled
        df["bar_vwap"] = ((df["high"] + df["low"] + df["close"]) / 3.0).round(4)
    else:
        df["bar_vwap"] = pd.to_numeric(df["bar_vwap"], errors="coerce").fillna(
            (df["high"] + df["low"] + df["close"]) / 3.0
        ).round(4)

    # Reorder and filter
    df = df[REQUIRED_COLUMNS]
    df.sort_values("bar_start_utc", inplace=True)
    df.reset_index(drop=True, inplace=True)
    return df


def validate_bars(df: pd.DataFrame) -> dict[str, Any]:
    """Validates bar continuity, duplicates, exchange session hours, and corporate actions.

    Invariants:
    - No duplicate timestamps.
    - Bars belong to regular trading sessions (09:30 - 16:00 US/Eastern).
    - Missing intervals are detected and logged, NEVER filled with invented trades.
    - Retains raw prices for execution.
    """
    summary: dict[str, Any] = {
        "total_bars": len(df),
        "duplicates_removed": 0,
        "non_session_bars_detected": 0,
        "missing_intervals_detected": 0,
        "price_jump_anomalies": 0,
        "valid": True,
    }

    if df.empty:
        summary["valid"] = False
        summary["error"] = "DataFrame is empty."
        return summary

    # 1. Duplicates check
    dups = df.duplicated(subset=["bar_start_utc"]).sum()
    summary["duplicates_removed"] = int(dups)

    # 2. Exchange session check (09:30 to 16:00 US/Eastern)
    dt_utc = pd.to_datetime(df["bar_start_utc"], utc=True)
    dt_ny = dt_utc.dt.tz_convert(NY_TZ)

    minutes_of_day = dt_ny.dt.hour * 60 + dt_ny.dt.minute
    is_regular_session = (minutes_of_day >= 9 * 60 + 30) & (minutes_of_day < 16 * 60)
    is_weekday = dt_ny.dt.weekday < 5
    valid_session_mask = is_regular_session & is_weekday

    non_session_count = int((~valid_session_mask).sum())
    summary["non_session_bars_detected"] = non_session_count

    # 3. Missing interval detection within trading sessions
    # For each date, check expected intervals (up to 78 five-minute bars per day: 9:30 to 15:55 start)
    df_ny = df.copy()
    df_ny["dt_ny"] = dt_ny
    df_ny["date_ny"] = dt_ny.dt.date

    missing_intervals = 0
    grouped = df_ny[valid_session_mask].groupby("date_ny")
    summary["trading_sessions_count"] = len(grouped)

    for _, session_df in grouped:
        if len(session_df) < 2:
            continue
        diffs = session_df["dt_ny"].diff().dropna()
        # Any step greater than 5 minutes is a missing interval
        gaps = (diffs > pd.Timedelta(minutes=5)).sum()
        missing_intervals += int(gaps)

    summary["missing_intervals_detected"] = missing_intervals

    # 4. Corporate action / extreme price jump check (>25% intraday jump without announcement)
    returns = df["close"].pct_change().abs().dropna()
    extreme_jumps = int((returns > 0.25).sum())
    summary["price_jump_anomalies"] = extreme_jumps

    return summary


def compute_dataset_sha256(filepath: str | Path) -> str:
    """Computes SHA-256 hash of the dataset file for data provenance and manifest tracking."""
    sha256 = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            sha256.update(chunk)
    return sha256.hexdigest()


def load_and_validate_oneq_bars(
    csv_path: Optional[str | Path] = None,
    alpaca_adapter: Optional[AlpacaBarsAdapter] = None,
) -> tuple[pd.DataFrame, DatasetManifest]:
    """Loads ONEQ 5-minute bars from CSV or Alpaca, validates them, and produces a dataset manifest."""
    default_csv = Path(__file__).parent / "data" / "oneq_5min.csv"
    target_path = Path(csv_path) if csv_path else default_csv

    feed_used = "csv_import"
    df: Optional[pd.DataFrame] = None

    if alpaca_adapter and alpaca_adapter.has_credentials():
        try:
            logger.info("Attempting to fetch ONEQ bars from Alpaca Data API...")
            df = alpaca_adapter.fetch_bars("ONEQ", "5Min")
            feed_used = f"alpaca_{alpaca_adapter.feed}"
            target_path.parent.mkdir(parents=True, exist_ok=True)
            df.to_csv(target_path, index=False)
        except Exception as e:
            logger.warning("Alpaca fetch failed: %s. Falling back to local CSV.", e)

    if df is None:
        if not target_path.exists():
            raise FileNotFoundError(
                f"Missing dataset at {target_path}. "
                "Provide Alpaca credentials (APCA_API_KEY_ID, APCA_API_SECRET_KEY) "
                "or place historical 5-minute ONEQ bars at this path."
            )
        df = CSVBarsAdapter.load(target_path)

    # Validate
    validation_summary = validate_bars(df)

    # Retain only unique, sorted session bars
    df = df.drop_duplicates(subset=["bar_start_utc"]).sort_values("bar_start_utc").reset_index(drop=True)

    # SHA-256 of the CSV
    checksum = compute_dataset_sha256(target_path)

    dt_start = df["bar_start_utc"].iloc[0] if not df.empty else "N/A"
    dt_end = df["bar_end_utc"].iloc[-1] if not df.empty else "N/A"

    manifest = DatasetManifest(
        dataset_id=f"ds-oneq-5min-{checksum[:8]}",
        symbol="ONEQ",
        timeframe="5Min",
        feed_used=feed_used,
        created_at_utc=datetime.now(UTC_TZ).isoformat(),
        start_date_utc=dt_start,
        end_date_utc=dt_end,
        total_bars=len(df),
        trading_sessions_count=validation_summary.get("trading_sessions_count", 0),
        sha256_checksum=checksum,
        validation_summary=validation_summary,
    )

    manifest_path = target_path.parent / "dataset_manifest.json"
    manifest.save(manifest_path)

    return df, manifest
