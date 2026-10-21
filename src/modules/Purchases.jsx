import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store.jsx'
import { Card, Kpi, Modal, Badge, Callout, usePaged, StatusBadge } from '../components/ui.jsx'
import { ImpactSteps, Entry, StockChangeTable, JournalHeader, Compare } from '../components/Impact.jsx'
import { FlowSteps } from './Sales.jsx'
import { createPO, receivePO, registerInvoice, paySupplier, reorderSuggestion, threeWayMatch, itemById, saleTotals } from '../engine/engine.js'
import { A } from '../engine/accounts.js'
import { money, moneyShort, fdate, num } from '../lib/format.js'

export const PURCHASE_FLOW = [
  { title: 'Orden de compra', who: 'Compras', doc: 'OC numerada', effect: 'Compromiso, sin asiento' },
  { title: 'Recepción', who: 'Depósito', doc: 'Remito del proveedor', effect: 'Alta de stock: Mercaderías a Recepciones pendientes' },
  { title: 'Factura del proveedor', who: 'Contaduría', doc: 'Control de tres vías', effect: 'Recepciones pendientes e IVA CF a Proveedores' },
  { title: 'Orden de pago', who: 'Tesorería', doc: 'OP y transferencia', effect: 'Proveedores a Banco' },
]

function flowState(po) {
  if (po.status === 'Emitida') return { done: 1, current: 1 }
  if (po.status === 'Recibida') return { done: 2, current: 2 }
  if (po.status === 'Factura retenida') return { done: po.reception ? 2 : 1, blocked: 2 }
  if (po.status === 'Facturada') return { done: 3, current: 3 }
  return { done: 4 }
}

export default function Purchases({ metrics: m }) {
  const { db } = useStore()
  const [status, setStatus] = useState('todas')
  const [detail, setDetail] = useState(null)
  const [showNew, setShowNew] = useState(false)
  const rows = useMemo(() => db.pos.filter((p) => status === 'todas' || p.status === status).slice().sort((a, b) => (a.date === b.date ? (a.id < b.id ? 1 : -1) : a.date < b.date ? 1 : -1)), [db.pos, status])
  const { slice, pager } = usePaged(rows, 12)
  const open = db.pos.filter((p) => p.status === 'Emitida')
  const monthPurch = db.pos.filter((p) => p.date.slice(0, 7) === m.curKey).reduce((a, p) => a + p.net, 0)

  return (
    <div className="page">
      <Card title="Circuito administrativo de compras" sub="Cada etapa la ejecuta un sector distinto: separación de funciones y oposición de intereses" tour="po-flow">
        <FlowSteps steps={PURCHASE_FLOW} plain />
      </Card>

      <div className="grid g-4">
        <Kpi label="Órdenes de compra abiertas" value={num(open.length)} foot={<span>{moneyShort(open.reduce((a, p) => a + p.net, 0))} comprometidos</span>} />
        <Kpi label="Recibido sin facturar" value={moneyShort(-(db.bal[A.REC_PEND] || 0))} info="Saldo de la cuenta puente Recepciones pendientes de facturar: mercadería que ingresó y cuya factura todavía no se registró." foot={<span>Cuenta puente</span>} />
        <Kpi label="Compras del mes" value={moneyShort(monthPurch)} foot={<span>Órdenes emitidas, neto de IVA</span>} />
        <Kpi label="Facturas retenidas" value={num(m.retained.length)} tone={m.retained.length ? 'bad' : ''} foot={<span>Bloqueadas por el control de tres vías</span>} />
      </div>

      {m.retained.length > 0 && (
        <Card title="Facturas retenidas por el control de tres vías" sub="No pueden pagarse hasta resolver la diferencia" tour="retained" flush>
          <table className="t">
            <thead><tr><th>Orden de compra</th><th>Proveedor</th><th>Factura</th><th className="num">Total facturado</th><th>Motivo</th><th /></tr></thead>
            <tbody>
              {m.retained.map((p) => {
                const s = db.suppliers.find((x) => x.id === p.supplierId)
                const bad = p.invoice.match.find((x) => !x.ok)
                return (
                  <tr key={p.id} className="click" onClick={() => setDetail(p.id)}>
                    <td className="mono">{p.number}</td>
                    <td>{s.name}</td>
                    <td className="mono">{p.invoice.number}</td>
                    <td className="num">{money(p.invoice.total)}</td>
                    <td><Badge tone="bad">{bad.reason}</Badge></td>
                    <td><button className="btn sm">Ver detalle</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Card title="Órdenes de compra" flush right={<button className="btn primary" onClick={() => setShowNew(true)}><Plus size={16} /> Nueva orden de compra</button>}>
        <div className="toolbar">
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {['todas', 'Emitida', 'Recibida', 'Facturada', 'Factura retenida', 'Pagada'].map((s) => <option key={s} value={s}>{s === 'todas' ? 'Todos los estados' : s}</option>)}
          </select>
        </div>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Fecha</th><th>Número</th><th>Proveedor</th><th className="num">Renglones</th><th className="num">Neto</th><th>Emitida por</th><th>Estado</th></tr></thead>
            <tbody>
              {slice.map((p) => (
                <tr key={p.id} className="click" onClick={() => setDetail(p.id)}>
                  <td className="nowrap">{fdate(p.date)}</td>
                  <td className="mono nowrap">{p.number}</td>
                  <td>{db.suppliers.find((s) => s.id === p.supplierId).name}</td>
                  <td className="num">{p.lines.length}</td>
                  <td className="num">{money(p.net)}</td>
                  <td className="text-2">{p.createdBy}</td>
                  <td><StatusBadge status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pager}
      </Card>

      {showNew && <NewPO onClose={() => setShowNew(false)} onCreated={(id) => { setShowNew(false); setDetail(id) }} />}
      {detail && <PODetail poId={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function MatchTable({ db, match }) {
  return (
    <table className="t" style={{ fontSize: '0.88em' }}>
      <thead>
        <tr><th>Artículo</th><th className="num">OC cantidad</th><th className="num">OC precio</th><th className="num">Recibido</th><th className="num">Facturado</th><th className="num">Precio facturado</th><th>Resultado</th></tr>
      </thead>
      <tbody>
        {match.map((x) => (
          <tr key={x.itemId}>
            <td>{itemById(db, x.itemId).name}</td>
            <td className="num">{num(x.ocQty)}</td>
            <td className="num">{money(x.ocPrice)}</td>
            <td className={`num ${x.recQty !== x.invQty ? 'bad strong' : ''}`}>{num(x.recQty)}</td>
            <td className={`num ${x.recQty !== x.invQty ? 'bad strong' : ''}`}>{num(x.invQty)}</td>
            <td className={`num ${Math.abs(x.invPrice - x.ocPrice) > x.ocPrice * 0.005 ? 'bad strong' : ''}`}>{money(x.invPrice)}</td>
            <td><Badge tone={x.ok ? 'good' : 'bad'}>{x.reason}</Badge></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PODetail({ poId, onClose }) {
  const { db, run, toast } = useStore()
  const po = db.pos.find((p) => p.id === poId)
  const supplier = db.suppliers.find((s) => s.id === po.supplierId)
  const [impact, setImpact] = useState(null)
  const [invoicing, setInvoicing] = useState(false)
  const fs = flowState(po)
  const entries = db.journal.filter((e) => e.doc === po.reception?.number || (po.invoice && e.doc === po.invoice.number) || e.doc === po.payment?.number)

  const doReceive = () =>
    run('receive', (d, ctx) => receivePO(d, po.id, { date: ctx.date, time: ctx.time, user: ctx.user }), {
      onDone: (r) => {
        toast({ tone: 'good', title: 'Recepción registrada', body: `${r.po.reception.number} · ${supplier.name}` })
        setImpact({
          title: 'Mercadería recibida en depósito',
          steps: [
            { module: 'Stock', title: 'Alta de existencias y recálculo del costo promedio', body: <StockChangeTable changes={r.stockChanges} showReorder={false} showCost /> },
            { module: 'Contabilidad', title: 'Asiento de recepción', body: <div><JournalHeader />{r.entries.map((e) => <Entry key={e.id} entry={e} />)}<p className="small muted" style={{ marginTop: 8 }}>La cuenta puente Recepciones pendientes de facturar se cancela cuando llega la factura del proveedor.</p></div> },
          ],
        })
      },
    })

  const doPay = () =>
    run('pay', (d, ctx) => paySupplier(d, po.id, { date: ctx.date, time: ctx.time, user: ctx.user }), {
      onDone: (r) => {
        toast({ tone: 'good', title: `${r.payment.number} emitida`, body: `Pago a ${supplier.name} por ${money(r.payment.amount)}` })
        setImpact({
          title: 'Pago al proveedor',
          steps: [
            { module: 'Tesorería', title: 'Orden de pago y transferencia', body: <Compare items={[{ label: 'Orden de pago', value: r.payment.number }, { label: 'Importe', value: money(r.payment.amount) }, { label: 'Autorizó', value: r.payment.user }]} /> },
            { module: 'Contabilidad', title: 'Asiento de pago', body: <div><JournalHeader />{r.entries.map((e) => <Entry key={e.id} entry={e} />)}</div> },
          ],
        })
      },
    })

  const steps = PURCHASE_FLOW.map((s, i) => ({
    ...s,
    doc: [po.number, po.reception?.number, po.invoice?.number, po.payment?.number][i] || s.doc,
    who: [po.createdBy, po.reception?.user, po.invoice?.user, po.payment?.user][i] || s.who,
    effect: [fdate(po.date), po.reception && fdate(po.reception.date), po.invoice && fdate(po.invoice.date), po.payment && fdate(po.payment.date)][i] || 'Pendiente',
  }))

  return (
    <Modal size="wide" title={`${po.number} · ${supplier.name}`} sub={`Emitida el ${fdate(po.date)} por ${po.createdBy} · plazo de pago ${supplier.terms} días`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <FlowSteps steps={steps} done={fs.done} current={fs.current ?? -1} blocked={fs.blocked ?? -1} />

        {po.status === 'Factura retenida' && (
          <>
            <Callout tone="bad" title="Factura retenida por el control de tres vías">
              {po.reception
                ? 'La factura no coincide con la orden de compra o con lo recibido. No se registra la deuda ni se habilita el pago hasta que el proveedor emita la nota de crédito o la factura corregida.'
                : 'El proveedor facturó mercadería que todavía no ingresó al depósito. Sin remito de recepción no se reconoce la deuda: evita pagar insumos que nunca llegaron.'}
            </Callout>
            <MatchTable db={db} match={po.invoice.match} />
          </>
        )}

        <div className="btn-row">
          {(po.status === 'Emitida' || (po.status === 'Factura retenida' && !po.reception)) && <button className="btn primary" onClick={doReceive}>Registrar recepción (Depósito)</button>}
          {(po.status === 'Recibida' || (po.status === 'Factura retenida' && po.reception)) && (
            <button className="btn primary" onClick={() => setInvoicing(true)}>{po.status === 'Recibida' ? 'Registrar factura del proveedor (Contaduría)' : 'Registrar factura corregida (Contaduría)'}</button>
          )}
          {po.status === 'Facturada' && <button className="btn primary" onClick={doPay}>Emitir orden de pago (Tesorería)</button>}
          {po.status === 'Pagada' && <Badge tone="good">Circuito completo</Badge>}
        </div>

        {impact && (
          <div>
            <div className="section-title" style={{ marginBottom: 10 }}>{impact.title}: efectos en el sistema</div>
            <ImpactSteps steps={impact.steps} />
          </div>
        )}

        <div className="grid g-2">
          <div>
            <div className="section-title" style={{ marginBottom: 8 }}>Detalle de la orden</div>
            <table className="t" style={{ fontSize: '0.9em' }}>
              <thead><tr><th>Artículo</th><th className="num">Cantidad</th><th className="num">Precio</th><th className="num">Subtotal</th></tr></thead>
              <tbody>
                {po.lines.map((l) => {
                  const it = itemById(db, l.itemId)
                  return <tr key={l.itemId}><td>{it.name}</td><td className="num">{num(l.qty)} {it.unit}</td><td className="num">{money(l.price)}</td><td className="num">{money(l.qty * l.price)}</td></tr>
                })}
              </tbody>
              <tfoot><tr><td colSpan={3} className="num">Neto</td><td className="num">{money(po.net)}</td></tr></tfoot>
            </table>
            {po.invoice?.status === 'Conciliada' && (
              <div style={{ marginTop: 12 }}>
                <div className="section-title" style={{ marginBottom: 8 }}>Control de tres vías</div>
                <MatchTable db={db} match={po.invoice.match} />
              </div>
            )}
          </div>
          <div>
            <div className="section-title" style={{ marginBottom: 8 }}>Asientos de la operación</div>
            {entries.length === 0 && <p className="muted">La orden de compra no genera asiento: es un compromiso, no una operación devengada.</p>}
            {entries.length > 0 && <JournalHeader />}
            {entries.map((e) => <Entry key={e.id} entry={e} />)}
          </div>
        </div>
      </div>
      {invoicing && <InvoiceForm po={po} supplier={supplier} onClose={() => setInvoicing(false)} onDone={(imp) => { setInvoicing(false); setImpact(imp) }} />}
    </Modal>
  )
}

function InvoiceForm({ po, supplier, onClose, onDone }) {
  const { db, run, toast } = useStore()
  const [lines, setLines] = useState(() => (po.reception?.lines || po.lines).map((l) => ({ itemId: l.itemId, qty: l.qty, price: po.lines.find((o) => o.itemId === l.itemId).price })))
  const [number, setNumber] = useState(`FC A 0004-${String(30000 + po.number.slice(-4) * 3).padStart(8, '0')}`)
  const match = threeWayMatch(po, lines)
  const ok = match.every((x) => x.ok)
  const t = saleTotals(lines)

  const confirm = () =>
    run('invoice', (d, ctx) => registerInvoice(d, po.id, { date: ctx.date, time: ctx.time, user: ctx.user, number, lines }), {
      onDone: (r) => {
        toast({ tone: r.ok ? 'good' : 'bad', title: r.ok ? 'Factura conciliada y registrada' : 'Factura retenida', body: `${r.invoice.number} · ${supplier.name}` })
        onDone({
          title: r.ok ? 'Factura del proveedor registrada' : 'Factura retenida',
          steps: r.ok
            ? [
                { module: 'Compras', title: 'Control de tres vías superado', body: <MatchTable db={db} match={r.invoice.match} /> },
                { module: 'Cuentas a pagar', title: 'Deuda con el proveedor', body: <Compare items={[{ label: 'Factura', value: r.invoice.number }, { label: 'Total', value: money(r.invoice.total) }, { label: 'Vencimiento', value: fdate(r.invoice.due) }]} /> },
                { module: 'Contabilidad', title: 'Asiento de la factura', body: <div><JournalHeader />{r.entries.map((e) => <Entry key={e.id} entry={e} />)}</div> },
              ]
            : [{ module: 'Compras', title: 'La factura no coincide: queda retenida y no se puede pagar', body: <MatchTable db={db} match={r.invoice.match} /> }],
        })
      },
    })

  return (
    <Modal size="wide" title="Registrar factura del proveedor" sub={`${supplier.name} · ${po.number}`} onClose={onClose}
      foot={<><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" onClick={confirm}>Registrar factura</button></>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field" style={{ maxWidth: 320 }}>
          <label>Número de factura</label>
          <input className="input mono" value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
        <p className="text-2 small">Se cargan las cantidades y precios tal como figuran en la factura recibida. Probá modificar una cantidad o un precio para ver cómo actúa el control.</p>
        <table className="t">
          <thead><tr><th>Artículo</th><th className="num">Cantidad facturada</th><th className="num">Precio unitario facturado</th><th className="num">Subtotal</th></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={l.itemId}>
                <td>{itemById(db, l.itemId).name}</td>
                <td className="num"><input className="input" type="number" style={{ width: 110, textAlign: 'right' }} value={l.qty} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} /></td>
                <td className="num"><input className="input" type="number" style={{ width: 140, textAlign: 'right' }} value={l.price} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)))} /></td>
                <td className="num">{money(l.qty * l.price)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td colSpan={3} className="num">Neto</td><td className="num">{money(t.net)}</td></tr>
            <tr><td colSpan={3} className="num">IVA 21 %</td><td className="num">{money(t.iva)}</td></tr>
            <tr><td colSpan={3} className="num">Total</td><td className="num">{money(t.total)}</td></tr>
          </tfoot>
        </table>
        <div className="section-title">Vista previa del control de tres vías</div>
        <MatchTable db={db} match={match} />
        {ok ? <Callout tone="good" title="Conciliada">Orden de compra, recepción y factura coinciden. La factura se registrará y quedará habilitada para pago.</Callout>
          : <Callout tone="bad" title="Con diferencias">Si se confirma, la factura quedará retenida y no se podrá pagar.</Callout>}
      </div>
    </Modal>
  )
}

function NewPO({ onClose, onCreated }) {
  const { db, run, toast } = useStore()
  const [supplierId, setSupplierId] = useState('P04')
  const [lines, setLines] = useState(() => reorderSuggestion(db, 'P04'))
  const items = db.items.filter((i) => i.supplierId === supplierId)
  const net = lines.reduce((a, l) => a + l.qty * l.price, 0)

  const changeSupplier = (id) => {
    setSupplierId(id)
    setLines(reorderSuggestion(db, id))
  }
  const confirm = () =>
    run('po', (d, ctx) => createPO(d, { date: ctx.date, time: ctx.time, supplierId, lines, user: ctx.user }), {
      onDone: (r) => {
        toast({ tone: 'good', title: `${r.po.number} emitida`, body: db.suppliers.find((s) => s.id === supplierId).name })
        onCreated(r.po.id)
      },
    })

  return (
    <Modal size="wide" title="Nueva orden de compra" sub="Las cantidades sugeridas surgen del punto de reposición y del stock máximo de cada artículo" onClose={onClose}
      foot={<><button className="btn" onClick={() => setLines(reorderSuggestion(db, supplierId))} style={{ marginRight: 'auto' }}>Cargar sugerencia de reposición</button><button className="btn" onClick={onClose}>Cancelar</button><button className="btn primary" disabled={!lines.length || lines.some((l) => !(l.qty > 0))} onClick={confirm}>Emitir orden de compra</button></>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="field" style={{ maxWidth: 440 }}>
          <label>Proveedor</label>
          <select className="select" value={supplierId} onChange={(e) => changeSupplier(e.target.value)}>
            {db.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.rubro}</option>)}
          </select>
        </div>
        <table className="t">
          <thead><tr><th>Artículo</th><th className="num">Stock</th><th className="num">Punto de reposición</th><th className="num">Cantidad a pedir</th><th className="num">Precio pactado</th><th className="num">Subtotal</th><th /></tr></thead>
          <tbody>
            {lines.length === 0 && <tr><td colSpan={7} className="empty">No hay artículos de este proveedor bajo el punto de reposición. Agregá uno manualmente.</td></tr>}
            {lines.map((l, i) => {
              const it = itemById(db, l.itemId)
              return (
                <tr key={l.itemId}>
                  <td>{it.name}</td>
                  <td className={`num ${it.stock <= it.reorder ? 'warn strong' : ''}`}>{num(it.stock)}</td>
                  <td className="num">{num(it.reorder)}</td>
                  <td className="num"><input className="input" type="number" style={{ width: 110, textAlign: 'right' }} value={l.qty} onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} /></td>
                  <td className="num">{money(l.price)}</td>
                  <td className="num">{money(l.qty * l.price)}</td>
                  <td><button className="btn icon ghost" aria-label="Quitar" onClick={() => setLines(lines.filter((_, j) => j !== i))}><Trash2 size={15} /></button></td>
                </tr>
              )
            })}
          </tbody>
          <tfoot><tr><td colSpan={5} className="num">Neto</td><td className="num">{money(net)}</td><td /></tr></tfoot>
        </table>
        <div className="field" style={{ maxWidth: 440 }}>
          <label>Agregar artículo</label>
          <select className="select" value="" onChange={(e) => {
            const it = itemById(db, e.target.value)
            if (it && !lines.some((l) => l.itemId === it.id)) setLines([...lines, { itemId: it.id, qty: Math.max(1, Math.ceil(it.max - it.stock)), price: Math.round(it.cost) }])
          }}>
            <option value="">Seleccionar</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  )
}
