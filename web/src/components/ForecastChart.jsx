import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { num, dateUa } from "../format.js"

function buildRows(data) {
  const rows = data.history.map((h) => ({ ds: h.ds, actual: h.y }))
  const last = rows[rows.length - 1]
  last.forecast = last.actual // з'єднати лінію прогнозу з фактом
  data.forecast.forEach((f) =>
    rows.push({
      ds: f.date, forecast: f.yhat, prophet: f.prophet,
      band: [f.yhat_lower, f.yhat_upper]
    })
  )
  return rows
}

const HIDE = ["band"]

export default function ForecastChart({ data }) {
  const rows = buildRows(data)
  return (
    <div className="chart-wrap">
      <ResponsiveContainer>
        <ComposedChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis dataKey="ds" tickFormatter={(v) => dateUa(v).slice(0, 5)} tick={{ fill: "var(--muted)", fontSize: 12 }}
                 tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} tickLine={false} axisLine={false} width={48}
                 tickFormatter={(v) => num(v)} />
          <Tooltip
            labelFormatter={dateUa}
            formatter={(v, name) => (name === "Довірчий інтервал" ? `${num(v[0])} – ${num(v[1])}` : num(v))}
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12 }}
          />
          <Legend iconType="plainline" />
          <Area dataKey="band" name="Довірчий інтервал" stroke="none" fill="#c6d19e" fillOpacity={0.45} isAnimationActive={false} />
          <Line dataKey="actual" name="Факт" stroke="#bd634a" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line dataKey="prophet" name="Prophet" stroke="#9b9b8e" strokeWidth={1.5} strokeDasharray="2 3" dot={false} isAnimationActive={false} />
          <Line dataKey="forecast" name="Прогноз (гібрид)" stroke="#41634b" strokeWidth={2.5} strokeDasharray="7 4" dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
