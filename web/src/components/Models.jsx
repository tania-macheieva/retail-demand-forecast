import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { fetchModels } from "../api.js"
import { num, pct, signed } from "../format.js"

export default function Models() {
  const [state, setState] = useState(null)

  useEffect(() => {
    let alive = true
    const tick = () => fetchModels().then((d) => {
      if (!alive) return
      setState(d)
      if (d.rows.length < d.total) setTimeout(tick, 5000) // чекаємо, поки прогрів порахує решту
    })
    tick()
    return () => { alive = false }
  }, [])

  if (!state) return <p className="muted">Завантаження…</p>
  const { rows, total } = state
  const avg = (k) => rows.reduce((s, r) => s + r[k], 0) / rows.length
  const gain = rows.length ? ((avg("wape_prophet") - avg("wape_hybrid")) / avg("wape_prophet")) * 100 : null
  const chart = rows.map((r) => ({
    name: r.name.replace("Магазин ", ""), Prophet: +(r.wape_prophet * 100).toFixed(2), Hybrid: +(r.wape_hybrid * 100).toFixed(2)
  }))

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Порівняння моделей</h1>
          <p className="muted">WAPE на відкладеній вибірці (останні 14 днів): чистий Prophet проти гібрида Prophet + LightGBM. Менше — краще.</p>
        </div>
      </header>

      {rows.length < total && (
        <div className="banner banner-run"><span className="spinner" /> Пораховано {rows.length} з {total} серій — решта обчислюється у фоні.</div>
      )}
      {rows.length === 0 ? (
        <div className="card empty"><h2>Метрик ще немає</h2><p>Відкрийте дашборд і побудуйте прогноз для будь-якої серії (горизонт 14 днів, промо 0).</p></div>
      ) : (
        <>
          <section className="kpis kpis-3">
            <div className="card kpi"><span className="kpi-label">Середній WAPE Prophet</span><span className="kpi-value">{num(avg("wape_prophet") * 100, 2)}%</span></div>
            <div className="card kpi"><span className="kpi-label">Середній WAPE Hybrid</span><span className="kpi-value">{num(avg("wape_hybrid") * 100, 2)}%</span></div>
            <div className="card kpi"><span className="kpi-label">Покращення</span><span className={`kpi-value ${gain < 0 ? "down" : "up"}`}>{signed(gain)}</span></div>
          </section>
          <section className="card">
            <div className="card-head"><h2>WAPE по серіях, %</h2></div>
            <div className="chart-wrap">
              <ResponsiveContainer>
                <BarChart data={chart}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
                  <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }} formatter={(v) => `${v}%`} />
                  <Legend />
                  <Bar dataKey="Prophet" fill="#c6a06a" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="Hybrid" fill="#587d51" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
          <section className="card">
            <div className="table-scroll">
              <table>
                <thead><tr><th>Серія</th><th className="r">WAPE Prophet</th><th className="r">WAPE Hybrid</th><th className="r">Покращення</th><th className="r">RMSE</th></tr></thead>
                <tbody>
                  {rows.map((r) => {
                    const g = ((r.wape_prophet - r.wape_hybrid) / r.wape_prophet) * 100
                    return (
                      <tr key={r.id}>
                        <td>{r.name}</td><td className="r">{pct(r.wape_prophet)}</td>
                        <td className="r strong">{pct(r.wape_hybrid)}</td>
                        <td className={`r ${g < 0 ? "down" : "up"}`}>{signed(g)}</td>
                        <td className="r">{num(r.rmse_hybrid, 1)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  )
}
