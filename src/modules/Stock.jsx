import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import { useStore } from '../store.jsx'
import { Card, Kpi, Drawer, Badge, usePaged } from '../components/ui.jsx'
import { useChartColors, ChartTip, axisProps } from '../components/charts.jsx'
import { money, moneyShort, fdate, num, dec1, units, unitLabel, plural } from '../lib/format.js'

function itemStatus(i, onOrder) {
  if (i.stock <= 0) return ['bad', 'Sin stock']
  if (i.stock <= i.reorder) return onOrder ? ['info', 'Pedido en curso'] : ['warn', 'Reponer']
  return ['good', 'Normal']
}

export default function Stock({ metrics: m }) {
  const { db } = useStore()
  const [q, setQ] = useState('')
  const [rubro, setRubro] = useState('todos')
  const [onlyLow, setOnlyLow] = useState(false)
  const [sel, setSel] = useState(null)
  const rubros = [...new Set(db.items.map((i) => i.rubro))]
  const rows = useMemo(() => db.items.filter((i) => (rubro === 'todos' || i.rubro === rubro) && (!onlyLow || i.stock <= i.reorder) && (i.name + i.code).toLowerCase().includes(q.toLowerCase())), [db.items, rubro, onlyLow, q])
  const { slice, pager } = usePaged(rows, 18)

  return (
    <div className="page">
      <div className="grid g-5" data-tour="stock-kpis">
        <Kpi label="Artículos activos" value={num(db.items.length)} foot={<span>{plural(rubros.length, 'rubro', 'rubros')}</span>} />
        <Kpi label="Stock valorizado" value={moneyShort(m.stockValue)} info="Suma de existencias por su costo promedio ponderado." foot={<span>A costo promedio ponderado</span>} />
        <Kpi label="Rotación anual" value={`${dec1(m.rotation)} veces`} info="Costo de mercaderías vendidas de 12 meses / Stock valorizado actual." foot={<span>{Math.round(m.dio)} días de inventario</span>} />
        <Kpi label="Bajo punto de reposición" value={num(m.lowStock.length)} tone={m.lowNoOrder.length ? 'warn' : ''} foot={<span>{m.lowNoOrder.length} sin orden de compra</span>} />
        <Kpi label="Sin stock" value={num(m.outOfStock.length)} tone={m.outOfStock.length ? 'bad' : ''} foot={<span>Nivel de servicio del mes {dec1(m.fillCur * 100)} %</span>} />
      </div>

      <Card title="Inventario" sub="Hacé clic en un artículo para ver su ficha de stock (kardex)" flush tour="stock-table">
        <div className="toolbar">
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 9, top: 10, color: 'var(--text-3)' }} />
            <input className="input" style={{ paddingLeft: 30, width: 260 }} placeholder="Buscar artículo o código" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="select" value={rubro} onChange={(e) => setRubro(e.target.value)}>
            <option value="todos">Todos los rubros</option>
            {rubros.map((r) => <option key={r}>{r}</option>)}
          </select>
          <label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} /> Solo bajo punto de reposición
          </label>
        </div>
        <div className="table-wrap">
          <table className="t">
            <thead>
              <tr><th>Código</th><th>Artículo</th><th>Rubro</th><th className="num">Stock</th><th className="num">Punto de reposición</th><th className="num">Costo promedio</th><th className="num">Precio de lista</th><th className="num">Margen</th><th className="num">Valorizado</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {slice.map((i) => {
                const st = itemStatus(i, m.onOrder.has(i.id))
                return (
                  <tr key={i.id} className="click" onClick={() => setSel(i.id)}>
                    <td className="mono">{i.code}</td>
                    <td>{i.name}</td>
                    <td className="text-2 small">{i.rubro}</td>
                    <td className="num strong">{num(i.stock)} <span className="muted small">{unitLabel(i.unit, i.stock)}</span></td>
                    <td className="num">{num(i.reorder)}</td>
                    <td className="num">{money(i.cost)}</td>
                    <td className="num">{money(i.price)}</td>
                    <td className="num">{dec1((1 - i.cost / i.price) * 100)} %</td>
                    <td className="num">{money(i.stock * i.cost)}</td>
                    <td><Badge tone={st[0]}>{st[1]}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {pager}
      </Card>
      {sel && <Kardex itemId={sel} onClose={() => setSel(null)} />}
    </div>
  )
}

function Kardex({ itemId, onClose }) {
  const { db } = useStore()
  const c = useChartColors()
  const item = db.items.find((i) => i.id === itemId)
  const supplier = db.suppliers.find((s) => s.id === item.supplierId)
  const moves = db.stockMoves.filter((mv) => mv.itemId === itemId)
  // Saldo al cierre de cada día para el gráfico
  const byDay = {}
  for (const mv of moves) byDay[mv.date] = mv.balance
  const series = Object.entries(byDay).map(([date, balance]) => ({ date, balance })).slice(-150)
  const last = moves.slice(-40).reverse()

  return (
    <Drawer tour="kardex" title={item.name} sub={`${item.code} · ${item.rubro} · Proveedor habitual: ${supplier.name}`} onClose={onClose}>
      <div className="grid g-3">
        <Kpi label="Stock actual" value={units(item.stock, item.unit)} foot={<span>Máximo {num(item.max)}</span>} />
        <Kpi label="Punto de reposición" value={num(item.reorder)} info="Demanda diaria promedio x (días de entrega del proveedor + días de seguridad)." foot={<span>Entrega en {supplier.lead} días</span>} />
        <Kpi label="Costo promedio ponderado" value={money(item.cost)} foot={<span>Precio de lista {money(item.price)}</span>} />
      </div>
      <Card title="Evolución del stock" sub="Saldo al cierre de cada día con movimientos" tour="kardex-chart">
        <div style={{ height: 200 }}>
          <ResponsiveContainer>
            <AreaChart data={series} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={c.grid} />
              <XAxis dataKey="date" {...axisProps(c)} tickFormatter={(v) => fdate(v).slice(0, 5)} minTickGap={40} />
              <YAxis {...axisProps(c)} axisLine={false} width={50} />
              <Tooltip content={<ChartTip format={(v) => units(v, item.unit)} labelFormat={fdate} />} />
              <ReferenceLine y={item.reorder} stroke={c.warn} strokeDasharray="4 4" label={{ value: 'Punto de reposición', fill: c.text3, fontSize: 11, position: 'insideTopRight' }} />
              <Area type="stepAfter" dataKey="balance" name="Stock" stroke={c.series1} fill={c.series1} fillOpacity={0.12} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Ficha de stock (kardex)" sub="Últimos 40 movimientos" flush tour="kardex-table">
        <table className="t">
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Comprobante</th><th className="num">Entrada</th><th className="num">Salida</th><th className="num">Saldo</th><th className="num">Costo unitario</th></tr></thead>
          <tbody>
            {last.map((mv) => (
              <tr key={mv.id}>
                <td className="nowrap">{fdate(mv.date)}</td>
                <td>{mv.type}</td>
                <td className="mono small">{mv.doc}</td>
                <td className="num good">{mv.qty > 0 ? num(mv.qty) : ''}</td>
                <td className="num bad">{mv.qty < 0 ? num(-mv.qty) : ''}</td>
                <td className="num strong">{num(mv.balance)}</td>
                <td className="num">{money(mv.unitCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </Drawer>
  )
}
