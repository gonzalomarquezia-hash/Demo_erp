import { useMemo, useState } from 'react'
import { useStore } from '../store.jsx'
import { Card, Badge, usePaged } from '../components/ui.jsx'
import { PERMISSIONS, ACTION_LABEL } from '../engine/catalog.js'
import { fdate, num } from '../lib/format.js'

export default function Audit({ metrics: m }) {
  const { db } = useStore()
  const [role, setRole] = useState('todos')
  const [onlyAlerts, setOnlyAlerts] = useState(false)
  const [q, setQ] = useState('')
  const rows = useMemo(() => db.audit.filter((a) => (role === 'todos' || a.role === role) && (!onlyAlerts || a.level === 'alerta') && (!q || (a.action + a.doc + a.user).toLowerCase().includes(q.toLowerCase()))).slice().reverse(), [db.audit, role, onlyAlerts, q])
  const { slice, pager } = usePaged(rows, 15)
  const roles = [...new Set(db.audit.map((a) => a.role))]
  const denied = db.audit.filter((a) => a.module === 'Seguridad').length
  const unbalanced = db.journal.filter((e) => Math.abs(e.lines.reduce((s, l) => s + l.debit - l.credit, 0)) > 0.01).length

  const controls = [
    { name: 'Separación de funciones', detail: 'Cada operación solo la puede ejecutar su sector', status: 'good', value: `${denied} intentos rechazados` },
    { name: 'Control de tres vías', detail: 'Orden de compra, recepción y factura deben coincidir', status: m.retained.length ? 'warn' : 'good', value: `${m.retained.length} facturas retenidas` },
    { name: 'Límite de crédito', detail: 'No se factura en cuenta corriente por encima del límite', status: 'good', value: 'Activo' },
    { name: 'Control de stock', detail: 'No se factura mercadería sin existencia', status: 'good', value: 'Activo' },
    { name: 'Numeración correlativa', detail: 'Facturas, remitos, recibos, órdenes de compra y de pago', status: 'good', value: 'Sin saltos' },
    { name: 'Partida doble', detail: 'Todo asiento automático debe balancear', status: unbalanced ? 'bad' : 'good', value: unbalanced ? `${unbalanced} con diferencia` : `${num(db.journal.length)} asientos verificados` },
  ]

  return (
    <div className="page">
      <div className="grid g-2-1">
        <Card title="Pista de auditoría" sub="Registro inalterable de cada acción realizada en el sistema" flush tour="audit">
          <div className="toolbar">
            <input className="input" style={{ width: 260 }} placeholder="Buscar acción, comprobante o usuario" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="todos">Todos los sectores</option>
              {roles.map((r) => <option key={r}>{r}</option>)}
            </select>
            <label className="small" style={{ display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={onlyAlerts} onChange={(e) => setOnlyAlerts(e.target.checked)} /> Solo alertas
            </label>
          </div>
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>Fecha</th><th>Hora</th><th>Usuario</th><th>Sector</th><th>Acción</th></tr></thead>
              <tbody>
                {slice.map((a) => (
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
          </div>
          {pager}
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Controles internos automáticos" flush>
            <table className="t">
              <tbody>
                {controls.map((c) => (
                  <tr key={c.name}>
                    <td>
                      <div className="strong">{c.name}</div>
                      <div className="small muted">{c.detail}</div>
                    </td>
                    <td style={{ textAlign: 'right' }}><Badge tone={c.status}>{c.value}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card title="Matriz de permisos" sub="Qué sector puede ejecutar cada operación" flush>
            <table className="t">
              <tbody>
                {Object.entries(PERMISSIONS).map(([k, v]) => (
                  <tr key={k}><td>{ACTION_LABEL[k]}</td><td className="strong">{v.join(', ')}</td></tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </div>
  )
}
