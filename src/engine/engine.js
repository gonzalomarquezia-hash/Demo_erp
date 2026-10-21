// Motor del ERP: cada operación actualiza en un solo paso stock, cuentas corrientes,
// contabilidad y auditoría. Es la "base de datos única" que integra todos los módulos.
// Las funciones reciben un borrador (draft) cuyos arreglos ya fueron copiados y lo modifican.

import { A, IVA_RATE, accName } from './accounts.js'
import { COMPANY } from './catalog.js'
import { addDays, daysBetween, pad, monthKey } from '../lib/format.js'

const round2 = (v) => Math.round(v * 100) / 100

export function cloneState(s) {
  return {
    ...s,
    seq: { ...s.seq },
    bal: { ...s.bal },
    items: s.items.slice(),
    sales: s.sales.slice(),
    receipts: s.receipts.slice(),
    cheques: s.cheques.slice(),
    pos: s.pos.slice(),
    payments: s.payments.slice(),
    stockMoves: s.stockMoves.slice(),
    journal: s.journal.slice(),
    audit: s.audit.slice(),
    fill: { ...s.fill },
    live: s.live.slice(),
  }
}

function nextSeq(d, key) {
  d.seq[key] = (d.seq[key] || 0) + 1
  return d.seq[key]
}

function replace(arr, index, patch) {
  arr[index] = { ...arr[index], ...patch }
  return arr[index]
}

export const itemById = (d, id) => d.items.find((i) => i.id === id)
export const customerById = (d, id) => d.customers.find((c) => c.id === id)
export const supplierById = (d, id) => d.suppliers.find((s) => s.id === id)

export function addJournal(d, { date, concept, doc, module, lines }) {
  const clean = lines
    .map((l) => ({ account: l.account, debit: round2(l.debit || 0), credit: round2(l.credit || 0) }))
    .filter((l) => l.debit !== 0 || l.credit !== 0)
  const n = nextSeq(d, 'asiento')
  const entry = { id: `AS${n}`, number: n, date, concept, doc, module, lines: clean }
  d.journal.push(entry)
  for (const l of clean) d.bal[l.account] = round2((d.bal[l.account] || 0) + l.debit - l.credit)
  return entry
}

export function addAudit(d, { date, time, user, action, doc, module, level = 'info' }) {
  d.audit.push({ id: `AU${d.audit.length + 1}`, date, time, user: user.name, role: user.role, action, doc, module, level })
}

function moveStock(d, itemId, qty, { date, type, doc, unitCost }) {
  const idx = d.items.findIndex((i) => i.id === itemId)
  const item = d.items[idx]
  const before = item.stock
  const after = round2(before + qty)
  let cost = item.cost
  if (qty > 0 && unitCost != null) {
    // Precio promedio ponderado: (stock anterior x costo anterior + ingreso x costo de compra) / stock nuevo
    cost = after > 0 ? round2((before * item.cost + qty * unitCost) / after) : unitCost
  }
  replace(d.items, idx, { stock: after, cost })
  d.stockMoves.push({ id: `SM${d.stockMoves.length + 1}`, date, itemId, type, doc, qty, balance: after, unitCost: qty > 0 ? unitCost : item.cost })
  return { item: d.items[idx], before, after, costBefore: item.cost, costAfter: cost }
}

// ---------------------------------------------------------------- Clientes

export function openInvoices(d, customerId) {
  return d.sales.filter((s) => s.customerId === customerId && s.condition === 'ctacte' && s.total - s.paid > 0.5)
}

export function customerBalance(d, customerId) {
  let b = 0
  for (const s of d.sales) if (s.customerId === customerId && s.condition === 'ctacte') b += s.total - s.paid
  return round2(b)
}

export function saleTotals(lines) {
  const net = round2(lines.reduce((s, l) => s + l.qty * l.price, 0))
  const iva = round2(net * IVA_RATE)
  return { net, iva, total: round2(net + iva) }
}

export function createSale(d, { date, time, customerId, lines, condition, method = 'efectivo', user }) {
  const customer = customerById(d, customerId)
  const type = customer.iva === 'RI' ? 'A' : 'B'
  const { net, iva, total } = saleTotals(lines)
  const number = `FC ${type} ${COMPANY.pointOfSale}-${pad(nextSeq(d, `fc${type}`), 8)}`
  const remito = `RT ${COMPANY.pointOfSale}-${pad(nextSeq(d, 'remito'), 8)}`
  const balanceBefore = condition === 'ctacte' ? customerBalance(d, customerId) : null

  const stockChanges = []
  let cost = 0
  const fullLines = lines.map((l) => {
    const item = itemById(d, l.itemId)
    cost += l.qty * item.cost
    return { ...l, cost: item.cost }
  })
  for (const l of fullLines) {
    const r = moveStock(d, l.itemId, -l.qty, { date, type: 'Venta', doc: remito })
    stockChanges.push({ itemId: l.itemId, name: r.item.name, unit: r.item.unit, qty: l.qty, before: r.before, after: r.after, reorder: r.item.reorder })
  }
  cost = round2(cost)

  const debitAccount = condition === 'ctacte' ? A.DEUDORES : method === 'transferencia' ? A.BANCO : A.CAJA
  const e1 = addJournal(d, {
    date, module: 'Ventas', doc: number,
    concept: `${number} - ${customer.name}`,
    lines: [
      { account: debitAccount, debit: total },
      { account: A.VENTAS, credit: net },
      { account: A.IVA_DF, credit: iva },
    ],
  })
  const e2 = addJournal(d, {
    date, module: 'Stock', doc: remito,
    concept: `Costo de la venta ${number}`,
    lines: [
      { account: A.CMV, debit: cost },
      { account: A.MERCADERIAS, credit: cost },
    ],
  })

  const cae = String(76000000000000 + ((d.journal.length * 48271 * 7919 + Math.round(total)) % 9999999999999))
  const sale = {
    id: `V${d.sales.length + 1}`, number, type, remito, date, time, customerId, lines: fullLines,
    net, iva, total, cost, condition, method: condition === 'ctacte' ? null : method,
    due: condition === 'ctacte' ? addDays(date, customer.terms) : date,
    paid: condition === 'ctacte' ? 0 : total,
    cae, caeDue: addDays(date, 10), user: user.name,
  }
  d.sales.push(sale)
  addAudit(d, { date, time, user, module: 'Ventas', doc: number, action: `Emitió ${number} por ${Math.round(total).toLocaleString('es-AR')} (${condition === 'ctacte' ? 'cuenta corriente' : 'contado'})` })

  return {
    sale, customer, stockChanges, entries: [e1, e2],
    balanceBefore, balanceAfter: condition === 'ctacte' ? customerBalance(d, customerId) : null,
  }
}

export function createReceipt(d, { date, time, customerId, amount, method, chequeDue, user }) {
  const customer = customerById(d, customerId)
  const number = `RC ${COMPANY.pointOfSale}-${pad(nextSeq(d, 'recibo'), 8)}`
  const balanceBefore = customerBalance(d, customerId)
  let left = round2(amount)
  const applied = []
  const open = openInvoices(d, customerId).sort((a, b) => (a.date < b.date ? -1 : 1))
  for (const inv of open) {
    if (left <= 0.5) break
    const due = round2(inv.total - inv.paid)
    const take = Math.min(due, left)
    const idx = d.sales.findIndex((s) => s.id === inv.id)
    replace(d.sales, idx, { paid: round2(inv.paid + take), paidDate: date })
    applied.push({ saleId: inv.id, number: inv.number, amount: round2(take) })
    left = round2(left - take)
  }
  const value = round2(amount - left)

  let account = method === 'efectivo' ? A.CAJA : A.BANCO
  let cheque = null
  if (method === 'cheque') {
    account = A.VALORES
    const n = nextSeq(d, 'cheque')
    const banks = ['Banco Nación', 'Banco Provincia', 'Banco Galicia', 'Banco Santander', 'Banco Credicoop', 'Banco Macro', 'BBVA']
    cheque = {
      id: `CH${n}`, number: pad(40000000 + n * 37, 8), bank: banks[n % banks.length],
      amount: value, customerId, received: date, due: chequeDue || date, status: 'En cartera', receipt: number,
    }
    d.cheques.push(cheque)
  }
  const entry = addJournal(d, {
    date, module: 'Tesorería', doc: number,
    concept: `${number} - Cobranza ${customer.name}${cheque ? ` (cheque ${cheque.bank} N.º ${cheque.number})` : ''}`,
    lines: [
      { account, debit: value },
      { account: A.DEUDORES, credit: value },
    ],
  })
  const receipt = { id: `RC${d.receipts.length + 1}`, number, date, time, customerId, amount: value, method, applied, user: user.name, chequeId: cheque?.id }
  d.receipts.push(receipt)
  addAudit(d, { date, time, user, module: 'Tesorería', doc: number, action: `Registró cobranza de ${customer.name} por ${Math.round(value).toLocaleString('es-AR')} (${method})` })
  return { receipt, entries: [entry], cheque, balanceBefore, balanceAfter: customerBalance(d, customerId) }
}

export function depositCheque(d, chequeId, { date, time, user }) {
  const idx = d.cheques.findIndex((c) => c.id === chequeId)
  const ch = d.cheques[idx]
  const entry = addJournal(d, {
    date, module: 'Tesorería', doc: `Depósito ch. ${ch.number}`,
    concept: `Depósito cheque ${ch.bank} N.º ${ch.number}`,
    lines: [
      { account: A.BANCO, debit: ch.amount },
      { account: A.VALORES, credit: ch.amount },
    ],
  })
  replace(d.cheques, idx, { status: 'Depositado', deposited: date })
  addAudit(d, { date, time, user, module: 'Tesorería', doc: `Cheque ${ch.number}`, action: `Depositó cheque ${ch.bank} N.º ${ch.number}` })
  return { entries: [entry] }
}

// ---------------------------------------------------------------- Proveedores

export function createPO(d, { date, time, supplierId, lines, user }) {
  const supplier = supplierById(d, supplierId)
  const number = `OC 0001-${pad(nextSeq(d, 'oc'), 8)}`
  const net = round2(lines.reduce((s, l) => s + l.qty * l.price, 0))
  const po = {
    id: `OC${d.pos.length + 1}`, number, date, time, supplierId, lines, net,
    status: 'Emitida', createdBy: user.name, reception: null, invoice: null, payment: null,
  }
  d.pos.push(po)
  addAudit(d, { date, time, user, module: 'Compras', doc: number, action: `Emitió ${number} a ${supplier.name}` })
  return { po }
}

export function receivePO(d, poId, { date, time, user, lines }) {
  const idx = d.pos.findIndex((p) => p.id === poId)
  const po = d.pos[idx]
  const recLines = lines || po.lines.map((l) => ({ itemId: l.itemId, qty: l.qty }))
  const number = `RP ${pad(1 + ((nextSeq(d, 'remprov') * 37) % 9), 4)}-${pad(10000 + d.seq.remprov * 13, 8)}`
  const stockChanges = []
  let value = 0
  for (const rl of recLines) {
    const ocLine = po.lines.find((l) => l.itemId === rl.itemId)
    if (!rl.qty) continue
    const r = moveStock(d, rl.itemId, rl.qty, { date, type: 'Compra', doc: po.number, unitCost: ocLine.price })
    value += rl.qty * ocLine.price
    stockChanges.push({ itemId: rl.itemId, name: r.item.name, unit: r.item.unit, qty: rl.qty, before: r.before, after: r.after, costBefore: r.costBefore, costAfter: r.costAfter })
  }
  value = round2(value)
  const entry = addJournal(d, {
    date, module: 'Stock', doc: number,
    concept: `Recepción ${po.number} - remito proveedor ${number}`,
    lines: [
      { account: A.MERCADERIAS, debit: value },
      { account: A.REC_PEND, credit: value },
    ],
  })
  const reception = { number, date, time, user: user.name, lines: recLines, value }
  replace(d.pos, idx, { status: po.invoice?.status === 'Retenida' ? po.status : 'Recibida', reception })
  addAudit(d, { date, time, user, module: 'Stock', doc: number, action: `Recibió mercadería de ${po.number} en depósito` })
  return { po: d.pos[idx], stockChanges, entries: [entry] }
}

export function threeWayMatch(po, invLines) {
  return po.lines.map((oc) => {
    const rec = po.reception?.lines.find((l) => l.itemId === oc.itemId)
    const inv = invLines.find((l) => l.itemId === oc.itemId) || { qty: 0, price: oc.price }
    const recQty = rec ? rec.qty : 0
    const qtyOk = Math.abs(inv.qty - recQty) < 0.001
    const priceOk = Math.abs(inv.price - oc.price) <= oc.price * 0.005
    let reason = 'Conciliado'
    if (!po.reception) reason = 'Sin recepción en depósito'
    else if (!qtyOk) reason = inv.qty > recQty ? 'Facturado mayor a lo recibido' : 'Facturado menor a lo recibido'
    else if (!priceOk) reason = 'Precio distinto al de la orden de compra'
    return { itemId: oc.itemId, ocQty: oc.qty, ocPrice: oc.price, recQty, invQty: inv.qty, invPrice: inv.price, ok: !!po.reception && qtyOk && priceOk, reason }
  })
}

export function registerInvoice(d, poId, { date, time, user, number, lines }) {
  const idx = d.pos.findIndex((p) => p.id === poId)
  const po = d.pos[idx]
  const supplier = supplierById(d, po.supplierId)
  const invLines = lines || (po.reception ? po.reception.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, price: po.lines.find((o) => o.itemId === l.itemId).price })) : po.lines)
  const match = threeWayMatch(po, invLines)
  const ok = match.every((m) => m.ok)
  const { net, iva, total } = saleTotals(invLines)
  const invNumber = number || `FC A ${pad(1 + (d.seq.oc % 7), 4)}-${pad(20000 + nextSeq(d, 'fcprov') * 7, 8)}`
  const invoice = {
    number: invNumber, date, time, user: user.name, lines: invLines, net, iva, total,
    due: addDays(date, supplier.terms), match, status: ok ? 'Conciliada' : 'Retenida',
  }
  const entries = []
  if (ok) {
    entries.push(addJournal(d, {
      date, module: 'Compras', doc: invNumber,
      concept: `${invNumber} - ${supplier.name} (${po.number})`,
      lines: [
        { account: A.REC_PEND, debit: net },
        { account: A.IVA_CF, debit: iva },
        { account: A.PROVEEDORES, credit: total },
      ],
    }))
  }
  replace(d.pos, idx, { invoice, status: ok ? 'Facturada' : 'Factura retenida' })
  addAudit(d, {
    date, time, user, module: 'Compras', doc: invNumber, level: ok ? 'info' : 'alerta',
    action: ok
      ? `Registró factura de ${supplier.name} conciliada contra ${po.number}`
      : `Control de tres vías: factura de ${supplier.name} retenida (${match.find((m) => !m.ok).reason.toLowerCase()})`,
  })
  return { po: d.pos[idx], invoice, entries, ok }
}

export function paySupplier(d, poId, { date, time, user }) {
  const idx = d.pos.findIndex((p) => p.id === poId)
  const po = d.pos[idx]
  const supplier = supplierById(d, po.supplierId)
  const number = `OP 0001-${pad(nextSeq(d, 'op'), 8)}`
  const amount = po.invoice.total
  const entry = addJournal(d, {
    date, module: 'Tesorería', doc: number,
    concept: `${number} - Pago a ${supplier.name} (${po.invoice.number})`,
    lines: [
      { account: A.PROVEEDORES, debit: amount },
      { account: A.BANCO, credit: amount },
    ],
  })
  const payment = { id: `OP${d.payments.length + 1}`, number, date, time, supplierId: po.supplierId, poId, amount, user: user.name }
  d.payments.push(payment)
  replace(d.pos, idx, { status: 'Pagada', payment })
  addAudit(d, { date, time, user, module: 'Tesorería', doc: number, action: `Emitió ${number} a ${supplier.name} por ${Math.round(amount).toLocaleString('es-AR')}` })
  return { po: d.pos[idx], payment, entries: [entry] }
}

export function supplierBalance(d, supplierId) {
  let b = 0
  for (const p of d.pos) if (p.supplierId === supplierId && p.status === 'Facturada') b += p.invoice.total
  return round2(b)
}

// ---------------------------------------------------------------- Consultas

export function reorderSuggestion(d, supplierId) {
  const onOrder = {}
  for (const p of d.pos) {
    if (p.status === 'Emitida' || (p.status === 'Factura retenida' && !p.reception)) {
      for (const l of p.lines) onOrder[l.itemId] = (onOrder[l.itemId] || 0) + l.qty
    }
  }
  return d.items
    .filter((i) => i.supplierId === supplierId)
    .map((i) => ({ item: i, projected: i.stock + (onOrder[i.id] || 0) }))
    .filter((x) => x.projected <= x.item.reorder)
    .map((x) => ({ itemId: x.item.id, qty: Math.max(1, Math.ceil(x.item.max - x.projected)), price: x.item.cost }))
}

export function salesByMonth(d) {
  const m = {}
  for (const s of d.sales) {
    const k = monthKey(s.date)
    m[k] ||= { net: 0, cost: 0, count: 0 }
    m[k].net += s.net
    m[k].cost += s.cost
    m[k].count += 1
  }
  return m
}

export function agingBuckets(d, today) {
  const b = { 'A vencer': 0, '1 a 30 días': 0, '31 a 60 días': 0, '61 a 90 días': 0, 'Más de 90 días': 0 }
  for (const s of d.sales) {
    if (s.condition !== 'ctacte') continue
    const open = s.total - s.paid
    if (open <= 0.5) continue
    const late = daysBetween(s.due, today)
    if (late <= 0) b['A vencer'] += open
    else if (late <= 30) b['1 a 30 días'] += open
    else if (late <= 60) b['31 a 60 días'] += open
    else if (late <= 90) b['61 a 90 días'] += open
    else b['Más de 90 días'] += open
  }
  return b
}

export { accName }
