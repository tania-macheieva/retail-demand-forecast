export const SERVICE_LEVELS = { "90": 1.28, "95": 1.65, "97.5": 1.96, "99": 2.33 }

// цільовий запас = Σ прогнозу за період доставки + z · RMSE · √L
export function stockPlan({ forecast, rmse, stock, leadTime, level }) {
  const L = Math.min(Math.max(leadTime, 1), forecast.length)
  const demand = forecast.slice(0, L).reduce((s, f) => s + f.yhat, 0)
  const avg = demand / L
  const sigma = (rmse ?? avg * 0.1) * Math.sqrt(L)
  const z = SERVICE_LEVELS[level]
  const safety = z * sigma
  const target = demand + safety
  const current = stock ?? Math.round(avg * 4)
  const status = current < demand ? "shortage" : current < target ? "low" : "ok"
  return {
    L, demand, safety, target, z, current, status,
    order: Math.max(Math.ceil(target - current), 0),
    coverage: avg > 0 ? current / avg : null
  }
}
