import { useEffect, useState } from 'react'
import { useStore } from '../store.jsx'
import { money } from '../lib/format.js'

const TOKENS = ['--series-1', '--series-2', '--series-3', '--series-4', '--grid', '--text-2', '--text-3', '--surface', '--border-strong', '--good', '--warn', '--bad', '--brand']

// Recharts necesita colores concretos: se leen de las variables CSS del tema activo.
export function useChartColors() {
  const { theme } = useStore()
  const [c, setC] = useState(() => read())
  useEffect(() => {
    setC(read())
  }, [theme])
  return c
}

function read() {
  const cs = getComputedStyle(document.documentElement)
  const o = {}
  for (const t of TOKENS) o[t.slice(2).replace(/-(\w)/g, (_, x) => x.toUpperCase())] = cs.getPropertyValue(t).trim()
  o.fontSize = parseFloat(cs.getPropertyValue('--fs')) > 15 ? 14 : 12
  return o
}

export function ChartTip({ active, payload, label, format = money, labelFormat }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tip">
      <div className="tt-title">{labelFormat ? labelFormat(label, payload) : label}</div>
      {payload.map((p) => (
        <div className="tt-row" key={p.dataKey}>
          <span>
            <i style={{ background: p.color || p.fill || p.stroke }} />
            {p.name}
          </span>
          <span className="num strong">{format(p.value, p)}</span>
        </div>
      ))}
    </div>
  )
}

export function axisProps(c) {
  return {
    tick: { fill: c.text3, fontSize: c.fontSize },
    axisLine: { stroke: c.grid },
    tickLine: false,
  }
}
