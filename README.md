# DemandIQ

Retail demand forecasting prototype built with **FastAPI**, **Prophet**, **LightGBM**, and **React**. It forecasts daily sales for store/product-family series, compares model accuracy, and provides a basic replenishment recommendation.

> **Prototype notice:** Demo data is synthetic. Forecasts and stock recommendations are for evaluation and demonstration, not production inventory decisions.

## Features

- Forecast 7, 14, or 30 days of demand for a selected series.
- Combine Prophet forecasts with a LightGBM residual correction.
- Include promotion and holiday regressors.
- View historical sales, forecast intervals, WAPE/RMSE metrics, and daily forecast details.
- Estimate a target stock level from forecast demand, lead time, and service level.
- Cache forecasts in memory for 24 hours and refresh them manually or nightly at 03:00 Kyiv time.
- Run the API and web app together with Docker Compose.

## Quick start with Docker

From the repository root:

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000). The API runs inside Docker and is available to the web app through the `/api` proxy.

## Run locally

You will need Python 3.11 and Node.js 20.

### 1. Start the API

From the repository root, create a virtual environment and install the API requirements.

**Windows PowerShell**

```powershell
cd api
py -3.11 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000
```

**macOS / Linux**

```bash
cd api
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

The API is available at [http://localhost:8000](http://localhost:8000), with interactive documentation at [http://localhost:8000/docs](http://localhost:8000/docs).

The API warms forecasts for all available series on startup by default. Set `WARMUP=0` before starting the API to skip this step (for example, when running tests).

### 2. Start the web app

In a second terminal, from the repository root:

```bash
cd web
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite development server proxies `/api` requests to `http://localhost:8000`.

## Data

Without a local dataset, the API generates eight synthetic daily series spanning approximately three years. They include weekly profiles, yearly seasonality, holidays, promotions, and random variation.

To use the supported Kaggle dataset, download `train.csv` from [Store Sales - Time Series Forecasting](https://www.kaggle.com/competitions/store-sales-time-series-forecasting) and place it in `api/data/`. Optionally add `holidays_events.csv` to the same directory. Restart the API to load the eight store/product-family series with the highest total sales.

The training CSV must contain `date`, `store_nbr`, `family`, `sales`, and `onpromotion` columns. Other retail datasets are not currently parsed by the application. Dataset files are excluded from Git; download them separately and follow Kaggle's terms of use.

## Forecasting approach

1. Prophet models daily sales using promotion and holiday regressors, with weekly seasonality and yearly seasonality when at least one year of history is available.
2. LightGBM learns to correct Prophet's historical residuals using calendar, promotion, holiday, and residual-lag features.
3. Forecast corrections are generated recursively across the requested horizon.
4. A 14-day holdout backtest reports WAPE for the hybrid and Prophet forecasts, plus hybrid RMSE.

At least 90 days of history are required to fit a forecast. The model is retrained for each uncached calculation; fitted models are not persisted.

## API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | API health check |
| `GET` | `/api/series` | Available series, data source, and refresh status |
| `GET` | `/api/series/{id}/forecast?horizon=14&promo=0&refresh=false` | History, forecast, and backtest metrics |
| `GET` | `/api/models` | Metrics for series already calculated; does not start new calculations |

`horizon` accepts values from 1 to 60, and `promo` must be non-negative. Set `refresh=true` to bypass the cached result for that request.

## Tests and build

Run the API tests from the `api` directory:

```bash
python -m pytest -q
```

Build the web app from the `web` directory:

```bash
npm ci
npm run build
```

## Limitations

- Synthetic demo results do not demonstrate accuracy on real retail data.
- The integrated real-data loader currently supports the Kaggle Store Sales CSV format only.
- Future promotion is a single value applied across the forecast horizon; there is no promotion calendar or weather input.
- Forecast cache is in process memory and is lost when the API restarts.
- Nightly refresh and startup warmup are process-local; there is no persistent scheduler or forecast store.

## Project structure

```text
api/                 FastAPI service, forecasting model, and tests
web/                 React/Vite dashboard
docker-compose.yml   Local container orchestration
```
