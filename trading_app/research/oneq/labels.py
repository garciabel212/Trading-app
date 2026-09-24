"""Future return training labels calculation for ONEQ 5-minute bars.

Invariants:
- Reference entry: open of bar t+1.
- Reference exit: open of bar t+7 (30-minute holding period).
- Target in basis points: 10_000 * (open[t+7] / open[t+1] - 1).
- Requires both timestamps to exist within the same regular session.
- Explicit timestamp matching ensures missing bars cannot extend the holding period.
- Future prices belong exclusively in training labels and the simulator.
"""

from __future__ import annotations

import zoneinfo
import numpy as np
import pandas as pd

NY_TZ = zoneinfo.ZoneInfo("America/New_York")


def calculate_labels(df: pd.DataFrame) -> pd.DataFrame:
    """Calculates the 30-minute forward return target (in basis points) for each completed bar.

    For bar t:
    - Entry open: open price of bar t+1.
    - Exit open: open price of bar t+7.
    - Holding duration: exactly 30 minutes.
    - target_bps = 10_000 * (open[t+7] / open[t+1] - 1)

    Bars near the end of the trading session (where t+7 falls outside regular hours or
    in the next session), or bars where intermediate data is missing, receive NaN.
    """
    if df.empty:
        return df.copy()

    df = df.copy()
    df.sort_values("bar_start_utc", inplace=True)
    df.reset_index(drop=True, inplace=True)

    dt_utc = pd.to_datetime(df["bar_start_utc"], utc=True)
    dt_ny = dt_utc.dt.tz_convert(NY_TZ)
    session_dates = dt_ny.dt.date

    n = len(df)
    target_bps = np.full(n, np.nan)
    entry_open = np.full(n, np.nan)
    exit_open = np.full(n, np.nan)
    entry_time = [None] * n
    exit_time = [None] * n
    label_valid = np.zeros(n, dtype=bool)

    opens = df["open"].values
    t_vals = dt_utc.values

    # Check forward positions within same session
    for i in range(n - 7):
        # 1. Must be in the same trading session
        if session_dates.iloc[i] != session_dates.iloc[i + 7]:
            continue

        # 2. Match timestamps explicitly:
        # t+1 must start 5 min after t
        # t+7 must start 35 min after t (30 min after t+1)
        diff_entry = (t_vals[i + 1] - t_vals[i]).astype("timedelta64[m]").astype(int)
        diff_exit = (t_vals[i + 7] - t_vals[i + 1]).astype("timedelta64[m]").astype(int)

        if diff_entry == 5 and diff_exit == 30:
            o_entry = opens[i + 1]
            o_exit = opens[i + 7]

            if o_entry > 0 and o_exit > 0:
                ret = (o_exit / o_entry) - 1.0
                target_bps[i] = round(ret * 10_000.0, 4)
                entry_open[i] = o_entry
                exit_open[i] = o_exit
                entry_time[i] = df["bar_start_utc"].iloc[i + 1]
                exit_time[i] = df["bar_start_utc"].iloc[i + 7]
                label_valid[i] = True

    df["target_bps"] = target_bps
    df["ref_entry_open"] = entry_open
    df["ref_exit_open"] = exit_open
    df["ref_entry_time_utc"] = entry_time
    df["ref_exit_time_utc"] = exit_time
    df["label_valid"] = label_valid

    return df
