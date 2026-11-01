import { num, pct, signed, dateTime } from "../format.js"

export default function Kpis({ data }) {
  const next7 = data.forecast.slice(0, 7).reduce((s, f) => s + f.yhat, 0)
  const prev7 = data.history.slice(-7).reduce((s, h) => s + h.y, 0)
  const change = prev7 > 0 ? ((next7 - prev7) / prev7) * 100 : null
  const { wape_hybrid: wh, wape_prophet: wp } = data.metrics
  const gain = wh != null && wp > 0 ? ((wp - wh) / wp) * 100 : null

  return (
    <section className="kpis">
      <div className="card kpi">
        <span className="kpi-label">Прогноз на 7 днів</span>
        <span className="kpi-value">{num(next7)}</span>
        <span className="kpi-sub muted">од. товару</span>
      </div>
      <div className="card kpi">
        <span className="kpi-label">Зміна до минулого тижня</span>
        <span className={`kpi-value ${change != null && change < 0 ? "down" : "up"}`}>{signed(change)}</span>
        <span className="kpi-sub muted">факт: {num(prev7)}</span>
      </div>
      <div className="card kpi">
        <span className="kpi-label">WAPE гібрида</span>
        <span className="kpi-value">{pct(wh)}</span>
        <span className="kpi-sub muted">
          {gain != null ? `на ${num(gain, 1)}% краще за Prophet (${pct(wp)})` : "бектест недоступний"}
        </span>
      </div>
      <div className="card kpi">
        <span className="kpi-label">Оновлено</span>
        <span className="kpi-value small">{dateTime(data.updated_at)}</span>
        <span className="kpi-sub muted">горизонт {data.horizon} дн., промо {num(data.promo)}</span>
      </div>
    </section>
  )
}
