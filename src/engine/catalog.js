// Datos maestros ficticios del corralón. Cualquier parecido con empresas reales es casual.

export const COMPANY = {
  name: 'Materiales del Plata S.R.L.',
  short: 'Materiales del Plata',
  cuit: '30-71654832-9',
  address: 'Av. Hipólito Yrigoyen 4850, Lanús Oeste',
  iva: 'Responsable Inscripto',
  pointOfSale: '0003',
  employees: 14,
}

export const SUPPLIERS = [
  { id: 'P01', name: 'Cementera del Centro S.A.', cuit: '30-60874512-3', rubro: 'Cementos y cales', terms: 15, lead: 3 },
  { id: 'P02', name: 'Áridos Río Luján S.R.L.', cuit: '30-70985214-6', rubro: 'Arena y piedra', terms: 15, lead: 2 },
  { id: 'P03', name: 'Ladrillera La Matanza S.A.', cuit: '30-68745123-1', rubro: 'Ladrillos y bloques', terms: 21, lead: 4 },
  { id: 'P04', name: 'Aceros Laminados del Sur S.A.', cuit: '30-58741236-8', rubro: 'Hierros y mallas', terms: 15, lead: 5 },
  { id: 'P05', name: 'Chapas y Perfiles Avellaneda S.A.', cuit: '30-71236548-0', rubro: 'Techos y perfiles', terms: 30, lead: 5 },
  { id: 'P06', name: 'Distribuidora Sanitaria Oeste S.R.L.', cuit: '30-69852147-4', rubro: 'Sanitarios y agua', terms: 30, lead: 6 },
  { id: 'P07', name: 'Cerámicos San Lorenzo S.A.', cuit: '30-61478523-7', rubro: 'Pisos y revestimientos', terms: 30, lead: 7 },
  { id: 'P08', name: 'Pinturerías Industriales Quilmes S.A.', cuit: '30-70321456-9', rubro: 'Pinturas e impermeabilizantes', terms: 30, lead: 4 },
  { id: 'P09', name: 'Placas y Sistemas Secos S.A.', cuit: '30-71569874-2', rubro: 'Construcción en seco', terms: 30, lead: 5 },
  { id: 'P10', name: 'Electro Mayorista Banfield S.R.L.', cuit: '30-70478521-5', rubro: 'Electricidad', terms: 21, lead: 3 },
  { id: 'P11', name: 'Herramientas Profesionales del Plata S.A.', cuit: '30-65874123-0', rubro: 'Herramientas', terms: 30, lead: 6 },
  { id: 'P12', name: 'Maderera Tigre S.R.L.', cuit: '30-69123574-8', rubro: 'Maderas', terms: 21, lead: 4 },
]

// cost: costo de reposición sin IVA. mk: recargo sobre costo. w: peso en la demanda. q: cantidad típica por renglón.
const RAW = [
  ['Obra gruesa', 'P01', [
    ['CEM-050', 'Cemento portland normal 50 kg', 'bolsa', 9800, 1.36, 14, 18],
    ['CEM-025', 'Cemento portland normal 25 kg', 'bolsa', 5300, 1.38, 5, 8],
    ['CAL-025', 'Cal hidráulica 25 kg', 'bolsa', 5200, 1.4, 9, 14],
    ['PLA-040', 'Cemento de albañilería 40 kg', 'bolsa', 8900, 1.38, 8, 12],
    ['HID-025', 'Hidrófugo para mortero 10 L', 'balde', 14500, 1.42, 2, 2],
  ]],
  ['Áridos', 'P02', [
    ['ARE-GRU', 'Arena gruesa a granel', 'm3', 28000, 1.45, 9, 3],
    ['ARE-FIN', 'Arena fina a granel', 'm3', 31000, 1.45, 5, 2],
    ['PIE-620', 'Piedra partida 6/20 a granel', 'm3', 45000, 1.42, 6, 3],
    ['ARE-BOL', 'Arena embolsada 30 kg', 'bolsa', 2300, 1.6, 3, 10],
  ]],
  ['Ladrillos y bloques', 'P03', [
    ['LAD-COM', 'Ladrillo común de campo', 'millar', 150000, 1.42, 6, 2],
    ['LAD-H12', 'Ladrillo hueco 12x18x33', 'unidad', 620, 1.42, 7, 300],
    ['LAD-H18', 'Ladrillo hueco portante 18x19x33', 'unidad', 780, 1.42, 5, 240],
    ['BLO-H20', 'Bloque de hormigón 20x20x40', 'unidad', 1100, 1.42, 3, 120],
  ]],
  ['Hierros y mallas', 'P04', [
    ['HIE-006', 'Hierro aletado ADN 420 Ø6 mm x 12 m', 'barra', 4100, 1.4, 7, 20],
    ['HIE-008', 'Hierro aletado ADN 420 Ø8 mm x 12 m', 'barra', 7200, 1.4, 9, 24],
    ['HIE-010', 'Hierro aletado ADN 420 Ø10 mm x 12 m', 'barra', 11000, 1.4, 6, 16],
    ['HIE-012', 'Hierro aletado ADN 420 Ø12 mm x 12 m', 'barra', 15800, 1.4, 4, 12],
    ['MAL-150', 'Malla electrosoldada 15x15 Ø4,2 mm 2x6 m', 'unidad', 38000, 1.38, 4, 6],
    ['ALA-NEG', 'Alambre negro recocido N.º 16', 'kg', 3200, 1.48, 5, 5],
    ['CLA-002', 'Clavos punta París 2"', 'kg', 3600, 1.5, 3, 3],
  ]],
  ['Techos y perfiles', 'P05', [
    ['CHA-C25', 'Chapa sinusoidal galvanizada C25', 'metro', 9500, 1.4, 4, 30],
    ['CHA-T25', 'Chapa trapezoidal prepintada T101', 'metro', 13800, 1.4, 3, 24],
    ['PER-C100', 'Perfil C galvanizado 100x50 x 12 m', 'unidad', 42000, 1.38, 3, 6],
    ['MEM-400', 'Membrana asfáltica 4 mm con aluminio', 'rollo', 42000, 1.42, 4, 4],
  ]],
  ['Sanitarios y agua', 'P06', [
    ['CAN-110', 'Caño PVC cloacal 110 mm x 4 m', 'unidad', 14000, 1.45, 4, 6],
    ['CAN-050', 'Caño PVC cloacal 50 mm x 4 m', 'unidad', 6200, 1.45, 3, 6],
    ['TER-020', 'Caño termofusión 20 mm x 4 m', 'unidad', 3900, 1.48, 4, 15],
    ['TAN-1000', 'Tanque de agua tricapa 1000 L', 'unidad', 145000, 1.36, 2, 1],
    ['INO-LAR', 'Inodoro largo con mochila', 'unidad', 120000, 1.42, 2, 1],
    ['GRI-MON', 'Grifería monocomando cocina', 'unidad', 85000, 1.45, 2, 1],
  ]],
  ['Pisos y revestimientos', 'P07', [
    ['CER-3535', 'Cerámica esmaltada 35x35 primera', 'm2', 9000, 1.48, 4, 30],
    ['POR-6060', 'Porcelanato rectificado 60x60', 'm2', 22000, 1.45, 3, 24],
    ['PEG-030', 'Pegamento para cerámica 30 kg', 'bolsa', 7500, 1.45, 5, 10],
    ['PAS-005', 'Pastina para juntas 5 kg', 'bolsa', 6400, 1.5, 2, 3],
  ]],
  ['Pinturas e impermeabilizantes', 'P08', [
    ['LAT-INT', 'Látex interior mate 20 L', 'balde', 68000, 1.44, 3, 2],
    ['LAT-EXT', 'Látex exterior premium 20 L', 'balde', 92000, 1.44, 2, 1],
    ['IMP-020', 'Impermeabilizante para techos 20 kg', 'balde', 75000, 1.44, 3, 1],
    ['ESM-004', 'Esmalte sintético brillante 4 L', 'lata', 38000, 1.46, 2, 2],
  ]],
  ['Construcción en seco', 'P09', [
    ['PLA-125', 'Placa de yeso estándar 12,5 mm', 'unidad', 11500, 1.42, 3, 20],
    ['MON-070', 'Perfil montante 70 mm x 2,6 m', 'unidad', 5200, 1.44, 3, 30],
    ['SOL-070', 'Perfil solera 70 mm x 2,6 m', 'unidad', 4400, 1.44, 2, 20],
    ['MAS-032', 'Masilla para juntas 32 kg', 'balde', 36000, 1.42, 1, 2],
  ]],
  ['Electricidad', 'P10', [
    ['CAB-025', 'Cable unipolar 2,5 mm rollo 100 m', 'rollo', 52000, 1.42, 3, 2],
    ['CAB-015', 'Cable unipolar 1,5 mm rollo 100 m', 'rollo', 36000, 1.42, 2, 2],
    ['TER-B20', 'Interruptor termomagnético bipolar 20 A', 'unidad', 18000, 1.48, 2, 3],
    ['CAJ-REC', 'Caja rectangular de embutir PVC', 'unidad', 450, 1.6, 2, 40],
  ]],
  ['Herramientas', 'P11', [
    ['CAR-090', 'Carretilla reforzada 90 L', 'unidad', 95000, 1.45, 1, 1],
    ['PAL-ANC', 'Pala ancha con cabo', 'unidad', 18000, 1.5, 1, 2],
    ['HOR-130', 'Hormigonera eléctrica 130 L', 'unidad', 650000, 1.35, 0.4, 1],
    ['AMO-115', 'Amoladora angular 115 mm 850 W', 'unidad', 78000, 1.45, 1, 1],
  ]],
  ['Maderas', 'P12', [
    ['FEN-018', 'Placa fenólica 18 mm 1,22x2,44', 'unidad', 48000, 1.4, 3, 6],
    ['TIR-234', 'Tirante pino 2x4" x 3,66 m', 'unidad', 9800, 1.42, 3, 12],
  ]],
]

export function buildItems() {
  const items = []
  for (const [rubro, supplierId, list] of RAW) {
    for (const [code, name, unit, cost, mk, w, q] of list) {
      items.push({
        id: code, code, name, rubro, unit, supplierId,
        cost, price: Math.round((cost * mk) / 10) * 10, weight: w, typicalQty: q,
        stock: 0, reorder: 0, max: 0,
      })
    }
  }
  return items
}

// [nombre, condición IVA, límite de crédito, plazo pactado (días), atraso habitual (días), frecuencia relativa]
const CUSTOMERS_RAW = [
  ['Constructora Río Sur S.A.', 'RI', 45000000, 30, 22, 9],
  ['Desarrollos Altamira S.A.', 'RI', 38000000, 30, 35, 7],
  ['Obras y Servicios del Litoral S.R.L.', 'RI', 30000000, 30, 18, 7],
  ['Estudio Benítez Arquitectura S.R.L.', 'RI', 12000000, 30, 10, 4],
  ['Grupo Edilicio Lomas S.A.', 'RI', 40000000, 45, 40, 6],
  ['Infraestructura Banfield S.A.', 'RI', 25000000, 30, 55, 5],
  ['Viviendas del Conurbano Coop. Ltda.', 'RI', 20000000, 30, 28, 5],
  ['Remodelaciones Urbanas S.R.L.', 'RI', 9000000, 30, 15, 4],
  ['Consorcio Torre Alsina', 'Exento', 6000000, 30, 20, 2],
  ['Municipalidad - Obras Delegadas (Licitación 14/26)', 'Exento', 30000000, 60, 70, 3],
  ['Instalaciones Sanitarias Gómez S.R.L.', 'RI', 7000000, 30, 12, 3],
  ['Electricidad Integral Ponce S.A.', 'RI', 6000000, 30, 9, 2],
  ['Techos y Zinguería Moreno S.R.L.', 'RI', 8000000, 30, 25, 3],
  ['Pisos & Revestimientos Arce S.R.L.', 'RI', 5000000, 30, 14, 2],
  ['Construcciones Ledesma S.A.', 'RI', 18000000, 30, 95, 3],
  ['Inmobiliaria Parque Sur S.A.', 'RI', 15000000, 30, 32, 3],
  ['Martín Quiroga (contratista)', 'Mono', 3500000, 15, 12, 4],
  ['Héctor Villalba (albañil)', 'Mono', 2500000, 15, 18, 4],
  ['Sergio Domínguez (contratista)', 'Mono', 3000000, 15, 8, 3],
  ['Ramón Aguirre (albañil)', 'Mono', 2000000, 15, 40, 3],
  ['Nicolás Benegas (plomero)', 'Mono', 1500000, 15, 6, 2],
  ['Walter Cabrera (contratista)', 'Mono', 3000000, 15, 85, 2],
  ['Daniel Ojeda (techista)', 'Mono', 1800000, 15, 10, 2],
  ['Pablo Herrera (albañil)', 'Mono', 1500000, 15, 20, 2],
  ['Fabián Correa (contratista)', 'Mono', 2500000, 15, 15, 2],
  ['Colegio San Martín de Tours', 'Exento', 4000000, 30, 25, 1],
  ['Club Atlético Villa Diamante', 'Exento', 3000000, 30, 45, 1],
  ['Lavadero Industrial Remedios S.A.', 'RI', 5000000, 30, 16, 1],
  ['Frigorífico Valentín Alsina S.A.', 'RI', 9000000, 30, 20, 1],
  ['Hotel Plaza Lanús S.R.L.', 'RI', 6000000, 30, 30, 1],
  ['Supermercados Del Barrio S.A.', 'RI', 7000000, 30, 22, 1],
  ['Taller Metalúrgico Fiorito S.R.L.', 'RI', 4000000, 30, 18, 1],
]

const IVA_LABEL = { RI: 'Resp. Inscripto', Mono: 'Monotributo', Exento: 'Exento', CF: 'Consumidor Final' }
export const ivaLabel = (c) => IVA_LABEL[c] || c

export function buildCustomers(rng) {
  const list = CUSTOMERS_RAW.map(([name, iva, limit, terms, delay, freq], i) => ({
    id: `C${String(i + 1).padStart(3, '0')}`,
    name, iva, limit, terms, delay, freq,
    cuit: `${iva === 'Mono' ? '20' : '30'}-${rng.int(20000000, 72000000)}-${rng.int(0, 9)}`,
    since: `20${rng.int(14, 25)}`,
  }))
  list.unshift({ id: 'C000', name: 'Consumidor final (mostrador)', iva: 'CF', limit: 0, terms: 0, delay: 0, freq: 0, cuit: '', since: '' })
  return list
}

export const USERS = [
  { id: 'u-ventas', name: 'Lucía Fernández', role: 'Ventas', initials: 'LF' },
  { id: 'u-compras', name: 'Ricardo Acosta', role: 'Compras', initials: 'RA' },
  { id: 'u-deposito', name: 'Jorge Medina', role: 'Depósito', initials: 'JM' },
  { id: 'u-contaduria', name: 'Carla Ruiz', role: 'Contaduría', initials: 'CR' },
  { id: 'u-tesoreria', name: 'Pablo Sosa', role: 'Tesorería', initials: 'PS' },
  { id: 'u-gerencia', name: 'Ana Paz', role: 'Gerencia', initials: 'AP' },
]

// Qué sector puede ejecutar cada operación (separación de funciones).
export const PERMISSIONS = {
  sale: ['Ventas'],
  receipt: ['Tesorería'],
  deposit: ['Tesorería'],
  po: ['Compras'],
  receive: ['Depósito'],
  invoice: ['Contaduría'],
  pay: ['Tesorería'],
}
export const ACTION_LABEL = {
  sale: 'Emitir una factura de venta',
  receipt: 'Registrar un cobro',
  deposit: 'Depositar un cheque',
  po: 'Emitir una orden de compra',
  receive: 'Registrar la recepción de mercadería',
  invoice: 'Registrar la factura del proveedor',
  pay: 'Emitir la orden de pago',
}
