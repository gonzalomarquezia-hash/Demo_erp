// Simula un año de operaciones del corralón usando el mismo motor que la demo en vivo,
// así todos los saldos (stock, cuentas corrientes, contabilidad) cierran entre sí.

import { createRng } from '../lib/rng.js'
import { addDays, monthKey, weekday, pad } from '../lib/format.js'
import { A } from './accounts.js'
import { buildItems, buildCustomers, SUPPLIERS, USERS, COMPANY } from './catalog.js'
import {
  addJournal, createSale, createReceipt, depositCheque, createPO, receivePO, registerInvoice, paySupplier,
  customerBalance, saleTotals,
} from './engine.js'

const SEASON = [0.82, 0.86, 1.04, 1.0, 0.95, 0.84, 0.8, 0.9, 1.04, 1.12, 1.15, 1.0]
const MONTHLY_INFLATION = 0.018
const BASE_SALES_PER_DAY = 13
const user = (role) => USERS.find((u) => u.role === role)

export function buildInitialState(today) {
  const rng = createRng(20261021)
  // El ejercicio simulado arranca el primer día del mismo mes del año anterior
  const start = `${Number(today.slice(0, 4)) - 1}${today.slice(4, 8)}01`
  const items = buildItems()
  const customers = buildCustomers(rng).map((c) => ({ ...c, delay: c.delay < 60 ? Math.round(c.delay * 0.4) : c.delay }))
  const suppliers = SUPPLIERS.map((s) => ({ ...s }))

  // Costos y precios de hace un año (antes de la inflación del período)
  const baseCost = Object.fromEntries(items.map((i) => [i.id, i.cost]))
  const markup = Object.fromEntries(items.map((i) => [i.id, i.price / i.cost]))
  const monthsFromStart = (date) => (new Date(`${date}T12:00:00Z`) - new Date(`${start}T12:00:00Z`)) / (30.44 * 86400000)
  const costAt = (id, date) => baseCost[id] / Math.pow(1 + MONTHLY_INFLATION, 12 - monthsFromStart(date))

  // Demanda diaria esperada por artículo, para definir punto de reposición y stock máximo
  const totalW = items.reduce((s, i) => s + i.weight, 0)
  for (const i of items) {
    const lead = suppliers.find((s) => s.id === i.supplierId).lead
    const daily = BASE_SALES_PER_DAY * 1.5 * 2.4 * (i.weight / totalW) * i.typicalQty
    i.reorder = Math.max(2, Math.ceil(daily * (lead + 8)))
    i.max = Math.max(5, Math.ceil(daily * (lead + 28)))
    i.cost = Math.round(costAt(i.id, start))
    i.price = Math.round((i.cost * markup[i.id]) / 10) * 10
    i.stock = Math.ceil(i.max * 0.8)
  }

  const d = {
    today, start, company: COMPANY,
    items, customers, suppliers,
    sales: [], receipts: [], cheques: [], pos: [], payments: [], stockMoves: [], journal: [], audit: [],
    seq: {}, bal: {}, fill: {}, budget: {}, live: [],
  }

  // Asiento de apertura
  const stockValue = items.reduce((s, i) => s + i.stock * i.cost, 0)
  const opening = { [A.CAJA]: 2500000, [A.BANCO]: 46000000, [A.MERCADERIAS]: stockValue, [A.RODADOS]: 85000000, [A.INSTALACIONES]: 42000000 }
  const capital = Object.values(opening).reduce((s, v) => s + v, 0)
  addJournal(d, {
    date: start, module: 'Contabilidad', doc: 'Apertura', concept: 'Asiento de apertura del ejercicio',
    lines: [...Object.entries(opening).map(([account, debit]) => ({ account, debit })), { account: A.CAPITAL, credit: capital }],
  })
  for (const i of items) {
    d.stockMoves.push({ id: `SM${d.stockMoves.length + 1}`, date: start, itemId: i.id, type: 'Inventario inicial', doc: 'Apertura', qty: i.stock, balance: i.stock, unitCost: i.cost })
  }

  const payPlan = {} // fecha -> [{customerId, saleId}]
  const poPlan = {} // fecha -> [{poId, step}]
  const plan = (map, date, x) => (map[date] ||= []).push(x)
  const time = () => `${pad(rng.int(8, 17), 2)}:${pad(rng.int(0, 59), 2)}`
  const creditCustomers = customers.filter((c) => c.id !== 'C000')
  const critical = new Set(['HIE-008', 'CEM-050', 'TAN-1000', 'PEG-030'])
  // Clientes que dejan de comprar en los últimos meses (morosos o captados por la competencia)
  const churned = new Set(['C015', 'C022', 'C027', 'C031'])
  const totalDays = Math.round((new Date(`${today}T12:00:00Z`) - new Date(`${start}T12:00:00Z`)) / 86400000)

  for (let day = 0; day <= totalDays; day++) {
    const date = addDays(start, day)
    const wd = weekday(date)
    const isToday = date === today
    const mk = monthKey(date)
    const month = Number(date.slice(5, 7)) - 1

    // 1) Lista de precios: se actualiza el primer día hábil de cada mes
    if (date.slice(8, 10) === '01' || day === 0) {
      for (let k = 0; k < d.items.length; k++) {
        const it = d.items[k]
        d.items[k] = { ...it, price: Math.round((costAt(it.id, date) * markup[it.id]) / 10) * 10 }
      }
    }

    // 2) Ventas del día
    if (wd !== 0) {
      const trend = 1 + 0.22 * (day / totalDays)
      const base = BASE_SALES_PER_DAY * SEASON[month] * trend * (wd === 6 ? 0.55 : 1)
      let n = Math.max(2, Math.round(rng.normal(base, base * 0.18)))
      if (isToday) n = Math.round(n * 0.55)
      for (let k = 0; k < n; k++) {
        const mostrador = rng.chance(0.48)
        const customer = mostrador ? customers[0] : rng.weighted(creditCustomers, (c) => (totalDays - day < 80 && churned.has(c.id) ? 0 : c.freq))
        const big = !mostrador && customer.iva !== 'Mono'
        const nLines = mostrador ? rng.int(1, 2) : rng.int(2, big ? 5 : 3)
        const lines = []
        const used = new Set()
        for (let j = 0; j < nLines; j++) {
          const it = rng.weighted(d.items, (i) => (used.has(i.id) ? 0 : i.weight))
          used.add(it.id)
          const factor = mostrador ? 0.45 : big ? 1.5 : 0.9
          const wanted = Math.max(1, Math.round(it.typicalQty * factor * (0.35 + rng.next() * 1.3)))
          const qty = Math.min(wanted, Math.floor(it.stock))
          const f = (d.fill[mk] ||= { req: 0, del: 0 })
          f.req += wanted * it.price
          f.del += qty * it.price
          if (qty > 0) lines.push({ itemId: it.id, qty, price: it.price })
        }
        if (!lines.length) continue
        let condition = mostrador || rng.chance(0.12) ? 'contado' : 'ctacte'
        if (condition === 'ctacte') {
          const { total } = saleTotals(lines)
          if (customerBalance(d, customer.id) + total > customer.limit) condition = 'contado'
        }
        const method = rng.chance(0.55) ? 'efectivo' : 'transferencia'
        const r = createSale(d, { date, time: time(), customerId: customer.id, lines, condition, method, user: user('Ventas') })
        if (condition === 'ctacte') {
          const delay = Math.max(-5, Math.round(rng.normal(customer.delay, customer.delay * 0.35 + 3)))
          plan(payPlan, addDays(date, customer.terms + delay), { customerId: customer.id, saleId: r.sale.id })
        }
      }
    }

    // 3) Cobranzas planificadas (agrupadas por cliente en un recibo)
    if (!isToday && payPlan[date] && wd !== 0) {
      const byCustomer = {}
      for (const p of payPlan[date]) {
        const s = d.sales.find((x) => x.id === p.saleId)
        const open = s.total - s.paid
        if (open > 0.5) byCustomer[p.customerId] = (byCustomer[p.customerId] || 0) + open
      }
      for (const [customerId, amount] of Object.entries(byCustomer)) {
        const r = rng.next()
        const method = r < 0.4 ? 'cheque' : r < 0.94 ? 'transferencia' : 'efectivo'
        createReceipt(d, { date, time: time(), customerId, amount, method, chequeDue: addDays(date, rng.int(0, 45)), user: user('Tesorería') })
      }
    } else if (payPlan[date]) {
      // Lo que vence hoy o en domingo pasa al día siguiente
      for (const p of payPlan[date]) plan(payPlan, addDays(date, 1), p)
    }

    // 4) Depósito de cheques que vencen
    if (wd !== 0 && wd !== 6 && !isToday) {
      for (const ch of d.cheques) {
        if (ch.status === 'En cartera' && ch.due <= date) depositCheque(d, ch.id, { date, time: time(), user: user('Tesorería') })
      }
    }

    // 5) Circuito de compras planificado: recepción, factura del proveedor y pago
    if (poPlan[date] && !isToday && wd !== 0) {
      for (const p of poPlan[date]) {
        const po = d.pos.find((x) => x.id === p.poId)
        if (p.step === 'receive') {
          receivePO(d, po.id, { date, time: time(), user: user('Depósito') })
          plan(poPlan, addDays(date, rng.int(0, 2)), { poId: po.id, step: 'invoice' })
        } else if (p.step === 'invoice') {
          const r = registerInvoice(d, po.id, { date, time: time(), user: user('Contaduría') })
          if (r.ok) plan(poPlan, r.invoice.due, { poId: po.id, step: 'pay' })
        } else if (p.step === 'pay') {
          paySupplier(d, po.id, { date, time: time(), user: user('Tesorería') })
        }
      }
    } else if (poPlan[date]) {
      for (const p of poPlan[date]) plan(poPlan, addDays(date, 1), p)
    }

    // 6) Reposición: cada proveedor tiene dos días fijos de pedido por semana
    if (wd >= 1 && wd <= 5 && !isToday) {
      d.suppliers.forEach((s, idx) => {
        if (idx % 5 !== wd - 1 && (idx + 2) % 5 !== wd - 1) return
        const onOrder = {}
        for (const po of d.pos) if (po.supplierId === s.id && po.status === 'Emitida') for (const l of po.lines) onOrder[l.itemId] = (onOrder[l.itemId] || 0) + l.qty
        const late = totalDays - day < 22
        const lines = d.items
          .filter((i) => i.supplierId === s.id && !(late && critical.has(i.id)))
          .filter((i) => i.stock + (onOrder[i.id] || 0) <= i.reorder)
          .map((i) => ({
            itemId: i.id,
            qty: Math.ceil(i.max - i.stock - (onOrder[i.id] || 0)),
            price: Math.round(costAt(i.id, date) * (0.985 + rng.next() * 0.03)),
          }))
          .filter((l) => l.qty > 0)
        if (!lines.length) return
        const { po } = createPO(d, { date, time: time(), supplierId: s.id, lines, user: user('Compras') })
        plan(poPlan, addDays(date, s.lead + rng.int(0, 2)), { poId: po.id, step: 'receive' })
      })
    }

    // 7) La recaudación en efectivo se deposita al cierre del día (queda un fondo fijo)
    if (wd !== 0 && !isToday && (d.bal[A.CAJA] || 0) > 3000000) {
      const amount = Math.round(d.bal[A.CAJA] - 2500000)
      addJournal(d, { date, module: 'Tesorería', doc: 'Boleta de depósito', concept: 'Depósito de la recaudación del día', lines: [{ account: A.BANCO, debit: amount }, { account: A.CAJA, credit: amount }] })
    }

    // 8) Cierre de mes: gastos fijos y liquidación de IVA
    const tomorrow = addDays(date, 1)
    if (tomorrow.slice(8, 10) === '01' && !isToday) {
      const infl = Math.pow(1 + MONTHLY_INFLATION, monthsFromStart(date))
      const exp = [
        [A.SUELDOS, 24800000 * infl, 'Sueldos y cargas sociales'],
        [A.SERVICIOS, 4300000 * infl, 'Alquiler de playa de acopio y servicios'],
        [A.FLETES, 3900000 * infl, 'Combustible y mantenimiento de camiones'],
        [A.GASTOS_BANC, 650000 * infl, 'Comisiones y gastos bancarios'],
      ]
      for (const [account, amount, concept] of exp) {
        addJournal(d, { date, module: 'Tesorería', doc: 'Débito bancario', concept: `${concept} - ${mk}`, lines: [{ account, debit: amount }, { account: A.BANCO, credit: amount }] })
      }
      const df = d.bal[A.IVA_DF] ? -d.bal[A.IVA_DF] : 0
      const cf = d.bal[A.IVA_CF] || 0
      const lines = [{ account: A.IVA_DF, debit: df }, { account: A.IVA_CF, credit: Math.min(cf, df) }]
      if (df > cf) lines.push({ account: A.BANCO, credit: df - cf })
      addJournal(d, { date, module: 'Contabilidad', doc: 'DDJJ IVA', concept: `Liquidación de IVA ${mk}`, lines })
    }
  }

  // Anomalías para mostrar los controles internos en acción
  const now = today
  const iron = d.items.find((i) => i.id === 'HIE-008')
  const a = createPO(d, { date: addDays(now, -6), time: '10:12', supplierId: 'P04', lines: [{ itemId: 'HIE-008', qty: Math.ceil(iron.max), price: Math.round(costAt('HIE-008', now)) }], user: user('Compras') })
  registerInvoice(d, a.po.id, { date: addDays(now, -2), time: '11:40', user: user('Contaduría') })

  const tiles = d.items.find((i) => i.id === 'POR-6060')
  const b = createPO(d, { date: addDays(now, -9), time: '09:05', supplierId: 'P07', lines: [{ itemId: 'POR-6060', qty: Math.ceil(tiles.max * 0.6), price: Math.round(costAt('POR-6060', now)) }], user: user('Compras') })
  receivePO(d, b.po.id, { date: addDays(now, -4), time: '15:22', user: user('Depósito') })
  registerInvoice(d, b.po.id, {
    date: addDays(now, -3), time: '12:18', user: user('Contaduría'),
    lines: b.po.lines.map((l) => ({ itemId: l.itemId, qty: l.qty, price: Math.round(l.price * 1.07) })),
  })

  // Presupuesto anual de ventas (neto de IVA) cargado a principio de ejercicio
  const avgTicket = d.sales.slice(0, 400).reduce((s, x) => s + x.net, 0) / 400
  for (let m = 0; m < 15; m++) {
    const date = addDays(start, Math.round(m * 30.44) + 2)
    const k = monthKey(date)
    if (d.budget[k]) continue
    const month = Number(k.slice(5, 7)) - 1
    const days = 25
    const trend = 1 + 0.16 * (m / 12)
    const noise = 0.95 + ((m * 37) % 11) / 100
    d.budget[k] = Math.round(BASE_SALES_PER_DAY * SEASON[month] * trend * days * avgTicket * Math.pow(1 + MONTHLY_INFLATION, m) * noise / 1000) * 1000
  }

  d.seedCounts = { journal: d.journal.length, audit: d.audit.length, sales: d.sales.length }
  return d
}
