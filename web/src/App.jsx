import { useEffect, useState } from "react"
import { fetchSeries } from "./api.js"
import Dashboard from "./components/Dashboard.jsx"
import Models from "./components/Models.jsx"

export default function App() {
  const [page, setPage] = useState("dashboard")
  const [series, setSeries] = useState([])
  const [seriesId, setSeriesId] = useState("")
  const [source, setSource] = useState("")
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSeries()
      .then((d) => { setSeries(d.series); setSource(d.source); setSeriesId(d.series[0]?.id ?? "") })
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><i /><i /><i /><i /></span><span>Demand<span className="brand-light">IQ</span></span></div>
        <div className="sidebar-label">РОБОЧИЙ СТІЛ</div>
        <nav aria-label="Основна навігація">
          <button className={`nav-link ${page === "dashboard" ? "active" : ""}`} onClick={() => setPage("dashboard")}>
            <span className="nav-icon">01</span><span>Огляд попиту</span><span className="nav-arrow">↗</span>
          </button>
          <button className={`nav-link ${page === "models" ? "active" : ""}`} onClick={() => setPage("models")}>
            <span className="nav-icon">02</span><span>Точність моделей</span><span className="nav-arrow">↗</span>
          </button>
        </nav>
        <div className="sidebar-foot">
          <div className="sidebar-rule" />
          <span className="sidebar-label">ДЖЕРЕЛО ДАНИХ</span>
          <div className="source-status"><span className="status-dot" />{source ? source === "kaggle" ? "Kaggle Favorita" : "Демонстраційний набір" : "Підключення…"}</div>
          <span className="sidebar-meta">Prophet × LightGBM</span>
        </div>
      </aside>
      <main className="main">
        <div className="topline"><span>АНАЛІТИКА РОЗДРІБНОЇ ТОРГІВЛІ</span><span>ПОПИТ / 01</span></div>
        {error && <div className="banner banner-fail">Не вдалося підключитися до API: {error}</div>}
        {page === "dashboard" && seriesId && <Dashboard series={series} seriesId={seriesId} setSeriesId={setSeriesId} />}
        {page === "models" && <Models />}
      </main>
    </div>
  )
}
