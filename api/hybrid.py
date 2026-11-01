"""Гібридна модель: Prophet (база) + LightGBM (корекція залишків).

1. Prophet навчається на історії з регресорами (promo, holiday).
2. Залишки r_t = y_t - yhat_t (in-sample) стають ціллю для LightGBM.
3. На горизонті прогнозу корекція рахується рекурсивно: лаги залишків
   добудовуються власними прогнозами корекції.
"""
import logging
import numpy as np
import pandas as pd
import lightgbm as lgb
from prophet import Prophet

logging.getLogger("cmdstanpy").setLevel(logging.WARNING)
logging.getLogger("prophet").setLevel(logging.WARNING)

REGS = ["promo", "holiday"]
MIN_HISTORY = 90
WARMUP = 28


def _calendar(df: pd.DataFrame) -> pd.DataFrame:
    df["dow"] = df.ds.dt.dayofweek
    df["month"] = df.ds.dt.month
    df["dom"] = df.ds.dt.day
    return df


def normalize_history(history: pd.DataFrame) -> pd.DataFrame:
    """Повний денний ряд без пропусків: відсутні дні -> інтерполяція y, promo/holiday = 0."""
    h = history.dropna(subset=["y"]).drop_duplicates("ds").set_index("ds").sort_index()
    full = pd.date_range(h.index.min(), h.index.max(), freq="D")
    h = h.reindex(full)
    h["y"] = h["y"].interpolate(limit_direction="both")
    for r in REGS:
        h[r] = h[r].fillna(0)
    return h.rename_axis("ds").reset_index()


def _resid_feats(hist_resid, row) -> list:
    r = np.asarray(hist_resid)
    return [row.dow, row.month, row.dom, row.promo, row.holiday,
            r[-7], r[-14], r[-28:].mean()]


def fit_predict(history: pd.DataFrame, future: pd.DataFrame) -> list[dict]:
    """history: ds,y,promo,holiday | future: ds,promo,holiday -> список прогнозів по днях."""
    history = _calendar(normalize_history(history))
    future = _calendar(future.copy().sort_values("ds").reset_index(drop=True))
    if len(history) < MIN_HISTORY:
        raise ValueError(f"Потрібно щонайменше {MIN_HISTORY} днів історії, є {len(history)}")

    m = Prophet(yearly_seasonality=len(history) >= 365, weekly_seasonality=True,
                daily_seasonality=False, changepoint_prior_scale=0.05)
    for r in REGS:
        m.add_regressor(r)
    m.fit(history[["ds", "y", *REGS]])

    fitted = m.predict(history[["ds", *REGS]])
    history["resid"] = history.y.values - fitted.yhat.values

    resid = history.resid.tolist()
    X, y = [], []
    for i in range(WARMUP, len(history)):
        X.append(_resid_feats(resid[:i], history.iloc[i]))
        y.append(resid[i])
    gbm = lgb.LGBMRegressor(n_estimators=500, learning_rate=0.05, num_leaves=31,
                            subsample=0.8, subsample_freq=5, colsample_bytree=0.8,
                            min_child_samples=10, random_state=42, verbose=-1)
    gbm.fit(np.array(X), np.array(y))

    base = m.predict(future[["ds", *REGS]])
    hist_resid = resid.copy()
    out = []
    for i, row in future.iterrows():
        corr = float(gbm.predict(np.array([_resid_feats(hist_resid, row)]))[0])
        hist_resid.append(corr)
        out.append({
            "date": row.ds.strftime("%Y-%m-%d"),
            "yhat": round(max(0.0, base.yhat[i] + corr), 2),
            "yhat_lower": round(max(0.0, base.yhat_lower[i] + corr), 2),
            "yhat_upper": round(max(0.0, base.yhat_upper[i] + corr), 2),
            "prophet": round(max(0.0, float(base.yhat[i])), 2),
        })
    return out


def _wape(a, f) -> float:
    return float(np.abs(a - f).sum() / max(float(np.abs(a).sum()), 1e-9))


def backtest(history: pd.DataFrame, horizon: int = 14) -> dict:
    """Порівняння гібрида та чистого Prophet на останніх `horizon` днях історії."""
    h = normalize_history(history)
    if len(h) < MIN_HISTORY + horizon:
        return {"wape_hybrid": None, "wape_prophet": None, "rmse_hybrid": None}
    train, test = h.iloc[:-horizon], h.iloc[-horizon:]
    preds = fit_predict(train, test[["ds", *REGS]])
    yhat = np.array([p["yhat"] for p in preds])
    ypro = np.array([p["prophet"] for p in preds])
    actual = test.y.values
    return {"wape_hybrid": _wape(actual, yhat),
            "wape_prophet": _wape(actual, ypro),
            "rmse_hybrid": float(np.sqrt(np.mean((actual - yhat) ** 2)))}
