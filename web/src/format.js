const nf = (d) => new Intl.NumberFormat("uk-UA", { maximumFractionDigits: d, minimumFractionDigits: d })

export const num = (v, d = 0) => (v == null ? "—" : nf(d).format(v))
export const pct = (v, d = 1) => (v == null ? "—" : `${nf(d).format(v * 100)}%`)
export const signed = (v) => (v == null ? "—" : `${v > 0 ? "+" : ""}${nf(1).format(v)}%`)
export const dateUa = (iso) => iso.split("-").reverse().join(".")
export const dayUa = (iso) => ["нд", "пн", "вт", "ср", "чт", "пт", "сб"][new Date(iso + "T00:00:00").getDay()]
export const dateTime = (iso) =>
  new Date(iso).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
