import { useEffect, useRef, useState } from "react"
import { fetchForecast } from "../api.js"
import ForecastChart from "./ForecastChart.jsx"
import Kpis from "./Kpis.jsx"
import ForecastTable from "./ForecastTable.jsx"
import StockPlan from "./StockPlan.jsx"
import { dateUa } from "../format.js"

export default function Dashboard({ series, seriesId, setSeriesId }) {
  const [horizon, setHorizon] = useState(14)
  const [promo, setPromo] = useState(0)
  const [applied, setApplied] = useState({ horizon: 14, promo: 0 })
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const reqId = useRef(0)

  const load = (refresh = false) => {
    const id = ++reqId.current
    setLoading(true); setError(null)
    fetchForecast(seriesId, { ...applied, refresh })
      .then((d) => id === reqId.current && setData(d))
      .catch((e) => id === reqId.current && setError(e.message))
      .finally(() => id === reqId.current && setLoading(false))
  }

  useEffect(() => { if (seriesId) load() }, [seriesId, applied])

  const current = series.find((s) => s.id === seriesId)

  return (
    <>
      <header className="page-head">
        <div>
          <div className="eyebrow"><span className="eyebrow-line" /> ЩОДЕННИЙ ЗРІЗ</div>
          <h1>Прогноз попиту</h1>
          <p className="page-intro">{current?.name} <span className="intro-separator">/</span> дані до {current && dateUa(current.last_date)}</p>
        </div>
        <div className="toolbar control-panel">
          <label className="field"><span>Серія</span>
            <select value={seriesId} onChange={(e) => setSeriesId(e.target.value)}>
              {series.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></label>
          <label className="field"><span>Горизонт</span>
            <select value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
              {[7, 14, 30].map((d) => <option key={d} value={d}>{d} днів</option>)}
            </select></label>
          <label className="field"><span>Промо (од./день)</span>
            <input type="number" min="0" className="narrow" value={promo}
                   onChange={(e) => setPromo(Math.max(0, Number(e.target.value)))} /></label>
          <button className="btn btn-primary" disabled={loading}
                  onClick={() => {
                    const same = applied.horizon === horizon && applied.promo === promo
                    same ? load(true) : setApplied({ horizon, promo })
                  }}>
            <span>{loading ? "Обчислення" : "Перерахувати"}</span><span className="button-arrow">↗</span>
          </button>
        </div>
      </header>

      {loading && <div className="banner banner-run"><span className="spinner" /> Модель навчається та будує прогноз… це займає до хвилини.</div>}
      {error && <div className="banner banner-fail">Помилка: {error}</div>}

      {data && (
        <div style={{ opacity: loading ? 0.55 : 1 }}>
          <Kpis data={data} />
          <section className="card">
            <div className="card-head">
              <div><div className="section-index">01 / ТРЕНД</div><h2>Факт і прогноз</h2></div>
              <span className="chart-note"><i /> Довірчий інтервал <span className="note-divider">·</span> пунктир — Prophet</span>
            </div>
            <ForecastChart data={data} />
          </section>
          <ForecastTable forecast={data.forecast} />
          <StockPlan data={data} />
        </div>
      )}
    </>
  )
}
