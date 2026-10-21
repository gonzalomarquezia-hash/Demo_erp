import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { Card, Kpi, Drawer, Badge, StatusBadge } from '../components/ui.jsx'
import { ImpactSteps, Entry, JournalHeader, Compare } from '../components/Impact.jsx'
import { paySupplier } from '../engine/engine.js'
import { money, moneyShort, fdate, daysBetween, num } from '../lib/format.js'

export default function Suppliers({ metrics: m }) {
  const { db } = useStore()
  const [sel, setSel] = useState(null)
  const rows = useMemo(() => db.suppliers.map((s) => {
    const pend = db.pos.filter((p) => p.supplierId === s.id && p.status === 'Facturada')
    const next = pend.map((p) => p.invoice.due).sort()[0]
    const overdue = pend.filter((p) => p.invoice.due < db.today).reduce((a, p) => a + p.invoice.total, 0)
    const year = db.pos.filter((p) => p.supplierId === s.id && p.invoice?.status === 'Conciliada').reduce((a, p) => a + p.invoice.net, 0)
    return { s, balance: pend.reduce((a, p) => a + p.invoice.total, 0), count: pend.length, next, overdue, year, retained: db.pos.filter((p) => p.supplierId === s.id && p.status === 'Factura retenida').length }
  }).sort((a, b) => b.balance - a.balance), [db])

  const buckets = { Vencido: 0, 'Próximos 7 días': 0, '8 a 15 días': 0, 'Más de 15 días': 0 }
  for (const p of db.pos) {
    if (p.status !== 'Facturada') continue
    const dd = daysBetween(db.today, p.invoice.due)
    buckets[dd < 0 ? 'Vencido' : dd <= 7 ? 'Próximos 7 días' : dd <= 15 ? '8 a 15 días' : 'Más de 15 días'] += p.invoice.total
  }

  return (
    <div className="page">
      <div className="grid g-4">
        {Object.entries(buckets).map(([k, v]) => (
          <Kpi key={k} label={`A pagar: ${k.toLowerCase()}`} value={moneyShort(v)} tone={k === 'Vencido' && v > 0 ? 'bad' : ''} />
        ))}
      </div>
      <Card title="Proveedores" sub="Saldo de facturas conciliadas pendientes de pago" flush right={<span className="small muted">Total cuentas a pagar {money(m.proveedores)} · {Math.round(m.dpo)} días de pago</span>}>
        <table className="t">
          <thead><tr><th>Proveedor</th><th>Rubro</th><th className="num">Plazo</th><th className="num">Compras 12 meses</th><th className="num">Facturas pendientes</th><th className="num">Saldo</th><th>Próximo vencimiento</th><th>Observaciones</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.s.id} className="click" onClick={() => setSel(r.s.id)}>
                <td>{r.s.name}</td>
                <td className="text-2">{r.s.rubro}</td>
                <td className="num">{r.s.terms} días</td>
                <td className="num">{moneyShort(r.year)}</td>
                <td className="num">{r.count}</td>
                <td className="num strong">{money(r.balance)}</td>
                <td>{r.next ? fdate(r.next) : '-'}</td>
                <td>{r.retained > 0 ? <Badge tone="bad">Factura retenida</Badge> : r.overdue > 0 ? <Badge tone="warn">Vencido</Badge> : <Badge tone="good">Al día</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {sel && <SupplierDrawer supplierId={sel} onClose={() => setSel(null)} />}
    </div>
  )
}

function SupplierDrawer({ supplierId, onClose }) {
  const { db, run, toast } = useStore()
  const s = db.suppliers.find((x) => x.id === supplierId)
  const [impact, setImpact] = useState(null)
  const pos = db.pos.filter((p) => p.supplierId === supplierId).slice(-25).reverse()
  const pend = db.pos.filter((p) => p.supplierId === supplierId && p.status === 'Facturada')

  const pay = (po) =>
    run('pay', (d, ctx) => paySupplier(d, po.id, { date: ctx.date, time: ctx.time, user: ctx.user }), {
      onDone: (r) => {
        toast({ tone: 'good', title: `${r.payment.number} emitida`, body: `${s.name} · ${money(r.payment.amount)}` })
        setImpact([
          { module: 'Tesorería', title: 'Orden de pago emitida', body: <Compare items={[{ label: 'Orden de pago', value: r.payment.number }, { label: 'Factura', value: po.invoice.number }, { label: 'Importe', value: money(r.payment.amount) }]} /> },
          { module: 'Contabilidad', title: 'Asiento de pago', body: <div><JournalHeader />{r.entries.map((e) => <Entry key={e.id} entry={e} />)}</div> },
        ])
      },
    })

  return (
    <Drawer title={s.name} sub={`CUIT ${s.cuit} · ${s.rubro} · Plazo de pago ${s.terms} días · Entrega en ${s.lead} días`} onClose={onClose}>
      {impact && <ImpactSteps steps={impact} />}
      <Card title="Facturas pendientes de pago" flush>
        <table className="t">
          <thead><tr><th>Factura</th><th>Fecha</th><th>Vencimiento</th><th className="num">Total</th><th /></tr></thead>
          <tbody>
            {pend.length === 0 && <tr><td colSpan={5} className="empty">Sin facturas pendientes.</td></tr>}
            {pend.map((p) => (
              <tr key={p.id}>
                <td className="mono small">{p.invoice.number}</td>
                <td>{fdate(p.invoice.date)}</td>
                <td className={p.invoice.due < db.today ? 'bad' : ''}>{fdate(p.invoice.due)}</td>
                <td className="num">{money(p.invoice.total)}</td>
                <td><button className="btn sm" onClick={() => pay(p)}>Pagar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Últimas órdenes de compra" flush>
        <table className="t">
          <thead><tr><th>Fecha</th><th>Número</th><th className="num">Renglones</th><th className="num">Neto</th><th>Estado</th></tr></thead>
          <tbody>
            {pos.map((p) => (
              <tr key={p.id}><td>{fdate(p.date)}</td><td className="mono small">{p.number}</td><td className="num">{num(p.lines.length)}</td><td className="num">{money(p.net)}</td><td><StatusBadge status={p.status} /></td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Drawer>
  )
}
