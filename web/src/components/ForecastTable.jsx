import { num, dateUa, dayUa } from "../format.js"

export default function ForecastTable({ forecast }) {
  return (
    <section className="card">
      <div className="card-head"><h2>Прогноз по днях</h2></div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Дата</th><th className="r">Прогноз</th><th className="r">Нижня межа</th>
              <th className="r">Верхня межа</th><th className="r">Prophet</th><th className="r">Корекція LightGBM</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((f) => {
              const corr = f.yhat - f.prophet
              return (
                <tr key={f.date}>
                  <td>{dateUa(f.date)} <span className="muted">{dayUa(f.date)}</span></td>
                  <td className="r strong">{num(f.yhat)}</td>
                  <td className="r muted">{num(f.yhat_lower)}</td>
                  <td className="r muted">{num(f.yhat_upper)}</td>
                  <td className="r">{num(f.prophet)}</td>
                  <td className={`r ${corr < 0 ? "down" : "up"}`}>{corr > 0 ? "+" : ""}{num(corr, 1)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
