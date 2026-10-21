// Indicadores de gestión calculados a partir de los movimientos registrados.
import { A } from './accounts.js'
import { addDays, monthKey, monthLabel, daysBetween } from '../lib/format.js'
import { agingBuckets } from './engine.js'

const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0)

export function computeMetrics(db) {
  const today = db.today
  const curKey = monthKey(today)
  const bal = (code) => db.bal[code] || 0

  // Serie mensual de ventas netas, costo y presupuesto
  const byMonth = {}
  for (const s of db.sales) {
    const k = monthKey(s.date)
    const m = (byMonth[k] ||= { key: k, net: 0, cost: 0, count: 0 })
    m.net += s.net
    m.cost += s.cost
    m.count += 1
  }
  const months = Object.keys(byMonth).sort().map((k) => ({
    ...byMonth[k],
    label: monthLabel(k),
    budget: db.budget[k] || 0,
    margin: byMonth[k].net ? 1 - byMonth[k].cost / byMonth[k].net : 0,
    gross: byMonth[k].net - byMonth[k].cost,
  }))
  const cur = byMonth[curKey] || { net: 0, cost: 0, count: 0 }
  const prevKey = months.length > 1 ? months[months.length - 2].key : curKey
  const prev = byMonth[prevKey] || { net: 0, cost: 0, count: 0 }
  const dayOfMonth = Number(today.slice(8, 10))
  const daysInMonth = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0).getDate()
  const budgetMonth = db.budget[curKey] || 0
  const budgetToDate = (budgetMonth * dayOfMonth) / daysInMonth
  // Ventas del mes anterior hasta el mismo día, para comparar períodos equivalentes
  const prevSameDay = sum(db.sales.filter((s) => monthKey(s.date) === prevKey && Number(s.date.slice(8, 10)) <= dayOfMonth), (s) => s.net)

  // Ventanas móviles de 90 días
  const from90 = addDays(today, -90)
  const last90 = db.sales.filter((s) => s.date > from90)
  const sales90Gross = sum(last90, (s) => s.total)
  const cmv90 = sum(last90, (s) => s.cost)
  const purchases90 = sum(db.pos.filter((p) => p.invoice?.status === 'Conciliada' && p.invoice.date > from90), (p) => p.invoice.total)

  const deudores = bal(A.DEUDORES)
  const proveedores = -bal(A.PROVEEDORES)
  const stockValue = sum(db.items, (i) => i.stock * i.cost)
  const dso = sales90Gross ? deudores / (sales90Gross / 90) : 0
  const dpo = purchases90 ? proveedores / (purchases90 / 90) : 0
  const dio = cmv90 ? stockValue / (cmv90 / 90) : 0

  const yearSales = db.sales.filter((s) => s.date > addDays(today, -365))
  const yearNet = sum(yearSales, (s) => s.net)
  const yearCost = sum(yearSales, (s) => s.cost)
  const rotation = stockValue ? yearCost / stockValue : 0

  const aging = agingBuckets(db, today)
  const overdue60 = aging['61 a 90 días'] + aging['Más de 90 días']
  const overdue = aging['1 a 30 días'] + aging['31 a 60 días'] + overdue60

  // Stock bajo punto de reposición, distinguiendo si ya hay una orden de compra en curso
  const onOrder = new Set()
  for (const p of db.pos) if (p.status === 'Emitida' || (p.status === 'Factura retenida' && !p.reception)) for (const l of p.lines) onOrder.add(l.itemId)
  const lowStock = db.items.filter((i) => i.stock <= i.reorder)
  const lowNoOrder = lowStock.filter((i) => !onOrder.has(i.id))
  const outOfStock = db.items.filter((i) => i.stock <= 0)

  // Nivel de servicio: lo entregado sobre lo pedido por los clientes
  const fillCur = db.fill[curKey] || { req: 1, del: 1 }
  const fillYear = Object.values(db.fill).reduce((a, f) => ({ req: a.req + f.req, del: a.del + f.del }), { req: 0, del: 0 })

  // Recompra: clientes de cuenta corriente que compraron en los últimos 60 días y también en los 60 previos
  const a60 = addDays(today, -60)
  const a120 = addDays(today, -120)
  const recent = new Set(db.sales.filter((s) => s.customerId !== 'C000' && s.date > a60).map((s) => s.customerId))
  const before = new Set(db.sales.filter((s) => s.customerId !== 'C000' && s.date > a120 && s.date <= a60).map((s) => s.customerId))
  const repeat = [...before].filter((c) => recent.has(c)).length
  const repeatRate = before.size ? repeat / before.size : 0

  // Control de tres vías sobre facturas de proveedores de los últimos 90 días
  const inv90 = db.pos.filter((p) => p.invoice && p.invoice.date > from90)
  const matched = inv90.filter((p) => p.invoice.status === 'Conciliada').length
  const retained = db.pos.filter((p) => p.status === 'Factura retenida')

  // Ventas por rubro del mes en curso y top de clientes de 90 días
  const rubros = {}
  for (const s of db.sales) {
    if (monthKey(s.date) !== curKey) continue
    for (const l of s.lines) {
      const it = db.items.find((i) => i.id === l.itemId)
      rubros[it.rubro] = (rubros[it.rubro] || 0) + l.qty * l.price
    }
  }
  const byRubro = Object.entries(rubros).map(([rubro, net]) => ({ rubro, net })).sort((a, b) => b.net - a.net)
  const custTotals = {}
  for (const s of last90) if (s.customerId !== 'C000') custTotals[s.customerId] = (custTotals[s.customerId] || 0) + s.net
  const topCustomers = Object.entries(custTotals)
    .map(([id, net]) => ({ customer: db.customers.find((c) => c.id === id), net }))
    .sort((a, b) => b.net - a.net)
    .slice(0, 6)

  const disponibilidades = bal(A.CAJA) + bal(A.BANCO) + bal(A.VALORES)
  const chequesCartera = db.cheques.filter((c) => c.status === 'En cartera')

  // Vencimientos de proveedores próximos 15 días
  const due15 = db.pos.filter((p) => p.status === 'Facturada' && daysBetween(today, p.invoice.due) <= 15)

  return {
    today, curKey, months, cur, prev, prevSameDay, budgetMonth, budgetToDate, dayOfMonth, daysInMonth,
    margin: cur.net ? 1 - cur.cost / cur.net : 0,
    yearNet, yearCost, yearMargin: yearNet ? 1 - yearCost / yearNet : 0,
    deudores, proveedores, stockValue, dso, dpo, dio, ccc: dso + dio - dpo, rotation,
    aging, overdue, overdue60, morosidad: deudores ? overdue60 / deudores : 0, overdueRate: deudores ? overdue / deudores : 0,
    lowStock, lowNoOrder, outOfStock, onOrder,
    fillCur: fillCur.req ? fillCur.del / fillCur.req : 1, fillYear: fillYear.req ? fillYear.del / fillYear.req : 1,
    repeatRate, matchRate: inv90.length ? matched / inv90.length : 1, retained,
    byRubro, topCustomers, disponibilidades, chequesCartera, due15,
    caja: bal(A.CAJA), banco: bal(A.BANCO), valores: bal(A.VALORES),
    avgTicket: cur.count ? cur.net / cur.count : 0,
  }
}
