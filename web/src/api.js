async function get(url) {
  const res = await fetch(url)
  if (!res.ok) {
    let detail = res.statusText
    try { detail = (await res.json()).detail || detail } catch {}
    throw new Error(detail)
  }
  return res.json()
}

export const fetchSeries = () => get("/api/series")
export const fetchModels = () => get("/api/models")
export const fetchForecast = (id, { horizon, promo, refresh }) =>
  get(`/api/series/${encodeURIComponent(id)}/forecast?horizon=${horizon}&promo=${promo}${refresh ? "&refresh=true" : ""}`)
