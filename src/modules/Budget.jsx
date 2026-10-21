import { useMemo, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { Card, Callout, Badge } from '../components/ui.jsx'
import { useChartColors, ChartTip, axisProps } from '../components/charts.jsx'
import { money, moneyShort, axisMoney, monthLabel, pct } from '../lib/format.js'

function Slider({ label, value, onChange, min, max, step, fmt }) {
  return (
    <div className="field">
      <label style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <span style={{ color: 'var(--text)', textTransform: 'none', letterSpacing: 0 }}>{fmt(value)}</span>
      </label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ accentColor: 'var(--brand)' }} />
    </div>
  )
}

// Reparte un importe según un plazo en días: parte en el mes k y parte en el k+1
const lagWeights = (days) => {
  const L = days / 30
  const k = Math.floor(L)
  const f = L - k
  return { k, f }
}

function project(p, n = 12) {
  const rows = []
  const sales = (i) => p.base * Math.pow(1 + p.growth, i)
  const cw = lagWeights(p.collectDays)
  const pw = lagWeights(p.payDays)
  const cred0 = p.base * p.share // saldo inicial: un mes de ventas a crédito a 30 días
  const debt0 = p.base * (1 - p.margin) * 0.5 // saldo inicial: compras a 15 días
  let cash = p.cash0
  let cumRes = 0
  let collectedNew = 0
  let paidNew = 0
  let creditTotal = 0
  let purchTotal = 0
  for (let i = 1; i <= n; i++) {
    const S = sales(i)
    const credit = S * p.share
    const cmv = S * (1 - p.margin)
    creditTotal += credit
    purchTotal += cmv
    let cobrosCred = i === 1 ? cred0 : 0
    let pagosProv = i === 1 ? debt0 : 0
    for (let j = 1; j <= i; j++) {
      const age = i - j
      const wc = (age === cw.k ? 1 - cw.f : 0) + (age === cw.k + 1 ? cw.f : 0)
      const wp = (age === pw.k ? 1 - pw.f : 0) + (age === pw.k + 1 ? pw.f : 0)
      cobrosCred += sales(j) * p.share * wc
      pagosProv += sales(j) * (1 - p.margin) * wp
    }
    collectedNew += cobrosCred - (i === 1 ? cred0 : 0)
    paidNew += pagosProv - (i === 1 ? debt0 : 0)
    const cobros = S * (1 - p.share) + cobrosCred
    const res = S - cmv - p.fixed
    cumRes += res
    const inicial = cash
    cash += cobros - pagosProv - p.fixed
    rows.push({ i, label: monthLabel(addMonths(p.startKey, i)), S, cmv, fixed: p.fixed, res, cumRes, cobros, pagosProv, flujo: cobros - pagosProv - p.fixed, inicial, cash })
  }
  const creditos = creditTotal - collectedNew
  const deudas = purchTotal - paidNew
  const pn0 = p.cash0 + cred0 + p.stock - debt0
  return { rows, balance: { caja: cash, creditos, mercaderias: p.stock, deudas, pn0, resultado: cumRes, pn: pn0 + cumRes } }
}

function addMonths(key, n) {
  const y = Number(key.slice(0, 4))
  const m = Number(key.slice(5, 7)) - 1 + n
  return `${y + Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}`
}

export default function Budget({ metrics: m }) {
  const c = useChartColors()
  const recent = m.months.slice(-4, -1)
  const base0 = Math.round(recent.reduce((a, x) => a + x.net, 0) / recent.length / 1e6) * 1e6
  const fixed0 = Math.round((base0 * 0.2) / 1e6) * 1e6
  const defaults = { growth: 0.02, share: 0.55, collectDays: 30, payDays: 15, margin: 0.3 }
  const [p, setP] = useState(defaults)
  const set = (k) => (v) => setP({ ...p, [k]: v })
  const params = { ...p, base: base0, fixed: fixed0, cash0: Math.max(m.disponibilidades, 20e6), stock: m.stockValue, startKey: m.curKey }
  const { rows, balance } = useMemo(() => project(params), [JSON.stringify(params)])
  const minCash = rows.reduce((a, r) => (r.cash < a.cash ? r : a), rows[0])
  const presets = [
    { id: 'actual', label: 'Situación actual', v: defaults },
    { id: 'credito', label: 'Crecer vendiendo a 90 días', v: { ...defaults, growth: 0.05, share: 0.75, collectDays: 90, payDays: 15 } },
    { id: 'negociar', label: 'Negociar pago a 60 días', v: { ...defaults, growth: 0.05, share: 0.75, collectDays: 90, payDays: 60 } },
  ]
  const fmtD = (v) => `${v} días`
  const totalAct = balance.caja + balance.creditos + balance.mercaderias
  const totalPas = balance.deudas + balance.pn

  return (
    <div className="page">
      <Callout tone="info" title="Presupuesto económico y presupuesto financiero">
        El presupuesto económico registra ingresos y gastos cuando se devengan (al vender o comprar). El financiero los registra cuando se cobran o se pagan.
        La diferencia entre ambos está en los créditos a clientes y las deudas con proveedores, que se reflejan en el balance proyectado.
      </Callout>

      <div className="grid g-1-2" data-tour="budget-sim">
        <Card title="Supuestos" sub={`Ventas base: ${moneyShort(base0)} mensuales · gastos fijos ${moneyShort(fixed0)} · neto de IVA`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="btn-row">
              {presets.map((pr) => (
                <button key={pr.id} className={`btn sm ${JSON.stringify(pr.v) === JSON.stringify(p) ? 'primary' : ''}`} onClick={() => setP(pr.v)}>{pr.label}</button>
              ))}
            </div>
            <Slider label="Crecimiento mensual de ventas" value={p.growth} onChange={set('growth')} min={0} max={0.1} step={0.005} fmt={(v) => pct(v)} />
            <Slider label="Ventas en cuenta corriente" value={p.share} onChange={set('share')} min={0} max={1} step={0.05} fmt={(v) => pct(v, 0)} />
            <Slider label="Plazo de cobro a clientes" value={p.collectDays} onChange={set('collectDays')} min={0} max={120} step={15} fmt={fmtD} />
            <Slider label="Plazo de pago a proveedores" value={p.payDays} onChange={set('payDays')} min={0} max={90} step={15} fmt={fmtD} />
            <Slider label="Margen bruto" value={p.margin} onChange={set('margin')} min={0.15} max={0.45} step={0.01} fmt={(v) => pct(v, 0)} />
          </div>
        </Card>

        <Card title="Resultado acumulado y saldo de caja" sub="Próximos 12 meses"
          right={<div className="legend"><span><i style={{ background: c.series1 }} />Resultado económico acumulado</span><span><i style={{ background: c.series3 }} />Saldo de caja</span></div>}
        >
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={c.grid} />
                <XAxis dataKey="label" {...axisProps(c)} />
                <YAxis {...axisProps(c)} axisLine={false} tickFormatter={axisMoney} width={58} />
                <ReferenceLine y={0} stroke={c.text3} />
                <Tooltip content={<ChartTip />} />
                <Line dataKey="cumRes" name="Resultado acumulado" stroke={c.series1} strokeWidth={2.5} dot={false} />
                <Line dataKey="cash" name="Saldo de caja" stroke={c.series3} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ marginTop: 10 }}>
            {minCash.cash < 0 && rows[rows.length - 1].cumRes > 0 ? (
              <Callout tone="bad" title={`Gana dinero pero se queda sin caja en ${minCash.label}`}>
                El resultado acumulado es positivo ({moneyShort(rows[rows.length - 1].cumRes)} en 12 meses), pero el saldo de caja llega a {moneyShort(minCash.cash)}.
                Las ventas a crédito se cobran después de pagar a los proveedores: el crecimiento queda financiado con créditos a clientes.
              </Callout>
            ) : (
              <Callout tone="good" title="Resultado y caja acompañan">El saldo mínimo de caja es {moneyShort(minCash.cash)} en {minCash.label}. Los plazos de cobro y pago están equilibrados.</Callout>
            )}
          </div>
        </Card>
      </div>

      <Card title="Presupuesto económico y financiero mensual" sub="Montos netos de IVA" flush>
        <div className="table-wrap">
          <table className="t" style={{ fontSize: '0.86em' }}>
            <thead><tr><th>Concepto</th>{rows.map((r) => <th key={r.i} className="num">{r.label}</th>)}</tr></thead>
            <tbody>
              <tr><td className="section-title" colSpan={13}>Presupuesto económico (devengado)</td></tr>
              <tr><td>Ventas</td>{rows.map((r) => <td key={r.i} className="num">{axisMoney(r.S)}</td>)}</tr>
              <tr><td>Costo de ventas</td>{rows.map((r) => <td key={r.i} className="num">-{axisMoney(r.cmv)}</td>)}</tr>
              <tr><td>Gastos fijos</td>{rows.map((r) => <td key={r.i} className="num">-{axisMoney(r.fixed)}</td>)}</tr>
              <tr><td className="strong">Resultado del mes</td>{rows.map((r) => <td key={r.i} className={`num strong ${r.res < 0 ? 'bad' : ''}`}>{axisMoney(r.res)}</td>)}</tr>
              <tr><td className="section-title" colSpan={13}>Presupuesto financiero (percibido)</td></tr>
              <tr><td>Saldo inicial de caja</td>{rows.map((r) => <td key={r.i} className="num">{axisMoney(r.inicial)}</td>)}</tr>
              <tr><td>Cobranzas</td>{rows.map((r) => <td key={r.i} className="num">{axisMoney(r.cobros)}</td>)}</tr>
              <tr><td>Pagos a proveedores</td>{rows.map((r) => <td key={r.i} className="num">-{axisMoney(r.pagosProv)}</td>)}</tr>
              <tr><td>Pagos de gastos fijos</td>{rows.map((r) => <td key={r.i} className="num">-{axisMoney(r.fixed)}</td>)}</tr>
            </tbody>
            <tfoot><tr><td>Saldo final de caja</td>{rows.map((r) => <td key={r.i} className={`num ${r.cash < 0 ? 'bad' : ''}`}>{axisMoney(r.cash)}</td>)}</tr></tfoot>
          </table>
        </div>
      </Card>

      <Card title={`Balance proyectado al cierre de ${rows[rows.length - 1].label}`} sub="Vincula ambos presupuestos: la caja sale del financiero y el resultado del económico"
        right={Math.abs(totalAct - totalPas) < 1 ? <Badge tone="good">Activo = Pasivo + PN</Badge> : <Badge tone="bad">No balancea</Badge>}
      >
        <div className="grid g-2">
          <table className="t">
            <thead><tr><th>Activo</th><th className="num">Importe</th></tr></thead>
            <tbody>
              <tr><td>Caja y bancos <span className="muted small">(presupuesto financiero)</span></td><td className={`num ${balance.caja < 0 ? 'bad' : ''}`}>{money(balance.caja)}</td></tr>
              <tr><td>Créditos por ventas <span className="muted small">(vendido y no cobrado)</span></td><td className="num">{money(balance.creditos)}</td></tr>
              <tr><td>Mercaderías</td><td className="num">{money(balance.mercaderias)}</td></tr>
            </tbody>
            <tfoot><tr><td>Total del activo</td><td className="num">{money(totalAct)}</td></tr></tfoot>
          </table>
          <table className="t">
            <thead><tr><th>Pasivo y patrimonio neto</th><th className="num">Importe</th></tr></thead>
            <tbody>
              <tr><td>Deudas con proveedores <span className="muted small">(comprado y no pagado)</span></td><td className="num">{money(balance.deudas)}</td></tr>
              <tr><td>Patrimonio neto inicial</td><td className="num">{money(balance.pn0)}</td></tr>
              <tr><td>Resultado del período <span className="muted small">(presupuesto económico)</span></td><td className="num">{money(balance.resultado)}</td></tr>
            </tbody>
            <tfoot><tr><td>Total pasivo y patrimonio neto</td><td className="num">{money(totalPas)}</td></tr></tfoot>
          </table>
        </div>
        <p className="small muted" style={{ marginTop: 10 }}>Si la caja proyectada es negativa, en la práctica representa la necesidad de financiamiento (descubierto o préstamo) que habría que gestionar.</p>
      </Card>
    </div>
  )
}
