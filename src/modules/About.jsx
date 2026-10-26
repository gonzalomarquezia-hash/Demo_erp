import { Card, Badge } from '../components/ui.jsx'
import { FundacionLogo } from '../components/Logo.jsx'
import { COMPANY } from '../engine/catalog.js'
import { useStore } from '../store.jsx'
import { num } from '../lib/format.js'

const MODULES = ['Ventas', 'Compras', 'Stock', 'Clientes', 'Proveedores', 'Tesorería', 'Contabilidad', 'Control de gestión']

function IntegrationDiagram() {
  const cx = 360, cy = 150, rx = 270, ry = 108
  const pts = MODULES.map((m, i) => {
    const a = (Math.PI * 2 * i) / MODULES.length - Math.PI / 2
    return { m, x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }
  })
  return (
    <svg viewBox="0 0 720 300" style={{ width: '100%', height: 'auto', maxHeight: 320 }} role="img" aria-label="Módulos del ERP conectados a una base de datos única">
      {pts.map((p) => <line key={`l${p.m}`} x1={cx} y1={cy} x2={p.x} y2={p.y} style={{ stroke: 'var(--border-strong)' }} strokeWidth="1.5" />)}
      <rect x={cx - 92} y={cy - 30} width="184" height="60" rx="10" style={{ fill: 'var(--brand)' }} />
      <text x={cx} y={cy - 4} textAnchor="middle" style={{ fill: '#fff', fontWeight: 700, fontSize: 15 }}>Base de datos única</text>
      <text x={cx} y={cy + 16} textAnchor="middle" style={{ fill: '#fff', fontSize: 11.5, opacity: 0.9 }}>un solo registro por operación</text>
      {pts.map((p) => (
        <g key={p.m}>
          <rect x={p.x - 66} y={p.y - 17} width="132" height="34" rx="8" style={{ fill: 'var(--surface)', stroke: 'var(--border-strong)' }} strokeWidth="1.5" />
          <text x={p.x} y={p.y + 5} textAnchor="middle" style={{ fill: 'var(--text)', fontWeight: 600, fontSize: 13 }}>{p.m}</text>
        </g>
      ))}
    </svg>
  )
}

const COMPARE = [
  ['Módulos integrados sobre una base de datos única', 'Sí', 'Sí (simulada en el navegador)'],
  ['Circuitos de venta y compra con documentos encadenados', 'Sí', 'Sí'],
  ['Asientos contables automáticos por partida doble', 'Sí', 'Sí'],
  ['Stock valorizado por precio promedio ponderado', 'Sí (PPP, FIFO u otros)', 'Sí (PPP)'],
  ['Usuarios, roles y separación de funciones', 'Sí, con permisos configurables', 'Simulado: se cambia de usuario y se ve qué puede hacer cada sector'],
  ['Control de tres vías en compras', 'Sí', 'Sí'],
  ['Factura electrónica con CAE de ARCA', 'Sí, mediante servicio web', 'Simulado: CAE ficticio, sin validez fiscal'],
  ['Impuestos (IVA, percepciones, retenciones, Ingresos Brutos)', 'Completos', 'Simplificado: IVA 21 %'],
  ['Persistencia, varios usuarios simultáneos y respaldo', 'Servidor y base de datos', 'No: los datos viven en el navegador y se reinician'],
  ['Sueldos, CRM, producción, logística', 'Módulos adicionales', 'No incluidos'],
  ['Implementación', 'Meses: relevamiento, parametrización, migración y capacitación', 'Se abre con un enlace'],
]

export default function About() {
  const { db } = useStore()
  return (
    <div className="page">
      <div className="grid g-2-1">
        <Card title="Qué es un ERP" sub="Enterprise Resource Planning: sistema de planificación de recursos empresariales" tour="about-erp">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} className="text-2">
            <p>
              Un ERP reúne en un único sistema la información de todas las áreas de la empresa. Cada operación se registra una sola vez, en el lugar donde ocurre,
              y a partir de ese registro se actualizan automáticamente el stock, las cuentas corrientes, la tesorería y la contabilidad.
            </p>
            <p>
              Así desaparecen las planillas sueltas, las cargas duplicadas y los cierres de mes manuales, y la dirección cuenta con información confiable y oportuna para planificar y controlar.
            </p>
          </div>
          <IntegrationDiagram />
        </Card>
        <Card title="Empresa simulada" tour="about-company">
          <dl className="kv">
            <dt>Razón social</dt><dd>{COMPANY.name}</dd>
            <dt>Actividad</dt><dd>Corralón de materiales de construcción</dd>
            <dt>Condición IVA</dt><dd>{COMPANY.iva}</dd>
            <dt>Domicilio</dt><dd>{COMPANY.address}</dd>
            <dt>Empleados</dt><dd>{COMPANY.employees}</dd>
            <dt>Artículos</dt><dd>{db.items.length} en 12 rubros</dd>
            <dt>Clientes</dt><dd>{db.customers.length - 1} en cuenta corriente, más mostrador</dd>
            <dt>Proveedores</dt><dd>{db.suppliers.length}</dd>
            <dt>Comprobantes</dt><dd>{num(db.sales.length)} facturas, {num(db.pos.length)} órdenes de compra</dd>
            <dt>Asientos</dt><dd>{num(db.journal.length)}</dd>
          </dl>
          <p className="small muted" style={{ marginTop: 12 }}>Empresa, personas y datos son ficticios. Cualquier coincidencia con empresas reales es casual.</p>
        </Card>
      </div>

      <Card title="Comparación con ERP comerciales" sub="SAP Business One, Odoo, Tango Gestión, Microsoft Dynamics 365 Business Central" flush tour="compare">
        <table className="t">
          <thead><tr><th>Funcionalidad</th><th>ERP comercial</th><th>Esta demostración</th></tr></thead>
          <tbody>
            {COMPARE.map(([f, real, demo]) => (
              <tr key={f}>
                <td className="strong">{f}</td>
                <td className="text-2">{real}</td>
                <td>{demo.startsWith('Sí') ? <Badge tone="good" plain>{demo}</Badge> : demo.startsWith('No') ? <span className="muted">{demo}</span> : <span className="text-2">{demo}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ color: 'var(--brand)' }}><FundacionLogo size={110} withText /></div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="section-title">Trabajo académico</div>
            <h3 style={{ margin: '4px 0 6px' }}>Fundación de Altos Estudios en Ciencias Comerciales</h3>
            <p style={{ margin: '0 0 8px' }}><span className="muted">Alumno:</span> <strong>Gonzalo Marquez</strong></p>
            <p className="text-2">Sistema desarrollado como demostración del funcionamiento de un ERP: integración de procesos, control interno, sistema de información contable y control de gestión.</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
