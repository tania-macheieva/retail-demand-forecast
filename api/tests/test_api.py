import os
os.environ["WARMUP"] = "0"

from fastapi.testclient import TestClient
import numpy as np
import pandas as pd

from main import app, SERIES
from hybrid import fit_predict, backtest

client = TestClient(app)


def test_series_list():
    r = client.get("/api/series").json()
    assert r["source"] == "demo" and len(r["series"]) == 8


def test_unknown_series_404():
    assert client.get("/api/series/nope/forecast").status_code == 404


def test_forecast_and_models():
    sid = next(iter(SERIES))
    r = client.get(f"/api/series/{sid}/forecast?horizon=14")
    assert r.status_code == 200
    d = r.json()
    assert len(d["forecast"]) == 14 and len(d["history"]) == 60
    assert d["metrics"]["wape_hybrid"] < 0.25
    assert "_at" not in d
    m = client.get("/api/models").json()
    assert [x["id"] for x in m["rows"]] == [sid]
    # повторний запит береться з кешу
    assert client.get(f"/api/series/{sid}/forecast?horizon=14").json()["updated_at"] == d["updated_at"]


def test_short_history_raises():
    df = SERIES[next(iter(SERIES))].df.head(40)
    try:
        fit_predict(df, df.tail(5)[["ds", "promo", "holiday"]])
        assert False
    except ValueError:
        pass
