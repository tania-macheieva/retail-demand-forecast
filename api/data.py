"""Джерела даних: демо (синтетика у схемі Kaggle Favorita) або реальний Kaggle-датасет у api/data/."""
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).parent / "data"
FIXED = ["01-01", "03-08", "05-01", "06-28", "08-24", "10-14", "12-25"]


@dataclass
class Series:
    id: str
    store: int
    family: str
    df: pd.DataFrame  # ds, y, promo, holiday

    @property
    def name(self) -> str:
        return f"Магазин №{self.store} · {self.family.title()}"


def fixed_holidays(y0: int, y1: int) -> set:
    out = set()
    for y in range(y0, y1 + 1):
        out |= {date.fromisoformat(f"{y}-{md}") for md in FIXED}
        nov1 = date(y, 11, 1)  # чорна п'ятниця = 4-та п'ятниця листопада
        out.add(nov1 + timedelta(days=(4 - nov1.weekday()) % 7 + 21))
    return out


def is_holiday(dates, holidays: set) -> list[int]:
    return [int(pd.Timestamp(d).date() in holidays) for d in dates]


def _sid(store: int, family: str) -> str:
    return f"{store}-{family.replace('/', '-').replace(' ', '-')}"


DEMO = [  # store, family, base, season amp, holiday uplift, weekday profile Mon..Sun
    (1, "GROCERY I", 1800, 0.10, 1.30, [0.92, 0.88, 0.90, 0.95, 1.05, 1.25, 1.15]),
    (1, "BEVERAGES", 1200, 0.28, 1.45, [0.90, 0.85, 0.88, 0.95, 1.10, 1.30, 1.12]),
    (1, "PRODUCE", 650, 0.20, 1.25, [0.95, 0.92, 0.95, 1.00, 1.05, 1.18, 0.95]),
    (44, "GROCERY I", 2600, 0.08, 1.28, [0.90, 0.86, 0.90, 0.95, 1.06, 1.28, 1.20]),
    (44, "BEVERAGES", 1700, 0.30, 1.50, [0.88, 0.84, 0.88, 0.94, 1.12, 1.32, 1.14]),
    (45, "DAIRY", 780, 0.06, 1.20, [0.98, 0.95, 0.97, 1.00, 1.03, 1.12, 0.95]),
    (45, "BREAD/BAKERY", 540, 0.05, 1.35, [0.95, 0.92, 0.94, 0.98, 1.05, 1.20, 1.16]),
    (45, "CLEANING", 420, 0.07, 1.15, [0.96, 0.92, 0.94, 0.98, 1.04, 1.18, 1.00]),
]


def synthetic(years: int = 3) -> tuple[list[Series], set]:
    last = pd.Timestamp.today().normalize() - pd.Timedelta(days=1)
    ds = pd.date_range(last - pd.Timedelta(days=365 * years), last, freq="D")
    hol = fixed_holidays(ds[0].year, last.year + 1)
    hflag = np.array(is_holiday(ds, hol))
    out = []
    for i, (store, family, base, amp, up, wk) in enumerate(DEMO):
        rng = np.random.default_rng(100 + i)
        n = len(ds)
        promo = np.zeros(n)
        t = 0
        while t < n:  # промо-кампанії по 3-7 днів
            if rng.random() < 0.02:
                L = int(rng.integers(3, 8))
                promo[t:t + L] = rng.integers(8, 36)
                t += L
            t += 1
        season = 1 + amp * np.sin(2 * np.pi * ds.dayofyear / 365.25 + rng.random() * 2 * np.pi)
        y = (base * (1 + 0.0002 * np.arange(n)) * np.array(wk)[ds.dayofweek] * season
             * (1 + 0.012 * promo) * np.where(hflag == 1, up, 1) * (1 + 0.07 * rng.standard_normal(n)))
        df = pd.DataFrame({"ds": ds, "y": np.maximum(y.round(), 0), "promo": promo, "holiday": hflag})
        out.append(Series(_sid(store, family), store, family, df))
    return out, hol


def favorita(top: int = 8) -> tuple[list[Series], set]:
    train = pd.read_csv(DATA_DIR / "train.csv", usecols=["date", "store_nbr", "family", "sales", "onpromotion"],
                        parse_dates=["date"])
    best = train.groupby(["store_nbr", "family"]).sales.sum().nlargest(top).index
    hp = DATA_DIR / "holidays_events.csv"
    if hp.exists():
        h = pd.read_csv(hp, parse_dates=["date"])
        h = h[(h.transferred.astype(str).str.lower() != "true") & (h.type != "Work Day")]
        hol = set(h.date.dt.date)
    else:
        hol = fixed_holidays(2013, 2018)
    out = []
    for store, family in best:
        d = train[(train.store_nbr == store) & (train.family == family)].sort_values("date")
        df = pd.DataFrame({"ds": d.date, "y": d.sales, "promo": d.onpromotion.astype(float)})
        df["holiday"] = is_holiday(df.ds, hol)
        out.append(Series(_sid(store, family), int(store), family, df.reset_index(drop=True)))
    return out, hol


def load() -> tuple[dict[str, Series], set, str]:
    if (DATA_DIR / "train.csv").exists():
        series, hol = favorita()
        source = "kaggle"
    else:
        series, hol = synthetic()
        source = "demo"
    return {s.id: s for s in series}, hol, source
