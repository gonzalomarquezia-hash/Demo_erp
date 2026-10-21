import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { buildInitialState } from './engine/seed.js'
import { cloneState } from './engine/engine.js'
import { USERS, PERMISSIONS, ACTION_LABEL } from './engine/catalog.js'
import { todayIso } from './lib/format.js'

const Ctx = createContext(null)

function readTheme() {
  let t = 'light'
  try {
    t = localStorage.getItem('erp-theme') || 'light'
  } catch {
    /* sin almacenamiento disponible */
  }
  document.documentElement.dataset.theme = t
  return t
}

export function StoreProvider({ children }) {
  const [db, setDb] = useState(() => buildInitialState(todayIso()))
  const [userId, setUserId] = useState('u-ventas')
  const [theme, setThemeState] = useState(readTheme)
  const [toasts, setToasts] = useState([])
  const [guard, setGuard] = useState(null)
  const [page, setPageState] = useState(() => window.location.hash.replace('#/', '') || 'tablero')
  const dbRef = useRef(db)
  const userRef = useRef(userId)
  userRef.current = userId

  const user = USERS.find((u) => u.id === userId)

  const setTheme = useCallback((t) => {
    // Se aplica antes de renderizar para que los gráficos lean los colores nuevos
    document.documentElement.dataset.theme = t
    setThemeState(t)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('erp-theme', theme)
    } catch {
      /* sin almacenamiento disponible */
    }
  }, [theme])

  useEffect(() => {
    const onHash = () => setPageState(window.location.hash.replace('#/', '') || 'tablero')
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const setPage = useCallback((p) => {
    window.location.hash = `#/${p}`
    setPageState(p)
  }, [])

  const toast = useCallback((t) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((list) => [...list.slice(-3), { id, tone: 'info', ...t }])
    setTimeout(() => setToasts((list) => list.filter((x) => x.id !== id)), t.duration || 5200)
  }, [])

  // Ejecuta una operación sobre la base de datos respetando la separación de funciones.
  // Si el usuario actual no corresponde al sector, se muestra el aviso de control interno.
  const run = useCallback(
    (action, fn, { onDone } = {}) => {
      const allowed = PERMISSIONS[action]
      const current = USERS.find((u) => u.id === userRef.current)
      if (allowed && !allowed.includes(current.role)) {
        const now = new Date()
        const cur = dbRef.current
        const denied = {
          id: `AU${cur.audit.length + 1}`, date: cur.today,
          time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
          user: current.name, role: current.role, module: 'Seguridad', doc: '-', level: 'alerta',
          action: `Intento rechazado: ${ACTION_LABEL[action].toLowerCase()} (permitido solo a ${allowed.join(', ')})`,
        }
        dbRef.current = { ...cur, audit: [...cur.audit, denied] }
        setDb(dbRef.current)
        setGuard({ action, allowed, retry: () => run(action, fn, { onDone }) })
        return null
      }
      const now = new Date()
      const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const draft = cloneState(dbRef.current)
      const result = fn(draft, { user: current, date: draft.today, time })
      draft.live = [...draft.live, { action, time, user: current.name }]
      dbRef.current = draft
      setDb(draft)
      onDone?.(result)
      return result
    },
    [],
  )

  const switchToRole = useCallback((role) => {
    const u = USERS.find((x) => x.role === role)
    if (u) {
      userRef.current = u.id
      setUserId(u.id)
    }
    return u
  }, [])

  const reset = useCallback(() => {
    const fresh = buildInitialState(todayIso())
    dbRef.current = fresh
    setDb(fresh)
  }, [])

  const value = useMemo(
    () => ({
      db, user, userId, setUserId, theme, setTheme, toasts, toast, run,
      guard, setGuard, switchToRole, page, setPage, reset,
    }),
    [db, user, userId, theme, setTheme, toasts, toast, run, guard, switchToRole, page, setPage, reset],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)
