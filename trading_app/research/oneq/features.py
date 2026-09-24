"""Intraday feature engineering for ONEQ 5-minute bars.

Invariants:
- Strictly causal: relies only on completed bars available after bar_end_utc.
- Intraday return windows are computed strictly within the same trading session.
- Observations with insufficient history or gaps are flagged/dropped.
- Day's eventual high, low, close, or total volume are NEVER used.
"""

from __future__ import annotations

from typing import Any
import zoneinfo
import numpy as np
import pandas as pd

NY_TZ = zoneinfo.ZoneInfo("America/New_York")

FEATURE_NAMES = [
    "ret_5m",
    "ret_15m",
    "ret_60m",
    "recent_volatility",
    "vwap_distance",
    "relative_volume",
    "time_of_day",
]


def calculate_features(df: pd.DataFrame) -> pd.DataFrame:
    """Calculates model input features after each completed bar.

    Inputs calculated:
    1. Five-minute return: C[t] / C[t-1] - 1
    2. Fifteen-minute return: C[t] / C[t-3] - 1
    3. Sixty-minute return: C[t] / C[t-12] - 1
    4. Recent volatility: Sample standard deviation of the last 12 five-minute returns
    5. VWAP distance: C[t] / session_vwap[t] - 1
    6. Relative volume: Current volume / mean volume for same time slot over prior 20 sessions
    7. Time of day: Minutes since session opened (09:30 AM = 0)
    """
    if df.empty:
        return df.copy()

    df = df.copy()
    df.sort_values("bar_start_utc", inplace=True)
    df.reset_index(drop=True, inplace=True)

    dt_utc = pd.to_datetime(df["bar_start_utc"], utc=True)
    dt_ny = dt_utc.dt.tz_convert(NY_TZ)

    df["dt_ny"] = dt_ny
    df["session_date"] = dt_ny.dt.date

    # Time of day: minutes since 09:30 AM
    session_open_minutes = 9 * 60 + 30
    bar_minutes = dt_ny.dt.hour * 60 + dt_ny.dt.minute
    df["time_of_day"] = (bar_minutes - session_open_minutes).astype(float)
    df["time_slot"] = dt_ny.dt.strftime("%H:%M")

    # Initialize feature columns with NaN
    for feat in FEATURE_NAMES:
        if feat != "time_of_day":
            df[feat] = np.nan

    df["session_vwap"] = np.nan
    df["vwap_approximation_used"] = False

    # 1-5. Session-isolated features (Returns, Volatility, VWAP)
    session_groups = df.groupby("session_date", group_keys=False)

    def process_session(group: pd.DataFrame) -> pd.DataFrame:
        g = group.copy()
        g.sort_values("bar_start_utc", inplace=True)

        close = g["close"].values
        volume = g["volume"].values
        bar_vwap = g["bar_vwap"].values
        g_len = len(g)

        # Session VWAP: cumulative sum(bar_vwap * volume) / cumulative sum(volume)
        vol_safe = np.where(volume <= 0, 1e-6, volume)
        cum_vol = np.cumsum(vol_safe)
        cum_vwap_vol = np.cumsum(bar_vwap * vol_safe)
        sess_vwap = cum_vwap_vol / cum_vol
        g["session_vwap"] = sess_vwap
        g["vwap_distance"] = np.where(sess_vwap > 0, (close / sess_vwap) - 1.0, np.nan)

        # Five-minute return: C[t] / C[t-1] - 1 (only if adjacent bar is 5 mins prior)
        dt_vals = g["dt_ny"].values
        ret_5m = np.full(g_len, np.nan)
        ret_15m = np.full(g_len, np.nan)
        ret_60m = np.full(g_len, np.nan)

        for i in range(g_len):
            # Check 5m return (t - 1)
            if i >= 1:
                time_diff = (dt_vals[i] - dt_vals[i - 1]).astype("timedelta64[m]").astype(int)
                if time_diff == 5 and close[i - 1] > 0:
                    ret_5m[i] = (close[i] / close[i - 1]) - 1.0

            # Check 15m return (t - 3)
            if i >= 3:
                time_diff = (dt_vals[i] - dt_vals[i - 3]).astype("timedelta64[m]").astype(int)
                if time_diff == 15 and close[i - 3] > 0:
                    ret_15m[i] = (close[i] / close[i - 3]) - 1.0

            # Check 60m return (t - 12)
            if i >= 12:
                time_diff = (dt_vals[i] - dt_vals[i - 12]).astype("timedelta64[m]").astype(int)
                if time_diff == 60 and close[i - 12] > 0:
                    ret_60m[i] = (close[i] / close[i - 12]) - 1.0

        g["ret_5m"] = ret_5m
        g["ret_15m"] = ret_15m
        g["ret_60m"] = ret_60m

        # Recent volatility: standard deviation of the last 12 five-minute returns
        # Requires all 12 returns to be present (no gaps)
        s_ret5 = pd.Series(ret_5m, index=g.index)
        g["recent_volatility"] = s_ret5.rolling(window=12, min_periods=12).std(ddof=1).values

        return g

    processed_dfs = []
    for _, group in df.groupby("session_date", sort=False):
        processed_dfs.append(process_session(group))
    df = pd.concat(processed_dfs, ignore_index=True)

    # 6. Relative Volume: current volume / mean volume for same time slot over prior 20 sessions
    # Pivot: rows = session_date, cols = time_slot
    vol_pivot = df.pivot_table(index="session_date", columns="time_slot", values="volume", aggfunc="first")

    # Rolling mean over prior 20 sessions (shift(1) ensures current session is excluded)
    rolling_slot_mean = vol_pivot.rolling(window=20, min_periods=5).mean().shift(1)

    # Unstack and merge back onto df
    mean_vol_series = rolling_slot_mean.unstack().rename("mean_prior_vol").reset_index()
    df = df.merge(mean_vol_series, on=["session_date", "time_slot"], how="left")
    df["relative_volume"] = np.where(
        (df["mean_prior_vol"] > 0) & df["mean_prior_vol"].notnull(),
        (df["volume"] / df["mean_prior_vol"]).astype(float),
        np.nan,
    )
    df.drop(columns=["mean_prior_vol"], inplace=True, errors="ignore")

    # Clean temporary helper columns
    df.drop(columns=["dt_ny", "time_slot"], inplace=True, errors="ignore")
    return df
