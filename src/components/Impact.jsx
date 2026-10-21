import { accName } from '../engine/accounts.js'
import { money, fdate, dec2, num, units } from '../lib/format.js'
import { Badge } from './ui.jsx'

// Asiento en formato de libro diario: primero las cuentas deudoras, luego "a" las acreedoras.
export function Entry({ entry }) {
  const debits = entry.lines.filter((l) => l.debit)
  const credits = entry.lines.filter((l) => l.credit)
  const td = entry.lines.reduce((s, l) => s + l.debit, 0)
  const tc = entry.lines.reduce((s, l) => s + l.credit, 0)
  return (
    <div className="entry">
      <div className="entry-head">
        <span className="strong">Asiento N.º {num(entry.number)}</span>
        <span className="muted">{fdate(entry.date)}</span>
        <span className="text-2">{entry.concept}</span>
        <span style={{ marginLeft: 'auto' }}>
          {Math.abs(td - tc) < 0.01 ? <Badge tone="good">Debe = Haber</Badge> : <Badge tone="bad">Desbalanceado</Badge>}
        </span>
      </div>
      <table style={{ tableLayout: 'fixed' }}>
        <colgroup><col /><col style={{ width: 150 }} /><col style={{ width: 150 }} /></colgroup>
        <tbody>
          {debits.map((l, i) => (
            <tr key={`d${i}`}>
              <td><span className="mono muted">{l.account}</span> {accName(l.account)}</td>
              <td className="num">{dec2(l.debit)}</td>
              <td className="num" />
            </tr>
          ))}
          {credits.map((l, i) => (
            <tr key={`c${i}`}>
              <td className="indent">a <span className="mono muted">{l.account}</span> {accName(l.account)}</td>
              <td className="num" />
              <td className="num">{dec2(l.credit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function JournalHeader() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px 150px', fontSize: '0.75em', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 650, padding: '0 12px 4px' }}>
      <span>Cuenta</span><span style={{ textAlign: 'right' }}>Debe</span><span style={{ textAlign: 'right' }}>Haber</span>
    </div>
  )
}

// Línea de tiempo que muestra, módulo por módulo, el efecto de una operación.
export function ImpactSteps({ steps }) {
  return (
    <div className="impact">
      {steps.map((s, i) => (
        <div className="impact-step" key={i} style={{ animationDelay: `${i * 0.45}s` }}>
          <div className="impact-rail">
            <div className="impact-dot">{i + 1}</div>
            {i < steps.length - 1 && <div className="impact-line" />}
          </div>
          <div className="impact-card">
            <div className="ic-head">
              <span className="mod">{s.module}</span>
              <h4>{s.title}</h4>
              {s.badge && <span style={{ marginLeft: 'auto' }}>{s.badge}</span>}
            </div>
            <div className="ic-body">{s.body}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function StockChangeTable({ changes, showReorder = true, showCost = false }) {
  return (
    <table className="t" style={{ fontSize: '0.88em' }}>
      <thead>
        <tr>
          <th>Artículo</th>
          <th className="num">Stock anterior</th>
          <th className="num">Movimiento</th>
          <th className="num">Stock actual</th>
          {showCost && <th className="num">Costo promedio</th>}
          {showReorder && <th>Estado</th>}
        </tr>
      </thead>
      <tbody>
        {changes.map((ch) => {
          const low = showReorder && ch.after <= ch.reorder
          return (
            <tr key={ch.itemId}>
              <td>{ch.name}</td>
              <td className="num">{units(ch.before, ch.unit)}</td>
              <td className={`num strong ${ch.after < ch.before ? 'bad' : 'good'}`}>{ch.after < ch.before ? '-' : '+'}{num(ch.qty)}</td>
              <td className="num strong">{units(ch.after, ch.unit)}</td>
              {showCost && <td className="num">{money(ch.costBefore)} pasa a {money(ch.costAfter)}</td>}
              {showReorder && (
                <td>{low ? <Badge tone="warn">Bajo punto de reposición: se sugiere compra</Badge> : <Badge tone="good">Stock suficiente</Badge>}</td>
              )}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function Compare({ items }) {
  return (
    <div className="compare" style={{ gridTemplateColumns: `repeat(${items.length}, auto)` }}>
      {items.map((it) => <div className="lbl" key={`l${it.label}`}>{it.label}</div>)}
      {items.map((it) => <div className={`val ${it.tone || ''}`} key={`v${it.label}`}>{it.value}</div>)}
    </div>
  )
}
