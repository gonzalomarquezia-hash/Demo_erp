import { useMemo } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useStore } from '../store.jsx'
import { Card, Kpi, Badge, Callout, StatusBadge } from '../components/ui.jsx'
import { useChartColors, ChartTip, axisProps } from '../components/charts.jsx'
import { depositCheque } from '../engine/engine.js'
import { A } from '../engine/accounts.js'
import { money, moneyShort, axisMoney, fdate, addDays, daysBetween, plural } from '../lib/format.js'

function projectCash(db, m) {
  const weeks = Array.from({ length: 8 }, (_, w) => ({
    w, from: addDays(db.today, w * 7), to: addDays(db.today, w * 7 + 6),
    cobranzas: 0, contado: 0, cheques: 0, proveedores: 0, gastos: 0,
  }))
  const at = (date) => {
    const d = daysBetween(db.today, date < db.today ? db.today : date)
    return weeks[Math.floor(d / 7)]
  }
  // Ingresos: facturas a cobrar según vencimiento y atraso habitual del cliente
  for (const s of db.sales) {
    if (s.condition !== 'ctacte' || s.total - s.paid <= 0.5) continue
    const c = db.customers.find((x) => x.id === s.customerId)
    const wk = at(addDays(s.due, c.delay))
    if (wk) wk.cobranzas += s.total - s.paid
  }
  for (const ch of db.cheques) if (ch.status === 'En cartera') { const wk = at(ch.due); if (wk) wk.cheques += ch.amount }
  const from30 = addDays(db.today, -30)
  const contado30 = db.sales.filter((s) => s.condition === 'contado' && s.date > from30).reduce((a, s) => a + s.total, 0)
  for (const wk of weeks) wk.contado = (contado30 / 30) * 7

  // Egresos: facturas de proveedores, órdenes en curso y gastos fijos de fin de mes
  for (const p of db.pos) {
    const sup = db.suppliers.find((x) => x.id === p.supplierId)
    if (p.status === 'Facturada') { const wk = at(p.invoice.due); if (wk) wk.proveedores += p.invoice.total }
    if (p.status === 'Emitida' || p.status === 'Recibida') { const wk = at(addDays(p.date, sup.lead + sup.terms)); if (wk) wk.proveedores += p.net * 1.21 }
  }
  const lastMonthExpenses = db.journal
    .filter((e) => e.doc === 'Débito bancario' && e.date > addDays(db.today, -40))
    .slice(-4)
    .reduce((a, e) => a + e.lines[0].debit, 0)
  const ivaToPay = Math.max(0, -(db.bal[A.IVA_DF] || 0) - (db.bal[A.IVA_CF] || 0))
  for (const wk of weeks) {
    // Si en la semana cae un fin de mes, se debitan sueldos, servicios e IVA
    for (let d = 0; d < 7; d++) {
      const day = addDays(wk.from, d)
      if (addDays(day, 1).slice(8, 10) === '01') wk.gastos += lastMonthExpenses + ivaToPay * (wk.w < 2 ? 1 : 0.9)
    }
  }
  let saldo = m.caja + m.banco
  return weeks.map((wk) => {
    const ingresos = wk.cobranzas + wk.contado + wk.cheques
    const egresos = wk.proveedores + wk.gastos
    const inicial = saldo
    saldo += ingresos - egresos
    return { ...wk, label: `Sem. ${wk.w + 1}`, range: `${fdate(wk.from).slice(0, 5)} al ${fdate(wk.to).slice(0, 5)}`, ingresos, egresos, inicial, final: saldo }
  })
}

export default function Treasury({ metrics: m }) {
  const { db, run, toast } = useStore()
  const c = useChartColors()
  const proj = useMemo(() => projectCash(db, m), [db, m])
  const minWeek = proj.reduce((a, w) => (w.final < a.final ? w : a), proj[0])
  const bankMoves = useMemo(() => {
    const out = []
    for (let i = db.journal.length - 1; i >= 0 && out.length < 14; i--) {
      const e = db.journal[i]
      const l = e.lines.find((x) => x.account === A.BANCO)
      if (l) out.push({ e, amount: l.debit - l.credit })
    }
    return out
  }, [db.journal])
  const cheques = db.cheques.filter((ch) => ch.status === 'En cartera').sort((a, b) => (a.due < b.due ? -1 : 1))

  const deposit = (ch) =>
    run('deposit', (d, ctx) => depositCheque(d, ch.id, { date: ctx.date, time: ctx.time, user: ctx.user }), {
      onDone: () => toast({ tone: 'good', title: 'Cheque depositado', body: `${ch.bank} N.º ${ch.number} · ${money(ch.amount)}` }),
    })

  return (
    <div className="page">
      <div className="grid g-4" data-tour="treas-kpis">
        <Kpi label="Caja" value={money(m.caja)} foot={<span>Fondo fijo de mostrador</span>} />
        <Kpi label="Banco Provincia c/c" value={moneyShort(m.banco)} foot={<span>Saldo contable</span>} />
        <Kpi label="Valores a depositar" value={moneyShort(m.valores)} foot={<span>{plural(cheques.length, 'cheque', 'cheques')} en cartera</span>} />
        <Kpi label="Disponibilidades totales" value={moneyShort(m.disponibilidades)} />
      </div>

      <Card title="Flujo de fondos proyectado" sub="Próximas 8 semanas: ingresos y egresos esperados según vencimientos registrados en el sistema" tour="cashflow"
        right={<div className="legend"><span><i className="box" style={{ background: c.series1 }} />Ingresos</span><span><i className="box" style={{ background: c.series3 }} />Egresos</span></div>}
      >
        <div style={{ height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={proj} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="24%">
              <CartesianGrid vertical={false} stroke={c.grid} />
              <XAxis dataKey="label" {...axisProps(c)} />
              <YAxis {...axisProps(c)} axisLine={false} tickFormatter={axisMoney} width={54} />
              <Tooltip content={<ChartTip labelFormat={(l, p) => `${l} · ${p[0]?.payload.range}`} />} cursor={{ fill: c.grid, opacity: 0.5 }} />
              <Bar dataKey="ingresos" name="Ingresos" fill={c.series1} radius={[4, 4, 0, 0]} />
              <Bar dataKey="egresos" name="Egresos" fill={c.series3} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="table-wrap" style={{ marginTop: 10 }} data-tour="cashflow-table">
          <table className="t" style={{ fontSize: '0.86em' }}>
            <thead><tr><th>Concepto</th>{proj.map((w) => <th key={w.w} className="num">{w.label}<div className="muted" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{w.range}</div></th>)}</tr></thead>
            <tbody>
              <tr><td>Saldo inicial</td>{proj.map((w) => <td key={w.w} className="num">{axisMoney(w.inicial)}</td>)}</tr>
              <tr><td>Cobranzas de cuenta corriente</td>{proj.map((w) => <td key={w.w} className="num">{axisMoney(w.cobranzas)}</td>)}</tr>
              <tr><td>Cheques a depositar</td>{proj.map((w) => <td key={w.w} className="num">{axisMoney(w.cheques)}</td>)}</tr>
              <tr><td>Ventas de contado estimadas</td>{proj.map((w) => <td key={w.w} className="num">{axisMoney(w.contado)}</td>)}</tr>
              <tr><td>Pagos a proveedores</td>{proj.map((w) => <td key={w.w} className="num">-{axisMoney(w.proveedores)}</td>)}</tr>
              <tr><td>Sueldos, servicios e impuestos</td>{proj.map((w) => <td key={w.w} className="num">{w.gastos ? `-${axisMoney(w.gastos)}` : '0'}</td>)}</tr>
            </tbody>
            <tfoot><tr><td>Saldo final proyectado</td>{proj.map((w) => <td key={w.w} className={`num ${w.final < 0 ? 'bad' : ''}`}>{axisMoney(w.final)}</td>)}</tr></tfoot>
          </table>
        </div>
        <div style={{ marginTop: 12 }} data-tour="cashflow-callout">
          {minWeek.final < 0 ? (
            <Callout tone="bad" title={`Faltante de fondos proyectado en la ${minWeek.label.toLowerCase()}`}>Saldo mínimo de {money(minWeek.final)}. Conviene acelerar cobranzas, negociar plazos con proveedores o gestionar un descubierto con anticipación.</Callout>
          ) : (
            <Callout tone="info" title={`Saldo mínimo proyectado: ${moneyShort(minWeek.final)} (${minWeek.label.toLowerCase()})`}>Las cobranzas se estiman con el vencimiento de cada factura más el atraso habitual de cada cliente. Montos en millones de pesos.</Callout>
          )}
        </div>
      </Card>

      <div className="grid g-2">
        <Card title="Cheques en cartera" sub="Se depositan en la fecha de cobro" flush tour="treas-cheques">
          <table className="t">
            <thead><tr><th>Banco</th><th>Número</th><th>Librador</th><th>Fecha de cobro</th><th className="num">Importe</th><th /></tr></thead>
            <tbody>
              {cheques.slice(0, 12).map((ch) => (
                <tr key={ch.id}>
                  <td>{ch.bank}</td>
                  <td className="mono small">{ch.number}</td>
                  <td className="small">{db.customers.find((x) => x.id === ch.customerId).name}</td>
                  <td>{fdate(ch.due)}</td>
                  <td className="num">{money(ch.amount)}</td>
                  <td>{ch.due <= db.today ? <button className="btn sm" onClick={() => deposit(ch)}>Depositar</button> : <StatusBadge status="En cartera" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title="Últimos movimientos bancarios" flush tour="treas-bank">
          <table className="t">
            <thead><tr><th>Fecha</th><th>Concepto</th><th className="num">Importe</th></tr></thead>
            <tbody>
              {bankMoves.map(({ e, amount }) => (
                <tr key={e.id}>
                  <td className="nowrap">{fdate(e.date)}</td>
                  <td className="small">{e.concept}</td>
                  <td className={`num ${amount < 0 ? 'bad' : 'good'}`}>{amount < 0 ? '-' : '+'}{money(Math.abs(amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      <div className="small muted"><Badge tone="neutral" plain>Nota</Badge> En un ERP real este módulo se concilia con el extracto bancario que envía el banco.</div>
    </div>
  )
}
