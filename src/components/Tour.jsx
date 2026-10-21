import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useStore } from '../store.jsx'
import { TOUR_STEPS } from './tourSteps.jsx'

const GAP = 14
const CARD_W = 420

// Recorrido guiado. Se maneja con el mouse o con el teclado:
// Espacio, Enter o Av Pág avanzan (las teclas que envía un puntero de presentación);
// Re Pág retrocede y Esc cierra.
export function Tour({ onClose }) {
  const { page, setPage } = useStore()
  const [idx, setIdx] = useState(0)
  const [rect, setRect] = useState(null)
  const [cardH, setCardH] = useState(240)
  const cardRef = useRef(null)
  const step = TOUR_STEPS[idx]
  const last = idx === TOUR_STEPS.length - 1

  const next = useCallback(() => (last ? onClose() : setIdx((i) => i + 1)), [last, onClose])
  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), [])

  useEffect(() => {
    if (step.page && step.page !== page) setPage(step.page)
  }, [step, page, setPage])

  // Busca el elemento a resaltar (puede tardar un instante si se cambió de módulo)
  useEffect(() => {
    let raf
    let tries = 0
    setRect(null)
    const find = () => {
      const el = step.target && document.querySelector(`[data-tour="${step.target}"]`)
      if (el) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' })
        requestAnimationFrame(() => setRect(el.getBoundingClientRect()))
      } else if (step.target && tries++ < 90) {
        raf = requestAnimationFrame(find)
      }
    }
    const t = setTimeout(find, 60)
    const onResize = () => {
      const el = step.target && document.querySelector(`[data-tour="${step.target}"]`)
      if (el) setRect(el.getBoundingClientRect())
    }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(t)
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [step])

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight)
  }, [idx, rect])

  useEffect(() => {
    const onKey = (e) => {
      if (['PageDown', ' ', 'Enter', 'ArrowRight', 'ArrowDown'].includes(e.key)) {
        e.preventDefault()
        e.stopPropagation()
        next()
      } else if (['PageUp', 'ArrowLeft', 'ArrowUp', 'Backspace'].includes(e.key)) {
        e.preventDefault()
        e.stopPropagation()
        prev()
      } else if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [next, prev, onClose])

  const vw = window.innerWidth
  const vh = window.innerHeight
  let pos
  if (!rect) {
    pos = { top: Math.max(16, vh / 2 - cardH / 2), left: vw / 2 - Math.min(CARD_W, vw - 32) / 2 }
  } else {
    const w = Math.min(CARD_W, vw - 32)
    const clampL = (l) => Math.max(16, Math.min(vw - w - 16, l))
    const clampT = (t) => Math.max(16, Math.min(vh - cardH - 16, t))
    const place = step.place || 'auto'
    if (place === 'right' || (place === 'auto' && rect.right + GAP + w < vw && rect.height > vh * 0.5)) {
      pos = { top: clampT(rect.top + 8), left: rect.right + GAP }
    } else if (place === 'left') {
      pos = { top: clampT(rect.top), left: clampL(rect.left - w - GAP) }
    } else if (rect.bottom + GAP + cardH < vh) {
      pos = { top: rect.bottom + GAP, left: clampL(rect.left) }
    } else if (rect.top - GAP - cardH > 0) {
      pos = { top: rect.top - GAP - cardH, left: clampL(rect.left) }
    } else {
      pos = { top: clampT(vh - cardH - 24), left: clampL(vw - w - 24) }
    }
  }

  const pad = 6
  return createPortal(
    <>
      <div className="tour-scrim" onClick={(e) => e.stopPropagation()} />
      <div
        className="tour-hole"
        style={
          rect
            ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
            : { top: vh / 2, left: vw / 2, width: 0, height: 0, boxShadow: '0 0 0 9999px var(--scrim)' }
        }
      />
      <div className="tour-card" ref={cardRef} style={pos} key={idx} role="dialog" aria-live="polite">
        <div className="tc-head">
          <span className="tc-step">
            Paso {idx + 1} de {TOUR_STEPS.length}
            {step.section ? ` · ${step.section}` : ''}
          </span>
          <button className="x-btn" onClick={onClose} aria-label="Cerrar recorrido">
            <X size={17} />
          </button>
        </div>
        <h3>{step.title}</h3>
        <div className="tc-body">{step.body}</div>
        <div className="tc-foot">
          <div className="tc-progress">
            <div style={{ width: `${((idx + 1) / TOUR_STEPS.length) * 100}%` }} />
          </div>
          <button className="btn sm ghost" onClick={prev} disabled={idx === 0}>
            Anterior
          </button>
          <button className="btn sm primary" onClick={next}>
            {last ? 'Finalizar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </>,
    document.body,
  )
}
