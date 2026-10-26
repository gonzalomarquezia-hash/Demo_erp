import { Card, Badge, Progress, Callout } from '../components/ui.jsx'
import { pct, dec1 } from '../lib/format.js'

// Semáforo: compara el valor actual con la meta según el sentido del indicador
function status(k) {
  const ratio = k.higher ? k.value / k.target : k.target / Math.max(k.value, 0.0001)
  if (ratio >= 1) return { tone: 'good', label: 'En meta' }
  if (ratio >= 0.9) return { tone: 'warn', label: 'Cerca de la meta' }
  return { tone: 'bad', label: 'Fuera de meta' }
}

export default function Scorecard({ metrics: m }) {
  const P = [
    {
      name: 'Financiera',
      question: '¿Cómo nos ven los socios?',
      kpis: [
        {
          objective: 'Sostener la rentabilidad de la mercadería vendida',
          name: 'Margen bruto', formula: '(Ventas netas - CMV) / Ventas netas x 100',
          value: m.yearMargin, target: 0.28, higher: true, fmt: pct, source: 'Últimos 12 meses',
        },
        {
          objective: 'Asegurar la liquidez de la operación',
          name: 'Ciclo de conversión de caja', formula: 'Días de cobro + Días de inventario - Días de pago',
          value: m.ccc, target: 45, higher: false, fmt: (v) => `${Math.round(v)} días`, source: 'Ventana de 90 días',
        },
      ],
    },
    {
      name: 'Clientes',
      question: '¿Cómo nos ven los clientes?',
      kpis: [
        {
          objective: 'Fidelizar a constructoras y contratistas',
          name: 'Tasa de recompra', formula: 'Clientes que compraron en los dos últimos bimestres / Clientes del bimestre anterior',
          value: m.repeatRate, target: 0.9, higher: true, fmt: pct, source: 'Clientes de cuenta corriente',
        },
        {
          objective: 'Administrar el crédito otorgado a clientes',
          name: 'Morosidad', formula: 'Deuda con más de 60 días de atraso / Total de cuentas a cobrar',
          value: m.morosidad, target: 0.08, higher: false, fmt: pct, source: 'Antigüedad de saldos actual',
        },
      ],
    },
    {
      name: 'Procesos internos',
      question: '¿En qué procesos debemos ser excelentes?',
      kpis: [
        {
          objective: 'Tener disponible lo que el cliente pide',
          name: 'Nivel de servicio', formula: 'Importe entregado / Importe pedido por los clientes x 100',
          value: m.fillCur, target: 0.98, higher: true, fmt: pct, source: 'Mes en curso',
        },
        {
          objective: 'Pagar solo lo que efectivamente se recibió',
          name: 'Facturas conciliadas en tres vías', formula: 'Facturas conciliadas sin diferencias / Facturas de proveedores recibidas',
          value: m.matchRate, target: 1, higher: true, fmt: pct, source: 'Últimos 90 días',
        },
      ],
    },
    {
      name: 'Aprendizaje y crecimiento',
      question: '¿Cómo seguimos mejorando?',
      kpis: [
        {
          objective: 'Capacitar al personal en el uso del ERP',
          name: 'Horas de capacitación por empleado', formula: 'Horas de capacitación del año / Cantidad de empleados',
          value: 14, target: 20, higher: true, fmt: (v) => `${dec1(v)} h`, source: 'Registro de RR. HH. (dato cargado)',
        },
        {
          objective: 'Registrar cada operación en su origen',
          name: 'Operaciones registradas en el sistema', formula: 'Operaciones cargadas en el ERP al momento de ocurrir / Operaciones totales',
          value: 0.96, target: 0.98, higher: true, fmt: pct, source: 'Relevamiento de procesos (dato cargado)',
        },
      ],
    },
  ]

  return (
    <div className="page">
      <div data-tour="bsc-intro"><Callout tone="info" title="Estrategia: crecer en el segmento de constructoras sin resignar liquidez">
        El Cuadro de Mando Integral traduce la estrategia en objetivos medibles. Las perspectivas se encadenan: personal capacitado y datos registrados en origen
        mejoran los procesos; procesos confiables satisfacen a los clientes; clientes fieles y bien administrados generan resultados financieros.
      </Callout></div>
      <Card flush tour="bsc">
        <div style={{ marginTop: -10 }}>
          {P.map((p, pi) => (
            <div className="bsc-row" key={p.name} data-tour={`bsc-row-${pi}`}>
              <div className="bsc-persp">
                <div className="section-title">Perspectiva</div>
                <h3>{p.name}</h3>
                <div className="muted small">{p.question}</div>
              </div>
              <div className="bsc-kpis">
                {p.kpis.map((k, ki) => {
                  const s = status(k)
                  const progress = k.higher ? k.value / k.target : k.target / Math.max(k.value, 0.0001)
                  return (
                    <div className="bsc-kpi" key={k.name} data-tour={pi === 0 && ki === 0 ? 'bsc-first' : undefined}>
                      <div className="small muted">Objetivo: {k.objective}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div className="strong">{k.name}</div>
                        <Badge tone={s.tone}>{s.label}</Badge>
                      </div>
                      <div className="formula">{k.formula}</div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
                        <div className="kpi-value" style={{ fontSize: '1.5em' }}>{k.fmt(k.value)}</div>
                        <div className="small text-2">Meta: {k.higher ? 'mayor o igual a' : 'menor o igual a'} {k.fmt(k.target)}</div>
                      </div>
                      <Progress value={Math.min(progress, 1)} color={`var(--${s.tone})`} />
                      <div className="small muted">Fuente: {k.source}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
