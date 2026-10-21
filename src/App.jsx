import { useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard, Target, ShoppingCart, Users, Truck, Building2, Boxes, Landmark, BookOpen, Calculator, ShieldCheck, Info as InfoIcon, PlayCircle,
} from 'lucide-react'
import { useStore } from './store.jsx'
import { USERS, ACTION_LABEL } from './engine/catalog.js'
import { computeMetrics } from './engine/metrics.js'
import { fdate } from './lib/format.js'
import { FundacionLogo, CompanyMark } from './components/Logo.jsx'
import { Modal, Seg, Callout } from './components/ui.jsx'
import { Tour } from './components/Tour.jsx'
import Dashboard from './modules/Dashboard.jsx'
import Scorecard from './modules/Scorecard.jsx'
import Sales from './modules/Sales.jsx'
import Customers from './modules/Customers.jsx'
import Purchases from './modules/Purchases.jsx'
import Suppliers from './modules/Suppliers.jsx'
import Stock from './modules/Stock.jsx'
import Treasury from './modules/Treasury.jsx'
import Accounting from './modules/Accounting.jsx'
import Budget from './modules/Budget.jsx'
import Audit from './modules/Audit.jsx'
import About from './modules/About.jsx'

const NAV = [
  { group: 'Gestión', items: [
    { id: 'tablero', label: 'Tablero de control', icon: LayoutDashboard, C: Dashboard },
    { id: 'bsc', label: 'Mando integral', icon: Target, C: Scorecard },
  ] },
  { group: 'Operaciones', items: [
    { id: 'ventas', label: 'Ventas', icon: ShoppingCart, C: Sales },
    { id: 'compras', label: 'Compras', icon: Truck, C: Purchases, badge: (m) => m.retained.length },
    { id: 'stock', label: 'Stock', icon: Boxes, C: Stock, badge: (m) => m.lowNoOrder.length },
  ] },
  { group: 'Finanzas', items: [
    { id: 'clientes', label: 'Clientes y cobranzas', icon: Users, C: Customers },
    { id: 'proveedores', label: 'Proveedores y pagos', icon: Building2, C: Suppliers },
    { id: 'tesoreria', label: 'Tesorería', icon: Landmark, C: Treasury },
  ] },
  { group: 'Contabilidad y planeamiento', items: [
    { id: 'contabilidad', label: 'Contabilidad', icon: BookOpen, C: Accounting },
    { id: 'presupuesto', label: 'Presupuesto', icon: Calculator, C: Budget },
  ] },
  { group: 'Control', items: [
    { id: 'auditoria', label: 'Auditoría', icon: ShieldCheck, C: Audit },
    { id: 'acerca', label: 'Acerca del sistema', icon: InfoIcon, C: About },
  ] },
]
const ALL = NAV.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })))

export default function App() {
  const { db, page, setPage, theme, setTheme, user, setUserId, toasts, guard, setGuard, switchToRole, reset, toast } = useStore()
  const [tour, setTour] = useState(false)
  const [welcome, setWelcome] = useState(() => {
    try {
      return !sessionStorage.getItem('erp-welcome')
    } catch {
      return true
    }
  })
  const [confirmReset, setConfirmReset] = useState(false)
  const metrics = useMemo(() => computeMetrics(db), [db])
  const current = ALL.find((i) => i.id === page) || ALL[0]
  const Page = current.C

  useEffect(() => {
    document.querySelector('.content')?.scrollTo({ top: 0 })
  }, [page])

  const closeWelcome = (startTour) => {
    try {
      sessionStorage.setItem('erp-welcome', '1')
    } catch {
      /* sin almacenamiento disponible */
    }
    setWelcome(false)
    if (startTour) setTour(true)
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <CompanyMark />
          <div>
            <div className="brand-name">Materiales del Plata</div>
            <div className="brand-sub">ERP · Corralón de materiales</div>
          </div>
        </div>
        <nav className="nav" data-tour="nav">
          {NAV.map((g) => (
            <div className="nav-group" key={g.group}>
              <div className="nav-title">{g.group}</div>
              {g.items.map((it) => {
                const Icon = it.icon
                const b = it.badge?.(metrics)
                return (
                  <button key={it.id} className={`nav-item ${page === it.id ? 'active' : ''}`} onClick={() => setPage(it.id)}>
                    <Icon size={17} strokeWidth={1.8} />
                    {it.label}
                    {b > 0 && <span className="nav-badge">{b}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <FundacionLogo size={38} color="var(--side-text)" />
          <div className="inst">Fundación de Altos Estudios en Ciencias Comerciales</div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            <div className="crumb">{current.group}</div>
            <h1>{current.label}</h1>
          </div>
          <div className="crumb nowrap" title="Fecha del sistema">Fecha del sistema: {fdate(db.today)}</div>
          <div className="user-chip" data-tour="user">
            <div className="avatar">{user.initials}</div>
            <div>
              <select value={user.id} onChange={(e) => setUserId(e.target.value)} aria-label="Usuario actual">
                {USERS.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <div className="role">Sector {user.role}</div>
            </div>
          </div>
          <Seg
            tour="theme"
            value={theme}
            onChange={setTheme}
            options={[
              { id: 'light', label: 'Claro' },
              { id: 'dark', label: 'Oscuro' },
              { id: 'proyector', label: 'Proyector', title: 'Alto contraste y letra grande para proyectar' },
            ]}
          />
          <button className="btn primary" onClick={() => setTour(true)}>
            <PlayCircle size={16} /> Recorrido guiado
          </button>
          <button className="btn ghost" onClick={() => setConfirmReset(true)}>Reiniciar demo</button>
        </header>

        <main className="content">
          <Page metrics={metrics} />
        </main>
      </div>

      {tour && <Tour onClose={() => setTour(false)} />}

      {welcome && (
        <Modal size="narrow" title="ERP demostrativo" sub="Sistema integrado de gestión para un corralón de materiales de construcción" onClose={() => closeWelcome(false)}
          foot={
            <>
              <button className="btn" onClick={() => closeWelcome(false)}>Explorar libremente</button>
              <button className="btn primary" onClick={() => closeWelcome(true)}>Iniciar recorrido guiado</button>
            </>
          }
        >
          <div className="welcome-logo" style={{ color: 'var(--brand)' }}>
            <FundacionLogo size={150} withText />
          </div>
          <p className="text-2" style={{ textAlign: 'center', marginBottom: 12 }}>
            Fundación de Altos Estudios en Ciencias Comerciales
          </p>
          <div className="text-2" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p>
              <strong>Materiales del Plata S.R.L.</strong> es una empresa ficticia. Los datos simulan un año completo de operaciones: más de 4.000 facturas,
              más de 450 órdenes de compra, cobranzas, pagos y sus asientos contables.
            </p>
            <p>Todas las operaciones que se registren durante la demostración actualizan el sistema en el momento.</p>
          </div>
        </Modal>
      )}

      {confirmReset && (
        <Modal size="narrow" title="Reiniciar demo" onClose={() => setConfirmReset(false)}
          foot={
            <>
              <button className="btn" onClick={() => setConfirmReset(false)}>Cancelar</button>
              <button className="btn primary" onClick={() => { reset(); setConfirmReset(false); toast({ title: 'Demo reiniciada', body: 'Los datos volvieron a su estado inicial.', tone: 'good' }) }}>Reiniciar</button>
            </>
          }
        >
          <p className="text-2">Se descartan las operaciones registradas durante la demostración y los datos vuelven a su estado inicial.</p>
        </Modal>
      )}

      {guard && (
        <Modal size="narrow" title="Operación no permitida para este usuario" sub="Control interno: separación de funciones" onClose={() => setGuard(null)}
          foot={
            <>
              <button className="btn" onClick={() => setGuard(null)}>Cancelar</button>
              <button className="btn primary" onClick={() => {
                const u = switchToRole(guard.allowed[0])
                const retry = guard.retry
                setGuard(null)
                toast({ title: `Sesión cambiada a ${u.name}`, body: `Sector ${u.role}` })
                setTimeout(retry, 0)
              }}>
                Continuar como usuario de {guard.allowed[0]}
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Callout tone="bad" title={`${user.name} pertenece al sector ${user.role}`}>
              La acción "{ACTION_LABEL[guard.action]}" corresponde al sector <strong>{guard.allowed.join(' o ')}</strong>.
            </Callout>
            <p className="text-2">
              El ERP impide que una misma persona controle todas las etapas de una operación. Por ejemplo, quien emite una orden de compra no puede
              registrar la recepción de la mercadería ni autorizar su pago: cada etapa la valida un sector distinto.
            </p>
            <p className="text-2">El intento quedó registrado en la auditoría del sistema.</p>
          </div>
        </Modal>
      )}

      <div className="toasts">
        {toasts.map((t) => (
          <div className={`toast ${t.tone}`} key={t.id}>
            <div>
              <div className="t-title">{t.title}</div>
              {t.body && <div className="t-body">{t.body}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
