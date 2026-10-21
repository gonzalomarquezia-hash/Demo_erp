// Plan de cuentas simplificado. "nature": lado en que aumenta la cuenta.
export const ACCOUNTS = [
  { code: '1.1.01', name: 'Caja', group: 'Activo corriente', nature: 'D' },
  { code: '1.1.02', name: 'Banco Provincia c/c', group: 'Activo corriente', nature: 'D' },
  { code: '1.1.03', name: 'Valores a depositar', group: 'Activo corriente', nature: 'D' },
  { code: '1.1.04', name: 'Deudores por ventas', group: 'Activo corriente', nature: 'D' },
  { code: '1.1.05', name: 'IVA Crédito Fiscal', group: 'Activo corriente', nature: 'D' },
  { code: '1.1.06', name: 'Mercaderías', group: 'Activo corriente', nature: 'D' },
  { code: '1.2.01', name: 'Rodados', group: 'Activo no corriente', nature: 'D' },
  { code: '1.2.02', name: 'Instalaciones y equipos', group: 'Activo no corriente', nature: 'D' },
  { code: '2.1.01', name: 'Proveedores', group: 'Pasivo corriente', nature: 'H' },
  { code: '2.1.02', name: 'Recepciones pendientes de facturar', group: 'Pasivo corriente', nature: 'H' },
  { code: '2.1.03', name: 'IVA Débito Fiscal', group: 'Pasivo corriente', nature: 'H' },
  { code: '3.1.01', name: 'Capital social', group: 'Patrimonio neto', nature: 'H' },
  { code: '3.1.02', name: 'Resultados no asignados', group: 'Patrimonio neto', nature: 'H' },
  { code: '4.1.01', name: 'Ventas', group: 'Resultado positivo', nature: 'H' },
  { code: '5.1.01', name: 'Costo de mercaderías vendidas', group: 'Resultado negativo', nature: 'D' },
  { code: '5.2.01', name: 'Sueldos y cargas sociales', group: 'Resultado negativo', nature: 'D' },
  { code: '5.2.02', name: 'Fletes y combustible', group: 'Resultado negativo', nature: 'D' },
  { code: '5.2.03', name: 'Alquileres y servicios', group: 'Resultado negativo', nature: 'D' },
  { code: '5.2.04', name: 'Gastos bancarios', group: 'Resultado negativo', nature: 'D' },
]
export const ACC = Object.fromEntries(ACCOUNTS.map((a) => [a.code, a]))
export const accName = (code) => ACC[code]?.name || code

export const A = {
  CAJA: '1.1.01', BANCO: '1.1.02', VALORES: '1.1.03', DEUDORES: '1.1.04', IVA_CF: '1.1.05', MERCADERIAS: '1.1.06',
  RODADOS: '1.2.01', INSTALACIONES: '1.2.02',
  PROVEEDORES: '2.1.01', REC_PEND: '2.1.02', IVA_DF: '2.1.03',
  CAPITAL: '3.1.01', RNA: '3.1.02',
  VENTAS: '4.1.01', CMV: '5.1.01', SUELDOS: '5.2.01', FLETES: '5.2.02', SERVICIOS: '5.2.03', GASTOS_BANC: '5.2.04',
}

export const IVA_RATE = 0.21
