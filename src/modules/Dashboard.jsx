import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Cell } from 'recharts'
import { useStore } from '../store.jsx'
import { Card, Kpi, Delta, Badge } from '../components/ui.jsx'
import { useChartColors, ChartTip, axisProps } from '../components/charts.jsx'
import { money, moneyShort, axisMoney, pct, dec1, monthLong, fdate } from '../lib/format.js'

export default function Dashboard({ metrics: m }) {
  const { setPage, db } = useStore()
  const c = useChartColors()
  const chartData = m.months.slice(-13).map((x) => ({
    ...x,
    label: x.key === m.curKey ? `${x.label} (parcial)` : x.label,
    budgetShown: x.key === m.curKey ? m.budgetToDate : x.budget,
  }))
  const compliance = m.budgetToDate ? m.cur.net / m.budgetToDate : 0
  const growth = m.prevSameDay ? m.cur.net / m.prevSameDay - 1 : 0

  const alerts = [
    m.retained.length && { tone: 'bad', title: `${m.retained.length} facturas de proveedores retenidas`, body: 'No superaron el control de tres vías (orden de compra, recepción y factura).', page: 'compras' },
    m.lowNoOrder.length && { tone: 'warn', title: m.lowNoOrder.length === 1 ? '1 artículo bajo punto de reposición sin pedido' : `${m.lowNoOrder.length} artículos bajo punto de reposición sin pedido`, body: m.lowNoOrder.slice(0, 3).map((i) => i.name).join(', ') + (m.lowNoOrder.length > 3 ? ' y otros.' : '.'), page: 'stock' },
    m.outOfStock.length && { tone: 'bad', title: m.outOfStock.length === 1 ? '1 artículo sin stock' : `${m.outOfStock.length} artículos sin stock`, body: m.outOfStock.map((i) => i.name).join(', ') + '.', page: 'stock' },
    m.overdue60 > 0 && { tone: 'warn', title: `${moneyShort(m.overdue60)} de deuda con más de 60 días de atraso`, body: `Representa el ${pct(m.morosidad)} de las cuentas a cobrar.`, page: 'clientes' },
    m.due15.length && { tone: 'info', title: `${m.due15.length} facturas de proveedores vencen en 15 días`, body: `Total a pagar: ${moneyShort(m.due15.reduce((s, p) => s + p.invoice.total, 0))}.`, page: 'proveedores' },
    m.chequesCartera.length && { tone: 'info', title: `${m.chequesCartera.length} cheques en cartera`, body: `Total: ${moneyShort(m.valores)}. Se depositan a su fecha de cobro.`, page: 'tesoreria' },
  ].filter(Boolean)

  const agingData = Object.entries(m.aging).map(([k, v]) => ({ k, v }))
  const agingColors = [c.series1, c.warn, c.series3, c.bad, c.bad]
  const recent = db.audit.slice(-7).reverse()

  return (
    <div className="page">
      <div className="grid g-4" data-tour="kpis">
        <Kpi
          label={`Ventas de ${monthLong(m.curKey).split(' ')[0]}`}
          value={moneyShort(m.cur.net)}
          info="Ventas netas de IVA facturadas en el mes en curso. Se comparan con el mes anterior hasta el mismo día."
          foot={<Delta value={growth} suffix="vs. mismo período del mes anterior" />}
        />
        <Kpi
          label="Cumplimiento del presupuesto"
          value={pct(compliance)}
          tone={compliance >= 1 ? 'good' : compliance >= 0.9 ? 'warn' : 'bad'}
          info="Ventas reales / presupuesto de ventas proporcional a los días transcurridos del mes."
          foot={<span>Presupuesto al día {m.dayOfMonth}: {moneyShort(m.budgetToDate)}</span>}
        />
        <Kpi
          label="Margen bruto del mes"
          value={pct(m.margin)}
          info="(Ventas netas - Costo de mercaderías vendidas) / Ventas netas. El costo se toma al precio promedio ponderado."
          foot={<span>Utilidad bruta: {moneyShort(m.cur.net - m.cur.cost)}</span>}
        />
        <Kpi
          label="Disponibilidades"
          value={moneyShort(m.disponibilidades)}
          info="Caja + Banco + Valores a depositar (cheques en cartera)."
          foot={<span>Banco {moneyShort(m.banco)} · Cheques {moneyShort(m.valores)}</span>}
        />
        <Kpi
          label="Cuentas a cobrar"
          value={moneyShort(m.deudores)}
          info="Saldo de Deudores por ventas: facturas en cuenta corriente pendientes de cobro."
          foot={<span><span className={m.overdueRate > 0.4 ? 'bad strong' : 'warn strong'}>{pct(m.overdueRate)}</span> vencido · {dec1(m.dso)} días de cobro</span>}
        />
        <Kpi
          label="Cuentas a pagar"
          value={moneyShort(m.proveedores)}
          info="Saldo de Proveedores: facturas conciliadas pendientes de pago."
          foot={<span>{dec1(m.dpo)} días de pago promedio</span>}
        />
        <Kpi
          label="Stock valorizado"
          value={moneyShort(m.stockValue)}
          info="Existencias por costo promedio ponderado. Rotación = Costo de ventas anual / Stock valorizado."
          foot={<span>Rotación {dec1(m.rotation)} veces al año · {dec1(m.dio)} días</span>}
        />
        <Kpi
          label="Ciclo de conversión de caja"
          value={`${Math.round(m.ccc)} días`}
          tone={m.ccc > 45 ? 'warn' : ''}
          info="Días de cobro + Días de inventario - Días de pago. Es el tiempo que la empresa financia su operación con fondos propios."
          foot={<span>{dec1(m.dso)} + {dec1(m.dio)} - {dec1(m.dpo)}</span>}
        />
      </div>

      <div className="grid g-2-1">
        <Card title="Ventas mensuales contra presupuesto" sub="Montos netos de IVA. El mes en curso se compara con el presupuesto proporcional." tour="chart-budget"
          right={<div className="legend"><span><i className="box" style={{ background: c.series1 }} />Real</span><span><i style={{ background: c.series2 }} />Presupuesto</span></div>}
        >
          <div style={{ height: 290 }}>
            <ResponsiveContainer>
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke={c.grid} />
                <XAxis dataKey="label" {...axisProps(c)} interval={0} tickFormatter={(v) => v.replace(' (parcial)', '*')} />
                <YAxis {...axisProps(c)} axisLine={false} tickFormatter={axisMoney} width={54} />
                <Tooltip content={<ChartTip />} cursor={{ fill: c.grid, opacity: 0.5 }} />
                <Bar dataKey="net" name="Real" fill={c.series1} radius={[4, 4, 0, 0]} />
                <Line dataKey="budgetShown" name="Presupuesto" stroke={c.series2} strokeWidth={2} dot={{ r: 3, fill: c.series2, strokeWidth: 0 }} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="muted small">* Mes en curso, hasta el día {m.dayOfMonth}.</div>
        </Card>

        <Card title="Alertas de gestión" sub="Situaciones que requieren atención" tour="alerts">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {alerts.map((a, i) => (
              <button key={i} className="callout" onClick={() => setPage(a.page)} style={{ textAlign: 'left', cursor: 'pointer', borderLeft: `3px solid var(--${a.tone})` }}>
                <div>
                  <div className="strong">{a.title}</div>
                  <div className="text-2 small">{a.body}</div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid g-3">
        <Card title="Ventas por rubro" sub={`Mes en curso, neto de IVA`}>
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={m.byRubro} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap="24%">
                <CartesianGrid horizontal={false} stroke={c.grid} />
                <XAxis type="number" {...axisProps(c)} tickFormatter={axisMoney} />
                <YAxis type="category" dataKey="rubro" {...axisProps(c)} width={150} axisLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: c.grid, opacity: 0.5 }} />
                <Bar dataKey="net" name="Ventas" fill={c.series1} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Antigüedad de cuentas a cobrar" sub="Saldo pendiente según días de atraso">
          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={agingData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid vertical={false} stroke={c.grid} />
                <XAxis dataKey="k" {...axisProps(c)} interval={0} tick={{ fill: c.text3, fontSize: c.fontSize - 1 }} />
                <YAxis {...axisProps(c)} axisLine={false} tickFormatter={axisMoney} width={54} />
                <Tooltip content={<ChartTip />} cursor={{ fill: c.grid, opacity: 0.5 }} />
                <Bar dataKey="v" name="Saldo" radius={[4, 4, 0, 0]}>
                  {agingData.map((_, i) => <Cell key={i} fill={agingColors[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Principales clientes" sub="Últimos 90 días, neto de IVA" flush>
          <table className="t">
            <thead>
              <tr><th>Cliente</th><th className="num">Ventas</th></tr>
            </thead>
            <tbody>
              {m.topCustomers.map((t) => (
                <tr key={t.customer.id} className="click" onClick={() => setPage('clientes')}>
                  <td>{t.customer.name}</td>
                  <td className="num">{moneyShort(t.net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Card title="Actividad reciente" sub="Últimas operaciones registradas en el sistema" flush right={<button className="btn sm" onClick={() => setPage('auditoria')}>Ver auditoría</button>}>
        <table className="t">
          <thead>
            <tr><th>Fecha</th><th>Hora</th><th>Usuario</th><th>Sector</th><th>Operación</th></tr>
          </thead>
          <tbody>
            {recent.map((a) => (
              <tr key={a.id}>
                <td className="nowrap">{fdate(a.date)}</td>
                <td className="num">{a.time}</td>
                <td className="nowrap">{a.user}</td>
                <td><Badge tone="neutral" plain>{a.role}</Badge></td>
                <td>{a.level === 'alerta' ? <span className="bad">{a.action}</span> : a.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="muted small">Total facturado en los últimos 12 meses: {money(m.yearNet)} neto de IVA · margen bruto {pct(m.yearMargin)}.</div>
    </div>
  )
}
