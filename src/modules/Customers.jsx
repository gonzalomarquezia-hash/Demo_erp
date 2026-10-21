import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useStore } from '../store.jsx'
import { Card, Drawer, Modal, Badge, Progress, usePaged, Kpi } from '../components/ui.jsx'
import { ImpactSteps, Entry, Compare, JournalHeader } from '../components/Impact.jsx'
import { createReceipt, customerBalance, openInvoices } from '../engine/engine.js'
import { ivaLabel } from '../engine/catalog.js'
import { money, moneyShort, fdate, pct, daysBetween, addDays } from '../lib/format.js'

function customerRows(db) {
  const byC = {}
  for (const s of db.sales) {
    if (s.condition !== 'ctacte') continue
    const open = s.total - s.paid
    if (open <= 0.5) continue
    const r = (byC[s.customerId] ||= { balance: 0, overdue: 0, over60: 0, oldest: null })
    r.balance += open
    const late = daysBetween(s.due, db.today)
    if (late > 0) r.overdue += open
    if (late > 60) r.over60 += open
    if (late > 0 && (r.oldest == null || late > r.oldest)) r.oldest = late
  }
  return db.customers.filter((c) => c.id !== 'C000').map((c) => ({ c, ...(byC[c.id] || { balance: 0, overdue: 0, over60: 0, oldest: null }) }))
}

export default function Customers({ metrics: m }) {
  const { db } = useStore()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)
  const rows = useMemo(() => customerRows(db).filter((r) => r.c.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.balance - a.balance), [db, q])
  const { slice, pager } = usePaged(rows, 16)
  const total = Object.values(m.aging).reduce((a, b) => a + b, 0)
  const tones = ['info', 'warn', 'warn', 'bad', 'bad']

  return (
    <div className="page">
      <div className="grid g-5" data-tour="aging">
        {Object.entries(m.aging).map(([k, v], i) => (
          <div className="card kpi" key={k}>
            <div className="kpi-label">{k === 'A vencer' ? 'A vencer' : `Vencido ${k}`}</div>
            <div className="kpi-value" style={{ fontSize: '1.45em' }}>{moneyShort(v)}</div>
            <Progress value={v} max={total} color={`var(--${tones[i]})`} />
            <div className="kpi-foot">{pct(v / total)} del total a cobrar</div>
          </div>
        ))}
      </div>

      <div className="grid g-3">
        <Kpi label="Total cuentas a cobrar" value={moneyShort(m.deudores)} info="Coincide con el saldo contable de Deudores por ventas." foot={<span>{rows.filter((r) => r.balance > 0).length} clientes con saldo</span>} />
        <Kpi label="Días de cobro (DSO)" value={`${Math.round(m.dso)} días`} info="Cuentas a cobrar / (Ventas con IVA de los últimos 90 días / 90)." foot={<span>Plazo pactado habitual: 30 días</span>} />
        <Kpi label="Cheques en cartera" value={moneyShort(m.valores)} foot={<span>{m.chequesCartera.length} cheques a depositar</span>} />
      </div>

      <Card title="Clientes en cuenta corriente" sub="Hacé clic en un cliente para ver su cuenta corriente y registrar cobros" flush>
        <div className="toolbar">
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 9, top: 10, color: 'var(--text-3)' }} />
            <input className="input" style={{ paddingLeft: 30, width: 300 }} placeholder="Buscar cliente" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr><th>Cliente</th><th>Condición IVA</th><th className="num">Límite de crédito</th><th className="num">Saldo</th><th style={{ width: 140 }}>Uso del límite</th><th className="num">Vencido</th><th className="num">Mayor atraso</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {slice.map((r) => {
                const use = r.balance / r.c.limit
                const st = r.over60 > 0 ? ['bad', 'Moroso'] : r.overdue > 0 ? ['warn', 'Con deuda vencida'] : ['good', 'Al día']
                return (
                  <tr key={r.c.id} className="click" onClick={() => setSel(r.c.id)}>
                    <td>{r.c.name}</td>
                    <td className="text-2">{ivaLabel(r.c.iva)}</td>
                    <td className="num">{money(r.c.limit)}</td>
                    <td className="num strong">{money(r.balance)}</td>
                    <td><Progress value={use} color={use > 0.9 ? 'var(--bad)' : use > 0.7 ? 'var(--warn)' : 'var(--series-1)'} /></td>
                    <td className={`num ${r.overdue ? 'warn' : 'muted'}`}>{money(r.overdue)}</td>
                    <td className="num">{r.oldest ? `${r.oldest} días` : '-'}</td>
                    <td><Badge tone={st[0]}>{st[1]}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {pager}
      </Card>
      {sel && <CustomerDrawer customerId={sel} onClose={() => setSel(null)} />}
    </div>
  )
}

function CustomerDrawer({ customerId, onClose }) {
  const { db } = useStore()
  const [collect, setCollect] = useState(false)
  const c = db.customers.find((x) => x.id === customerId)
  const balance = customerBalance(db, customerId)

  // Cuenta corriente: facturas al debe, recibos al haber, con saldo acumulado
  const movs = []
  for (const s of db.sales) if (s.customerId === customerId && s.condition === 'ctacte') movs.push({ date: s.date, doc: s.number, debit: s.total, credit: 0, key: s.id, due: s.due })
  for (const r of db.receipts) if (r.customerId === customerId) movs.push({ date: r.date, doc: `${r.number} (${r.method})`, debit: 0, credit: r.amount, key: r.id })
  movs.sort((a, b) => (a.date === b.date ? (a.debit ? -1 : 1) : a.date < b.date ? -1 : 1))
  let run = 0
  for (const mv of movs) {
    run += mv.debit - mv.credit
    mv.balance = run
  }
  const shown = movs.slice(-30)
  const prior = movs.length > 30 ? movs[movs.length - 31].balance : 0
  const open = openInvoices(db, customerId)

  return (
    <Drawer title={c.name} sub={`${ivaLabel(c.iva)} · CUIT ${c.cuit} · Cliente desde ${c.since}`} onClose={onClose}
      right={<button className="btn primary" disabled={balance <= 0.5} onClick={() => setCollect(true)}>Registrar cobro</button>}
    >
      <div className="grid g-3">
        <Kpi label="Saldo" value={money(balance)} />
        <Kpi label="Límite de crédito" value={money(c.limit)} foot={<span>Disponible {money(c.limit - balance)}</span>} />
        <Kpi label="Plazo pactado" value={`${c.terms} días`} foot={<span>{open.length} facturas pendientes</span>} />
      </div>
      <Card title="Cuenta corriente" sub="Últimos 30 movimientos" flush>
        <table className="t">
          <thead><tr><th>Fecha</th><th>Comprobante</th><th className="num">Debe</th><th className="num">Haber</th><th className="num">Saldo</th></tr></thead>
          <tbody>
            {movs.length > 30 && (
              <tr><td colSpan={4} className="muted">Saldo anterior</td><td className="num">{money(prior)}</td></tr>
            )}
            {shown.map((mv) => (
              <tr key={mv.key}>
                <td className="nowrap">{fdate(mv.date)}</td>
                <td className="mono small">{mv.doc}</td>
                <td className="num">{mv.debit ? money(mv.debit) : ''}</td>
                <td className="num">{mv.credit ? money(mv.credit) : ''}</td>
                <td className="num strong">{money(mv.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {collect && <ReceiptModal customer={c} onClose={() => setCollect(false)} />}
    </Drawer>
  )
}

function ReceiptModal({ customer, onClose }) {
  const { db, run, toast } = useStore()
  const balance = customerBalance(db, customer.id)
  const overdue = openInvoices(db, customer.id).filter((s) => s.due < db.today).reduce((a, s) => a + s.total - s.paid, 0)
  const [amount, setAmount] = useState(Math.round(overdue || balance))
  const [method, setMethod] = useState('transferencia')
  const [chequeDue, setChequeDue] = useState(addDays(db.today, 30))
  const [result, setResult] = useState(null)

  const confirm = () =>
    run('receipt', (d, ctx) => createReceipt(d, { date: ctx.date, time: ctx.time, customerId: customer.id, amount: Math.min(amount, balance), method, chequeDue, user: ctx.user }), {
      onDone: (r) => {
        setResult(r)
        toast({ tone: 'good', title: `${r.receipt.number} registrado`, body: `Cobranza de ${customer.name} por ${money(r.receipt.amount)}.` })
      },
    })

  if (result) {
    const r = result
    return (
      <Modal size="wide" title="Cobranza registrada" sub={`${r.receipt.number} · ${customer.name}`} onClose={onClose} foot={<button className="btn primary" onClick={onClose}>Cerrar</button>}>
        <ImpactSteps steps={[
          {
            module: 'Tesorería', title: method === 'cheque' ? 'Cheque ingresado a cartera' : method === 'efectivo' ? 'Ingreso en caja' : 'Acreditación en banco',
            body: (
              <Compare items={[
                { label: 'Recibo', value: r.receipt.number },
                { label: 'Importe', value: money(r.receipt.amount) },
                { label: 'Medio', value: method },
                ...(r.cheque ? [{ label: 'Cheque', value: `${r.cheque.bank} N.º ${r.cheque.number}, cobro ${fdate(r.cheque.due)}` }] : []),
              ]} />
            ),
          },
          {
            module: 'Cuentas a cobrar', title: 'Imputación a facturas pendientes (de la más antigua a la más nueva)',
            body: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <table className="t" style={{ fontSize: '0.9em' }}>
                  <thead><tr><th>Factura</th><th className="num">Importe imputado</th></tr></thead>
                  <tbody>{r.receipt.applied.map((a) => <tr key={a.saleId}><td className="mono">{a.number}</td><td className="num">{money(a.amount)}</td></tr>)}</tbody>
                </table>
                <Compare items={[{ label: 'Saldo anterior', value: money(r.balanceBefore) }, { label: 'Saldo actual', value: money(r.balanceAfter), tone: 'good' }]} />
              </div>
            ),
          },
          { module: 'Contabilidad', title: 'Asiento generado', body: <div><JournalHeader />{r.entries.map((e) => <Entry key={e.id} entry={e} />)}</div> },
        ]} />
      </Modal>
    )
  }

  return (
    <Modal size="narrow" title="Registrar cobro" sub={customer.name} onClose={onClose}
      foot={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={!(amount > 0)} onClick={confirm}>Emitir recibo</button></>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <dl className="kv">
          <dt>Saldo total</dt><dd>{money(balance)}</dd>
          <dt>Vencido</dt><dd className="warn">{money(overdue)}</dd>
        </dl>
        <div className="field">
          <label>Importe</label>
          <input className="input" type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </div>
        <div className="field">
          <label>Medio de cobro</label>
          <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="transferencia">Transferencia bancaria</option>
            <option value="cheque">Cheque de pago diferido</option>
            <option value="efectivo">Efectivo</option>
          </select>
        </div>
        {method === 'cheque' && (
          <div className="field">
            <label>Fecha de cobro del cheque</label>
            <input className="input" type="date" value={chequeDue} onChange={(e) => setChequeDue(e.target.value)} />
          </div>
        )}
      </div>
    </Modal>
  )
}
