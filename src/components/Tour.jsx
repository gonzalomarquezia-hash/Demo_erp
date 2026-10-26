import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useStore } from '../store.jsx'
import { TOURS, EXPLAIN, CHOICE } from './tourSteps.jsx'

const GAP = 14
const CARD_W = 420

const pause = (ms) => new Promise((r) => setTimeout(r, ms))

// Espera a que aparezca un elemento (devuelve null si no aparece a tiempo)
async function wait(sel, timeout = 5000) {
  const t0 = performance.now()
  while (performance.now() - t0 < timeout) {
    const el = document.querySelector(sel)
    if (el) return el
    await pause(40)
  }
  return null
}

async function waitGone(sel, timeout = 5000) {
  const t0 = performance.now()
  while (performance.now() - t0 < timeout) {
    if (!document.querySelector(sel)) return true
    await pause(40)
  }
  return false
}

// Hace clic en un elemento de la pantalla, como si lo hiciera la persona.
// Con { text } elige, entre los que coinciden con el selector, el que contiene ese texto.
async function click(sel, { text, timeout = 5000 } = {}) {
  const t0 = performance.now()
  while (performance.now() - t0 < timeout) {
    const el = [...document.querySelectorAll(sel)].find((e) => !text || e.textContent.includes(text))
    if (el) {
      el.click()
      await pause(120)
      return true
    }
    await pause(40)
  }
  console.warn('Recorrido: no se encontró', sel, text || '')
  return false
}

// Cambia el valor de un <select> controlado por React
function setSelect(el, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set
  setter.call(el, value)
  el.dispatchEvent(new Event('change', { bubbles: true }))
}

// Cierra, de arriba hacia abajo, las ventanas y paneles que estén abiertos
async function closeModals() {
  for (let i = 0; i < 6; i++) {
    const x = [...document.querySelectorAll('.scrim .x-btn, .drawer .x-btn')].pop()
    if (!x) break
    x.click()
    await pause(140)
  }
}

// Rectángulo que abarca a todos los elementos señalados
function measure(targets) {
  const rects = targets.map((t) => document.querySelector(`[data-tour="${t}"]`)).filter(Boolean).map((el) => el.getBoundingClientRect())
  if (!rects.length) return null
  const left = Math.min(...rects.map((r) => r.left))
  const top = Math.min(...rects.map((r) => r.top))
  const right = Math.max(...rects.map((r) => r.right))
  const bottom = Math.max(...rects.map((r) => r.bottom))
  return { left, top, right, bottom, width: right - left, height: bottom - top }
}

// Recorrido guiado y explicación por pantalla.
//  - mode "guided": primero se elige qué ver (una venta o una compra) y el sistema hace la operación en vivo.
//  - mode "explain": explica los componentes de la pantalla en la que se abrió.
// Se maneja con el mouse o con el teclado: Espacio, Enter o Av Pág avanzan (las teclas de un puntero de presentación),
// Re Pág retrocede y Esc cierra.
export function Tour({ mode = 'guided', onClose }) {
  const { page, setPage, switchToRole } = useStore()
  const explain = mode === 'explain'
  const [branch, setBranch] = useState(null)
  const [idx, setIdx] = useState(0)
  const [rect, setRect] = useState(null)
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(0)
  const [cardH, setCardH] = useState(240)
  const cardRef = useRef(null)
  const pageRef = useRef(page)
  pageRef.current = page
  const startPage = useRef(page)
  const runs = useRef(new Map())

  const steps = explain ? EXPLAIN[startPage.current] || [] : branch ? TOURS[branch].steps : []
  const choosing = !explain && !branch
  const step = choosing ? null : steps[idx]
  const last = !choosing && idx === steps.length - 1

  const api = useMemo(
    () => ({ pause, wait, waitGone, click, setSelect, closeModals, setRole: (r) => switchToRole(r), goto: (p) => setPage(p) }),
    [setPage, switchToRole],
  )

  const finish = useCallback(async () => {
    await closeModals()
    onClose()
  }, [onClose])

  const startBranch = useCallback((b) => {
    runs.current = new Map()
    setRect(null)
    setIdx(0)
    setBranch(b)
  }, [])

  const next = useCallback(() => {
    if (busy) return
    if (choosing) startBranch('venta')
    else if (last) finish()
    else setIdx((i) => i + 1)
  }, [busy, choosing, last, startBranch, finish])

  const prev = useCallback(() => {
    if (busy) return
    if (!choosing && idx === 0) {
      if (!explain) {
        setRect(null)
        setBranch(null)
      }
      return
    }
    setIdx((i) => Math.max(0, i - 1))
  }, [busy, choosing, idx, explain])

  // Si la pantalla no tiene explicación, se cierra
  useEffect(() => {
    if (explain && !steps.length) onClose()
  }, [explain, steps.length, onClose])

  // Al llegar a un paso: va a su pantalla y, si corresponde, ejecuta la operación (una sola vez)
  useEffect(() => {
    if (!step) return undefined
    let cancelled = false
    setRect(null)
    const key = `${branch || 'x'}:${idx}`
    ;(async () => {
      if (step.page && pageRef.current !== step.page) {
        setPage(step.page)
        await pause(250)
      }
      let p = runs.current.get(key)
      if (step.enter && !p) {
        p = step.enter(api).catch((e) => console.warn('Recorrido:', e))
        runs.current.set(key, p)
      }
      if (p) {
        setBusy(true)
        await p
        if (!cancelled) setBusy(false)
      }
      if (!cancelled) setReady((n) => n + 1)
    })()
    return () => {
      cancelled = true
    }
  }, [step, branch, idx, api, setPage])

  // Busca el elemento a resaltar (puede tardar un instante si se cambió de módulo)
  useEffect(() => {
    if (!step || !step.target) return undefined
    const targets = [].concat(step.target)
    let raf
    let tries = 0
    const find = () => {
      const first = targets.map((t) => document.querySelector(`[data-tour="${t}"]`)).find(Boolean)
      if (first) {
        first.scrollIntoView({ block: 'center', behavior: 'instant' })
        requestAnimationFrame(() => setRect(measure(targets)))
      } else if (tries++ < 90) {
        raf = requestAnimationFrame(find)
      }
    }
    const t = setTimeout(find, 60)
    const again = setTimeout(() => setRect((r) => (r ? measure(targets) || r : r)), 500)
    const onResize = () => setRect(measure(targets))
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(t)
      clearTimeout(again)
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
    }
  }, [step, ready])

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight)
  }, [idx, rect, branch, busy])

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
      } else if (choosing && ['c', 'C'].includes(e.key)) {
        e.preventDefault()
        e.stopPropagation()
        startBranch('compra')
      } else if (e.key === 'Escape') {
        e.stopPropagation()
        finish()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [next, prev, finish, choosing, startBranch])

  const vw = window.innerWidth
  const vh = window.innerHeight
  let pos
  if (!rect) {
    pos = { top: Math.max(16, vh / 2 - cardH / 2), left: vw / 2 - Math.min(CARD_W, vw - 32) / 2 }
  } else {
    const w = Math.min(CARD_W, vw - 32)
    const clampL = (l) => Math.max(16, Math.min(vw - w - 16, l))
    const clampT = (t) => Math.max(16, Math.min(vh - cardH - 16, t))
    const place = step?.place || 'auto'
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
  const total = steps.length
  const label = choosing
    ? 'Recorrido guiado'
    : explain
      ? `Explicación · paso ${idx + 1} de ${total}`
      : `${TOURS[branch].label} · paso ${idx + 1} de ${total}${step.section ? ` · ${step.section}` : ''}`
  const otherBranch = !choosing && !explain ? TOURS[branch].other : null
  const progress = choosing ? 0 : ((idx + 1) / total) * 100

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
      <div className="tour-card" ref={cardRef} style={pos} key={`${branch}-${idx}`} role="dialog" aria-live="polite" aria-busy={busy}>
        <div className="tc-head">
          <span className="tc-step">{label}</span>
          <button className="x-btn" onClick={finish} aria-label="Cerrar recorrido">
            <X size={17} />
          </button>
        </div>
        <h3>{choosing ? CHOICE.title : step.title}</h3>
        <div className="tc-body">{choosing ? CHOICE.body : step.body}</div>
        <div className="tc-foot">
          {choosing ? (
            <>
              <div style={{ flex: 1 }} />
              <button className="btn sm" onClick={() => startBranch('compra')}>Una compra</button>
              <button className="btn sm primary" onClick={() => startBranch('venta')}>Una venta</button>
            </>
          ) : (
            <>
              <div className="tc-progress">
                <div style={{ width: `${progress}%` }} />
              </div>
              {busy && <span className="tc-busy">Haciendo la operación…</span>}
              <button className="btn sm ghost" onClick={prev} disabled={busy || (idx === 0 && explain)}>
                Anterior
              </button>
              {last && otherBranch && (
                <button className="btn sm" disabled={busy} onClick={() => startBranch(otherBranch)}>
                  Ver {otherBranch === 'compra' ? 'una compra' : 'una venta'}
                </button>
              )}
              <button className="btn sm primary" onClick={next} disabled={busy}>
                {last ? 'Finalizar' : 'Siguiente'}
              </button>
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
