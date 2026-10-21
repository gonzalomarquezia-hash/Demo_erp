import { useMemo, useState } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import { useStore } from '../store.jsx'
import { Card, Kpi, Modal, Badge, Callout, usePaged, StatusBadge } from '../components/ui.jsx'
import { ImpactSteps, Entry, StockChangeTable, Compare, JournalHeader } from '../components/Impact.jsx'
import { createSale, customerBalance, saleTotals, itemById } from '../engine/engine.js'
import { computeMetrics } from '../engine/metrics.js'
import { ivaLabel, COMPANY } from '../engine/catalog.js'
import { money, moneyShort, fdate, pct, num, daysBetween } from '../lib/format.js'

export function saleStatus(s, today) {
  if (s.condition === 'contado' || s.total - s.paid <= 0.5) return 'Cobrada'
  if (s.paid > 0) return 'Parcial'
  if (s.due < today) return 'Vencida'
  return 'Pendiente'
}

export const SALES_FLOW = [
  { title: 'Presupuesto', who: 'Ventas', doc: 'Cotización al cliente', effect: 'Sin impacto contable' },
  { title: 'Pedido', who: 'Ventas', doc: 'Nota de pedido', effect: 'Control de stock y de límite de crédito' },
  { title: 'Remito', who: 'Depósito', doc: 'Remito de entrega', effect: 'Baja de stock y costo de venta' },
  { title: 'Factura', who: 'Ventas', doc: 'Factura A o B con CAE', effect: 'Deudores por ventas a Ventas e IVA DF' },
  { title: 'Cobranza', who: 'Tesorería', doc: 'Recibo', effect: 'Caja o Banco a Deudores por ventas' },
]

export function FlowSteps({ steps, current = -1, blocked = -1, done = 0, plain = false }) {
  return (
    <div className={`flow ${plain ? 'plain' : ''}`}>
      {steps.map((s, i) => (
        <div key={s.title} className={`flow-step ${i < done ? 'done' : ''} ${i === current ? 'current' : ''} ${i === blocked ? 'blocked' : ''}`}>
          <div className="flow-num">{i + 1}</div>
          <div className="flow-title">{s.title}</div>
          <div className="flow-meta">{s.who}</div>
          {s.doc && <div className="flow-meta">{s.doc}</div>}
          {s.effect && <div className="flow-meta" style={{ color: 'var(--text-2)', marginTop: 4 }}>{s.effect}</div>}
        </div>
      ))}
    </div>
  )
}

export default function Sales({ metrics: m }) {
  const { db } = useStore()
  const [q, setQ] = useState('')
  const [cond, setCond] = useState('todas')
  const [showNew, setShowNew] = useState(false)
  const [detail, setDetail] = useState(null)

  const rows = useMemo(() => {
    const ql = q.toLowerCase()
    return db.sales
      .filter((s) => cond === 'todas' || s.condition === cond)
      .filter((s) => !ql || s.number.toLowerCase().includes(ql) || db.customers.find((c) => c.id === s.customerId).name.toLowerCase().includes(ql))
      .slice()
      .reverse()
  }, [db.sales, db.customers, q, cond])
  const { slice, pager } = usePaged(rows, 14)

  const todaySales = db.sales.filter((s) => s.date === db.today)
  const monthSales = db.sales.filter((s) => s.date.slice(0, 7) === m.curKey)
  const ctaShare = monthSales.length ? monthSales.filter((s) => s.condition === 'ctacte').reduce((a, s) => a + s.net, 0) / m.cur.net : 0

  return (
    <div className="page">
      <Card title="Circuito administrativo de ventas" sub="Cada documento se genera a partir del anterior y dispara sus registros automáticamente" tour="sales-flow">
        <FlowSteps steps={SALES_FLOW} plain />
      </Card>

      <div className="grid g-4">
        <Kpi label="Facturas emitidas hoy" value={num(todaySales.length)} foot={<span>{moneyShort(todaySales.reduce((a, s) => a + s.net, 0))} netos</span>} />
        <Kpi label="Ventas del mes" value={moneyShort(m.cur.net)} foot={<span>{num(m.cur.count)} comprobantes</span>} />
        <Kpi label="Ticket promedio" value={moneyShort(m.avgTicket)} info="Ventas netas del mes / cantidad de facturas." foot={<span>Mes en curso</span>} />
        <Kpi label="Ventas en cuenta corriente" value={pct(ctaShare)} info="Proporción de las ventas del mes otorgadas a crédito." foot={<span>El resto se cobra al contado</span>} />
      </div>

      <Card title="Comprobantes de venta" flush right={
        <button className="btn primary" onClick={() => setShowNew(true)} data-tour="new-sale">
          <Plus size={16} /> Nueva venta
        </button>
      }>
        <div className="toolbar">
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 9, top: 10, color: 'var(--text-3)' }} />
            <input className="input" style={{ paddingLeft: 30, width: 300 }} placeholder="Buscar por cliente o número" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select" value={cond} onChange={(e) => setCond(e.target.value)}>
            <option value="todas">Todas las condiciones</option>
            <option value="contado">Contado</option>
            <option value="ctacte">Cuenta corriente</option>
          </select>
        </div>
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr><th>Fecha</th><th>Comprobante</th><th>Cliente</th><th>Condición</th><th className="num">Neto</th><th className="num">IVA</th><th className="num">Total</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {slice.map((s) => {
                const c = db.customers.find((x) => x.id === s.customerId)
                const live = Number(s.id.slice(1)) > db.seedCounts.sales
                return (
                  <tr key={s.id} className={`click ${live ? 'hl' : ''}`} onClick={() => setDetail(s.id)}>
                    <td className="nowrap">{fdate(s.date)}</td>
                    <td className="mono nowrap">{s.number}</td>
                    <td>{c.name} {live && <Badge tone="info" plain>Registrada en la demo</Badge>}</td>
                    <td>{s.condition === 'ctacte' ? 'Cuenta corriente' : `Contado (${s.method})`}</td>
                    <td className="num">{money(s.net)}</td>
                    <td className="num">{money(s.iva)}</td>
                    <td className="num strong">{money(s.total)}</td>
                    <td><StatusBadge status={saleStatus(s, db.today)} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {pager}
      </Card>

      {showNew && <NewSale onClose={() => setShowNew(false)} />}
      {detail && <SaleDetail saleId={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function NewSale({ onClose }) {
  const { db, run, toast, setPage } = useStore()
  const [customerId, setCustomerId] = useState('C001')
  const [condition, setCondition] = useState('ctacte')
  const [method, setMethod] = useState('transferencia')
  const [lines, setLines] = useState([])
  const [pick, setPick] = useState('')
  const [result, setResult] = useState(null)

  const customer = db.customers.find((c) => c.id === customerId)
  const isCF = customer.id === 'C000'
  const cond = isCF ? 'contado' : condition
  const full = lines.map((l) => ({ ...l, item: itemById(db, l.itemId) })).map((l) => ({ ...l, price: l.item.price }))
  const totals = saleTotals(full)
  const balance = isCF ? 0 : customerBalance(db, customerId)
  const overLimit = cond === 'ctacte' && balance + totals.total > customer.limit
  const overStock = full.some((l) => l.qty > l.item.stock)
  const invalid = !full.length || overLimit || overStock || full.some((l) => !(l.qty > 0))

  const rubros = [...new Set(db.items.map((i) => i.rubro))]
  const add = (id) => {
    if (!id || lines.some((l) => l.itemId === id)) return
    setLines([...lines, { itemId: id, qty: Math.max(1, Math.min(itemById(db, id).typicalQty, Math.floor(itemById(db, id).stock))) }])
    setPick('')
  }
  const example = () => {
    const wish = [['CEM-050', 40], ['HIE-010', 24], ['ARE-GRU', 6], ['LAD-H12', 600], ['CAL-025', 20], ['PIE-620', 4], ['MAL-150', 6], ['PEG-030', 10], ['CER-3535', 40]]
    const ok = wish
      .map(([id, q]) => [id, Math.min(q, Math.floor(itemById(db, id).stock * 0.6))])
      .filter(([, q]) => q >= 1)
      .slice(0, 3)
    setCustomerId('C001')
    setCondition('ctacte')
    setLines(ok.map(([itemId, qty]) => ({ itemId, qty })))
  }

  const confirm = () => {
    run('sale', (d, ctx) => {
      const before = computeMetrics(d)
      const r = createSale(d, { date: ctx.date, time: ctx.time, customerId, lines: full.map(({ itemId, qty, price }) => ({ itemId, qty, price })), condition: cond, method, user: ctx.user })
      return { ...r, before, after: computeMetrics(d) }
    }, {
      onDone: (r) => {
        setResult(r)
        toast({ tone: 'good', title: `${r.sale.number} emitida`, body: `CAE ${r.sale.cae} (simulado). ${customer.name}.` })
      },
    })
  }

  if (result) {
    const r = result
    const steps = [
      {
        module: 'Ventas', title: 'Factura electrónica emitida', badge: <Badge tone="good">Autorizada</Badge>,
        body: (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Compare items={[
              { label: 'Comprobante', value: r.sale.number },
              { label: 'Neto gravado', value: money(r.sale.net) },
              { label: 'IVA 21 %', value: money(r.sale.iva) },
              { label: 'Total', value: money(r.sale.total) },
            ]} />
            <div className="small muted">CAE {r.sale.cae}, vencimiento {fdate(r.sale.caeDue)}. En un ERP real el CAE lo otorga ARCA (ex AFIP) a través de un servicio web; aquí es simulado.</div>
          </div>
        ),
      },
      {
        module: 'Stock', title: `Remito ${r.sale.remito}: baja de existencias`,
        body: <StockChangeTable changes={r.stockChanges} />,
      },
      cond === 'ctacte'
        ? {
            module: 'Cuentas a cobrar', title: `Cuenta corriente de ${customer.name}`,
            body: (
              <Compare items={[
                { label: 'Saldo anterior', value: money(r.balanceBefore) },
                { label: 'Esta factura', value: `+ ${money(r.sale.total)}` },
                { label: 'Saldo actual', value: money(r.balanceAfter) },
                { label: 'Crédito disponible', value: money(customer.limit - r.balanceAfter), tone: customer.limit - r.balanceAfter < customer.limit * 0.1 ? 'warn' : '' },
                { label: 'Vencimiento', value: fdate(r.sale.due) },
              ]} />
            ),
          }
        : {
            module: 'Tesorería', title: method === 'efectivo' ? 'Ingreso en caja' : 'Acreditación bancaria',
            body: <Compare items={[{ label: method === 'efectivo' ? 'Caja' : 'Banco', value: `+ ${money(r.sale.total)}` }, { label: 'Medio de pago', value: method }]} />,
          },
      {
        module: 'Contabilidad', title: 'Asientos generados automáticamente',
        body: <div><JournalHeader />{r.entries.map((e) => <Entry key={e.id} entry={e} />)}</div>,
      },
      {
        module: 'Tablero de control', title: 'Indicadores actualizados',
        body: (
          <Compare items={[
            { label: 'Ventas del mes antes', value: money(r.before.cur.net) },
            { label: 'Ventas del mes ahora', value: money(r.after.cur.net), tone: 'good' },
            { label: 'Margen de esta venta', value: pct(1 - r.sale.cost / r.sale.net) },
            { label: 'Cumplimiento presupuesto', value: pct(r.after.cur.net / r.after.budgetToDate) },
          ]} />
        ),
      },
    ]
    return (
      <Modal size="wide" title="Una operación, todos los módulos actualizados" sub={`${r.sale.number} · ${customer.name} · ${money(r.sale.total)}`} onClose={onClose}
        foot={
          <>
            <button className="btn" onClick={() => { onClose(); setPage('contabilidad') }}>Ver libro diario</button>
            <button className="btn" onClick={() => { onClose(); setPage('stock') }}>Ver stock</button>
            <button className="btn primary" onClick={onClose}>Cerrar</button>
          </>
        }
      >
        <ImpactSteps steps={steps} />
      </Modal>
    )
  }

  return (
    <Modal size="wide" title="Nueva venta" sub="Factura con remito de entrega" onClose={onClose}
      foot={
        <>
          <button className="btn" onClick={example} style={{ marginRight: 'auto' }}>Cargar ejemplo</button>
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={invalid} onClick={confirm}>Confirmar y emitir factura</button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr' }}>
          <div className="field">
            <label>Cliente</label>
            <select className="select" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {db.customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Condición de venta</label>
            <select className="select" value={cond} disabled={isCF} onChange={(e) => setCondition(e.target.value)}>
              <option value="ctacte">Cuenta corriente</option>
              <option value="contado">Contado</option>
            </select>
          </div>
          <div className="field">
            <label>Medio de cobro</label>
            <select className="select" value={method} disabled={cond === 'ctacte'} onChange={(e) => setMethod(e.target.value)}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
            </select>
          </div>
        </div>

        {!isCF && (
          <div className="callout">
            <dl className="kv" style={{ gridTemplateColumns: 'repeat(4, auto 1fr)', width: '100%' }}>
              <dt>Condición IVA</dt><dd>{ivaLabel(customer.iva)} (factura {customer.iva === 'RI' ? 'A' : 'B'})</dd>
              <dt>Límite de crédito</dt><dd>{money(customer.limit)}</dd>
              <dt>Saldo actual</dt><dd>{money(balance)}</dd>
              <dt>Disponible</dt><dd className={customer.limit - balance < 0 ? 'bad' : ''}>{money(customer.limit - balance)}</dd>
            </dl>
          </div>
        )}

        <div>
          <div className="field" style={{ marginBottom: 10 }}>
            <label>Agregar artículo</label>
            <select className="select" value={pick} onChange={(e) => add(e.target.value)}>
              <option value="">Seleccionar un artículo del catálogo</option>
              {rubros.map((r) => (
                <optgroup key={r} label={r}>
                  {db.items.filter((i) => i.rubro === r).map((i) => (
                    <option key={i.id} value={i.id} disabled={i.stock <= 0}>
                      {i.code} · {i.name} · {money(i.price)} por {i.unit} · stock {num(i.stock)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="card" style={{ boxShadow: 'none' }}>
            <table className="t">
              <thead>
                <tr><th>Artículo</th><th className="num">Disponible</th><th className="num" style={{ width: 130 }}>Cantidad</th><th className="num">Precio unitario</th><th className="num">Subtotal</th><th /></tr>
              </thead>
              <tbody>
                {full.length === 0 && (
                  <tr><td colSpan={6} className="empty">Agregá artículos o usá "Cargar ejemplo".</td></tr>
                )}
                {full.map((l, i) => (
                  <tr key={l.itemId}>
                    <td>
                      <div>{l.item.name}</div>
                      <div className="small muted mono">{l.item.code}</div>
                    </td>
                    <td className={`num ${l.qty > l.item.stock ? 'bad strong' : ''}`}>{num(l.item.stock)} {l.item.unit}</td>
                    <td className="num">
                      <input className="input" type="number" min="1" style={{ width: 100, textAlign: 'right' }} value={l.qty}
                        onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} />
                    </td>
                    <td className="num">{money(l.price)}</td>
                    <td className="num strong">{money(l.qty * l.price)}</td>
                    <td><button className="btn icon ghost" onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label="Quitar"><Trash2 size={15} /></button></td>
                  </tr>
                ))}
              </tbody>
              {full.length > 0 && (
                <tfoot>
                  <tr><td colSpan={4} className="num">Neto gravado</td><td className="num">{money(totals.net)}</td><td /></tr>
                  <tr><td colSpan={4} className="num">IVA 21 %</td><td className="num">{money(totals.iva)}</td><td /></tr>
                  <tr><td colSpan={4} className="num">Total</td><td className="num" style={{ fontSize: '1.1em' }}>{money(totals.total)}</td><td /></tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
        {overStock && <Callout tone="bad" title="Stock insuficiente">El sistema no permite facturar más unidades de las disponibles en depósito.</Callout>}
        {overLimit && (
          <Callout tone="bad" title="Supera el límite de crédito del cliente">
            Saldo {money(balance)} + esta venta {money(totals.total)} = {money(balance + totals.total)}, por encima del límite de {money(customer.limit)}.
            Se puede cambiar la condición a contado o reducir el pedido.
          </Callout>
        )}
      </div>
    </Modal>
  )
}

export function SaleDetail({ saleId, onClose }) {
  const { db } = useStore()
  const s = db.sales.find((x) => x.id === saleId)
  const c = db.customers.find((x) => x.id === s.customerId)
  const entries = db.journal.filter((e) => e.doc === s.number || e.doc === s.remito)
  const receipts = db.receipts.filter((r) => r.applied.some((a) => a.saleId === s.id))
  const receiptEntries = db.journal.filter((e) => receipts.some((r) => r.number === e.doc))
  return (
    <Modal size="wide" title={s.number} sub={`${c.name} · ${fdate(s.date)}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="card" style={{ boxShadow: 'none' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', borderBottom: '1px solid var(--border)' }}>
            <div style={{ padding: 16 }}>
              <div className="strong">{COMPANY.name}</div>
              <div className="small text-2">{COMPANY.address}</div>
              <div className="small text-2">CUIT {COMPANY.cuit} · {COMPANY.iva}</div>
            </div>
            <div style={{ borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', padding: '10px 22px', textAlign: 'center' }}>
              <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{s.type}</div>
              <div className="small muted">Cód. {s.type === 'A' ? '01' : '06'}</div>
            </div>
            <div style={{ padding: 16, textAlign: 'right' }}>
              <div className="strong">Factura {s.number.slice(5)}</div>
              <div className="small text-2">Fecha de emisión {fdate(s.date)}</div>
              <div className="small text-2">Remito {s.remito}</div>
            </div>
          </div>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }} className="small">
            <strong>{c.name}</strong> · {ivaLabel(c.iva)} {c.cuit && `· CUIT ${c.cuit}`} · Condición: {s.condition === 'ctacte' ? `Cuenta corriente, vence ${fdate(s.due)}` : `Contado (${s.method})`}
          </div>
          <table className="t">
            <thead><tr><th>Código</th><th>Descripción</th><th className="num">Cantidad</th><th className="num">Precio unitario</th><th className="num">Subtotal</th></tr></thead>
            <tbody>
              {s.lines.map((l) => {
                const it = itemById(db, l.itemId)
                return (
                  <tr key={l.itemId}>
                    <td className="mono">{it.code}</td>
                    <td>{it.name}</td>
                    <td className="num">{num(l.qty)} {it.unit}</td>
                    <td className="num">{money(l.price)}</td>
                    <td className="num">{money(l.qty * l.price)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr><td colSpan={4} className="num">Neto gravado</td><td className="num">{money(s.net)}</td></tr>
              <tr><td colSpan={4} className="num">IVA 21 %</td><td className="num">{money(s.iva)}</td></tr>
              <tr><td colSpan={4} className="num">Total</td><td className="num">{money(s.total)}</td></tr>
            </tfoot>
          </table>
          <div style={{ padding: '10px 16px' }} className="small muted">CAE N.º {s.cae} · Vto. CAE {fdate(s.caeDue)} · Comprobante simulado sin validez fiscal</div>
        </div>

        <div className="grid g-2">
          <div>
            <div className="section-title" style={{ marginBottom: 8 }}>Asientos contables</div>
            <JournalHeader />
            {entries.map((e) => <Entry key={e.id} entry={e} />)}
          </div>
          <div>
            <div className="section-title" style={{ marginBottom: 8 }}>Cobranza</div>
            {s.condition === 'contado' && <p className="text-2">Cobrada al contado en el momento de la venta.</p>}
            {s.condition === 'ctacte' && receipts.length === 0 && (
              <p className="text-2">Pendiente de cobro. {s.due < db.today ? `Vencida hace ${daysBetween(s.due, db.today)} días.` : `Vence el ${fdate(s.due)}.`}</p>
            )}
            {receipts.length > 0 && <JournalHeader />}
            {receiptEntries.map((e) => <Entry key={e.id} entry={e} />)}
          </div>
        </div>
      </div>
    </Modal>
  )
}
