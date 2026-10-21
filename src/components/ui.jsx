import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Info as InfoIcon, AlertTriangle, CheckCircle2, ShieldAlert, Lightbulb } from 'lucide-react'

export function Card({ title, sub, right, children, flush, className = '', tour, style }) {
  return (
    <section className={`card ${className}`} data-tour={tour} style={style}>
      {(title || right) && (
        <div className="card-head">
          <div>
            {title && <h3>{title}</h3>}
            {sub && <div className="sub">{sub}</div>}
          </div>
          {right && <div className="right">{right}</div>}
        </div>
      )}
      <div className={`card-body ${flush ? 'flush' : ''}`}>{children}</div>
    </section>
  )
}

export function Kpi({ label, value, foot, info, tour, tone }) {
  return (
    <div className="card kpi" data-tour={tour}>
      <div className="kpi-label">
        {label}
        {info && <Info text={info} />}
      </div>
      <div className={`kpi-value ${tone || ''}`}>{value}</div>
      {foot && <div className="kpi-foot">{foot}</div>}
    </div>
  )
}

export function Delta({ value, invert = false, suffix = 'vs. mes anterior' }) {
  if (!isFinite(value)) return null
  const good = invert ? value < 0 : value >= 0
  return (
    <>
      <span className={`delta ${good ? 'up' : 'down'}`}>
        {value >= 0 ? '+' : ''}
        {(value * 100).toFixed(1).replace('.', ',')} %
      </span>
      <span>{suffix}</span>
    </>
  )
}

export function Badge({ tone = 'neutral', children, plain }) {
  return <span className={`badge ${tone} ${plain ? 'plain' : ''}`}>{children}</span>
}

export function Info({ text }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef(null)
  const show = () => {
    const r = ref.current.getBoundingClientRect()
    const left = Math.min(window.innerWidth - 300, Math.max(12, r.left - 20))
    setPos({ top: r.bottom + 8, left })
    setOpen(true)
  }
  return (
    <>
      <button ref={ref} className="info-btn" onMouseEnter={show} onMouseLeave={() => setOpen(false)} onFocus={show} onBlur={() => setOpen(false)} aria-label="Más información" type="button">
        <InfoIcon size={14} />
      </button>
      {open &&
        createPortal(
          <div className="chart-tip" style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 100, maxWidth: 290, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
            {text}
          </div>,
          document.body,
        )}
    </>
  )
}

export function Callout({ tone = 'info', title, children }) {
  const Icon = { bad: ShieldAlert, warn: AlertTriangle, good: CheckCircle2, info: Lightbulb }[tone]
  return (
    <div className={`callout ${tone}`}>
      <Icon size={18} />
      <div>
        {title && <div className="strong" style={{ marginBottom: 2 }}>{title}</div>}
        <div className="text-2">{children}</div>
      </div>
    </div>
  )
}

function useEscape(onClose) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
}

export function Modal({ title, sub, onClose, children, foot, size = '', tour }) {
  useEscape(onClose)
  return createPortal(
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true" data-tour={tour}>
        <div className="modal-head">
          <div>
            <h2>{title}</h2>
            {sub && <div className="sub">{sub}</div>}
          </div>
          {onClose && (
            <button className="x-btn" onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {foot && <div className="modal-foot">{foot}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Drawer({ title, sub, right, onClose, children }) {
  useEscape(onClose)
  return createPortal(
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: '1.15em' }}>{title}</h2>
            {sub && <div className="crumb" style={{ marginTop: 2 }}>{sub}</div>}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {right}
            <button className="x-btn" onClick={onClose} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>,
    document.body,
  )
}

export function Tabs({ tabs, value, onChange, tour }) {
  return (
    <div className="tabs" data-tour={tour}>
      {tabs.map((t) => (
        <button key={t.id} className={`tab ${value === t.id ? 'on' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Seg({ options, value, onChange, tour }) {
  return (
    <div className="seg" data-tour={tour}>
      {options.map((o) => (
        <button key={o.id} className={value === o.id ? 'on' : ''} onClick={() => onChange(o.id)} title={o.title}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function usePaged(rows, size = 15) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(rows.length / size))
  useEffect(() => {
    if (page >= pages) setPage(0)
  }, [pages, page])
  const slice = useMemo(() => rows.slice(page * size, page * size + size), [rows, page, size])
  const pager = (
    <div className="pager">
      <span>
        {rows.length ? `${page * size + 1} a ${Math.min(rows.length, page * size + size)} de ${rows.length.toLocaleString('es-AR')}` : 'Sin registros'}
      </span>
      <button className="btn sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button>
      <button className="btn sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Siguiente</button>
    </div>
  )
  return { slice, pager, setPage }
}

export function Progress({ value, color = 'var(--series-1)', max = 1 }) {
  return (
    <div className="bar-track">
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} />
    </div>
  )
}

export function StatusBadge({ status }) {
  const map = {
    Emitida: 'info', Recibida: 'warn', Facturada: 'warn', Pagada: 'good', 'Factura retenida': 'bad',
    Cobrada: 'good', Pendiente: 'warn', Vencida: 'bad', Parcial: 'warn', 'En cartera': 'info', Depositado: 'good',
  }
  return <Badge tone={map[status] || 'neutral'}>{status}</Badge>
}
