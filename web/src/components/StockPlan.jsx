import { useState } from "react"
import { SERVICE_LEVELS, stockPlan } from "../stock.js"
import { num } from "../format.js"

const MESSAGES = {
  shortage: (p) => <><strong>Дефіцит.</strong> Поточного запасу не вистачить навіть на очікуваний попит. Рекомендовано замовити <strong>{num(p.order)}</strong> од.</>,
  low: (p) => <><strong>Ризик дефіциту.</strong> Запас покриває середній попит, але не страховий буфер. Рекомендовано замовити <strong>{num(p.order)}</strong> од.</>,
  ok: () => <><strong>Запасу достатньо.</strong> Поточний запас перевищує цільовий рівень, замовляти не потрібно.</>
}

export default function StockPlan({ data }) {
  const [stock, setStock] = useState("")
  const [leadTime, setLeadTime] = useState(3)
  const [level, setLevel] = useState("95")

  const p = stockPlan({
    forecast: data.forecast, rmse: data.metrics.rmse_hybrid,
    stock: stock === "" ? null : Number(stock), leadTime: Number(leadTime) || 1, level
  })

  return (
    <section className="card">
      <div className="card-head"><h2>Рекомендація із запасів</h2></div>
      <div className="stock-form">
        <label className="field"><span>Поточний запас, од.</span>
          <input type="number" min="0" className="narrow" placeholder={String(p.current)} value={stock}
                 onChange={(e) => setStock(e.target.value)} /></label>
        <label className="field"><span>Термін доставки, днів</span>
          <input type="number" min="1" max={data.forecast.length} className="narrow" value={leadTime}
                 onChange={(e) => setLeadTime(e.target.value)} /></label>
        <label className="field"><span>Рівень сервісу</span>
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            {Object.keys(SERVICE_LEVELS).map((k) => <option key={k} value={k}>{k}%</option>)}
          </select></label>
      </div>

      <div className="stock-grid">
        <div><span className="kpi-label">Очікуваний попит за {p.L} дн.</span><strong>{num(p.demand)}</strong></div>
        <div><span className="kpi-label">Страховий запас (z={p.z})</span><strong>{num(p.safety)}</strong></div>
        <div><span className="kpi-label">Цільовий запас</span><strong>{num(p.target)}</strong></div>
        <div><span className="kpi-label">Запас покриває</span><strong>{p.coverage != null ? `${num(p.coverage, 1)} дн.` : "—"}</strong></div>
      </div>

      <div className={`stock-result stock-${p.status}`}>{MESSAGES[p.status](p)}</div>
      <p className="muted small">
        Формула: Σ прогнозу за період доставки + z · RMSE · √L. RMSE гібрида: {num(data.metrics.rmse_hybrid, 1)}.
        Якщо запас не вказано, показано демо-значення (4 дні середнього попиту).
      </p>
    </section>
  )
}
