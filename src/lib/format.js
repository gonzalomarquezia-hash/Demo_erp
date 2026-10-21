const money0 = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const num0 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
const num1 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const num2 = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const money = (v) => money0.format(Math.round(v || 0))
export const num = (v) => num0.format(v || 0)
export const dec1 = (v) => num1.format(v || 0)
export const dec2 = (v) => num2.format(v || 0)
export const pct = (v, digits = 1) => `${(v * 100).toFixed(digits).replace('.', ',')} %`

// Montos grandes abreviados para tarjetas y ejes: $ 182,4 M
export function moneyShort(v) {
  const a = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (a >= 1e9) return `${sign}$ ${num2.format(a / 1e9)} mil M`
  if (a >= 1e6) return `${sign}$ ${num1.format(a / 1e6)} M`
  if (a >= 1e3) return `${sign}$ ${num0.format(a / 1e3)} mil`
  return `${sign}$ ${num0.format(a)}`
}
export function axisMoney(v) {
  const a = Math.abs(v)
  if (a >= 1e6) return `${num0.format(v / 1e6)} M`
  if (a >= 1e3) return `${num0.format(v / 1e3)} mil`
  return num0.format(v)
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// Las fechas se manejan como texto ISO "AAAA-MM-DD" para evitar problemas de zona horaria.
export const fdate = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')
export const monthKey = (iso) => iso.slice(0, 7)
export const monthLabel = (key) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`
export const monthLong = (key) => `${MONTHS_LONG[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`

export function addDays(iso, days) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
export function daysBetween(a, b) {
  return Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000)
}
export const weekday = (iso) => new Date(`${iso}T12:00:00Z`).getUTCDay()
export function todayIso() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export const pad = (n, len) => String(n).padStart(len, '0')

// Unidad de medida en singular o plural según la cantidad: "1 balde", "18 baldes", "1.200 unidades"
const UNIT_PLURAL = { bolsa: 'bolsas', balde: 'baldes', millar: 'millares', unidad: 'unidades', barra: 'barras', metro: 'metros', rollo: 'rollos', lata: 'latas' }
const UNIT_LABEL = { m3: 'm³', m2: 'm²' }
export const unitLabel = (unit, qty = 1) => UNIT_LABEL[unit] || (Math.abs(qty) === 1 ? unit : UNIT_PLURAL[unit] || unit)
export const units = (qty, unit) => `${num(qty)} ${unitLabel(unit, qty)}`
export const plural = (n, one, many) => `${num(n)} ${n === 1 ? one : many}`
