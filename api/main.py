import asyncio
import os
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import pandas as pd
from fastapi import FastAPI, HTTPException, Query

import data
from hybrid import fit_predict, backtest

SERIES, HOLIDAYS, SOURCE = data.load()
TTL = timedelta(hours=24)
HISTORY_DAYS = 730
SHOW_DAYS = 60
TZ = ZoneInfo("Europe/Kyiv")

_cache: dict[tuple, dict] = {}
_compute_lock = threading.Lock()  # Prophet завантажує CPU — рахуємо по одному
_state = {"refreshing": False}


def compute(series_id: str, horizon: int, promo: float, force: bool = False) -> dict:
    key = (series_id, horizon, round(promo, 2))
    hit = _cache.get(key)
    if hit and not force and datetime.now() - hit["_at"] < TTL:
        return hit
    with _compute_lock:
        hit = _cache.get(key)  # хтось міг порахувати, поки ми чекали
        if hit and not force and datetime.now() - hit["_at"] < TTL:
            return hit
        s = SERIES[series_id]
        hist = s.df.tail(HISTORY_DAYS)
        last = hist.ds.max()
        fut_ds = pd.date_range(last + pd.Timedelta(days=1), periods=horizon, freq="D")
        future = pd.DataFrame({"ds": fut_ds, "promo": promo,
                               "holiday": data.is_holiday(fut_ds, HOLIDAYS)})
        forecast = fit_predict(hist, future)
        metrics = backtest(hist)
        shown = hist.tail(SHOW_DAYS)
        res = {
            "series": {"id": s.id, "name": s.name},
            "horizon": horizon, "promo": promo,
            "last_date": last.strftime("%Y-%m-%d"),
            "history": [{"ds": d.strftime("%Y-%m-%d"), "y": float(y)} for d, y in zip(shown.ds, shown.y)],
            "forecast": forecast,
            "metrics": metrics,
            "updated_at": datetime.now(TZ).isoformat(timespec="seconds"),
            "_at": datetime.now(),
        }
        _cache[key] = res
        return res


def refresh_all(horizon: int = 14):
    _state["refreshing"] = True
    try:
        for sid in SERIES:
            try:
                compute(sid, horizon, 0.0, force=True)
            except Exception as e:  # одна серія не повинна зупиняти решту
                print(f"[refresh] {sid}: {e}")
    finally:
        _state["refreshing"] = False


async def _nightly():
    while True:
        now = datetime.now(TZ)
        nxt = now.replace(hour=3, minute=0, second=0, microsecond=0)
        if nxt <= now:
            nxt += timedelta(days=1)
        await asyncio.sleep((nxt - now).total_seconds())
        await asyncio.to_thread(refresh_all)


@asynccontextmanager
async def lifespan(app):
    if os.getenv("WARMUP", "1") == "1":
        threading.Thread(target=refresh_all, daemon=True).start()
    task = asyncio.create_task(_nightly())
    yield
    task.cancel()


app = FastAPI(title="DemandIQ API", version="2.0.0", lifespan=lifespan)


def _public(d: dict) -> dict:
    return {k: v for k, v in d.items() if not k.startswith("_")}


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/series")
def list_series():
    return {"source": SOURCE, "refreshing": _state["refreshing"],
            "series": [{"id": s.id, "name": s.name, "last_date": s.df.ds.max().strftime("%Y-%m-%d")}
                       for s in SERIES.values()]}


@app.get("/api/series/{series_id}/forecast")
def forecast(series_id: str, horizon: int = Query(14, ge=1, le=60),
             promo: float = Query(0, ge=0), refresh: bool = False):
    if series_id not in SERIES:
        raise HTTPException(404, "Серію не знайдено")
    try:
        return _public(compute(series_id, horizon, promo, force=refresh))
    except ValueError as e:
        raise HTTPException(422, str(e))


@app.get("/api/models")
def models():
    """Метрики вже пораховані серій (горизонт 14, без промо). Нічого не обчислює."""
    rows = []
    for sid, s in SERIES.items():
        hit = _cache.get((sid, 14, 0.0))
        m = hit and hit["metrics"]
        if m and m.get("wape_hybrid") is not None:
            rows.append({"id": sid, "name": s.name, **m})
    return {"rows": rows, "total": len(SERIES), "refreshing": _state["refreshing"]}
