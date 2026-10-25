// Guion del recorrido guiado. Cada paso indica el módulo y el elemento (data-tour) que se resalta.
export const TOUR_STEPS = [
  {
    page: 'tablero',
    title: 'Un ERP para un corralón de materiales',
    body: (
      <>
        <p>
          Este sistema simula el ERP de <strong>Materiales del Plata S.R.L.</strong>, un corralón que vende cemento, hierro, ladrillos,
          áridos, sanitarios y herramientas a constructoras, contratistas y público de mostrador.
        </p>
        <p>
          Un <strong>ERP</strong> (Enterprise Resource Planning) integra todas las áreas de la empresa sobre una <strong>única base de datos</strong>:
          lo que registra Ventas lo ven al instante Depósito, Tesorería y Contaduría, sin planillas sueltas ni cargas duplicadas.
        </p>
        <p className="muted small">
          Avanzá con <span className="kbd">Espacio</span> o <span className="kbd">Av Pág</span>, retrocedé con <span className="kbd">Re Pág</span> y cerrá con <span className="kbd">Esc</span>.
        </p>
      </>
    ),
  },
  {
    page: 'tablero', target: 'nav', place: 'right', section: 'Estructura',
    title: 'Módulos integrados',
    body: (
      <>
        <p>Cada área de la empresa tiene su módulo: Ventas, Compras, Stock, Tesorería, Contabilidad y Control de gestión.</p>
        <p>Los módulos no son sistemas separados: son vistas distintas de los mismos datos. Una venta, por ejemplo, impacta en cinco módulos a la vez.</p>
      </>
    ),
  },
  {
    page: 'tablero', target: 'user', section: 'Control interno',
    title: 'Usuario y sector',
    body: (
      <>
        <p>Cada usuario pertenece a un sector y solo puede ejecutar las operaciones de su función.</p>
        <p>
          Así se aplica la <strong>separación de funciones</strong>: quien emite la orden de compra no puede recibir la mercadería ni autorizar el pago.
          Si se intenta, el sistema lo impide y lo deja registrado.
        </p>
      </>
    ),
  },
  {
    page: 'tablero', target: 'kpis', section: 'Tablero de control',
    title: 'Indicadores en tiempo real',
    body: (
      <>
        <p>El tablero resume la situación de la empresa: ventas, margen, disponibilidades, cuentas a cobrar y a pagar.</p>
        <p>Ningún número se carga a mano: todos se calculan a partir de las operaciones registradas. Pasando el mouse por el ícono de información se ve la fórmula de cada indicador.</p>
      </>
    ),
  },
  {
    page: 'tablero', target: 'chart-budget', section: 'Tablero de control',
    title: 'Real contra presupuesto',
    body: <p>El control presupuestario compara lo ejecutado con lo planificado mes a mes. El desvío es la señal que dispara el análisis y las acciones correctivas.</p>,
  },
  {
    page: 'tablero', target: 'alerts', section: 'Tablero de control',
    title: 'Gestión por excepción',
    body: <p>El sistema destaca solo lo que requiere atención: artículos bajo el punto de reposición, deuda vencida, facturas de proveedores retenidas y vencimientos próximos.</p>,
  },
  {
    page: 'bsc', target: 'bsc', section: 'Control de gestión',
    title: 'Cuadro de Mando Integral',
    body: (
      <>
        <p>Siguiendo a Kaplan y Norton, la estrategia se traduce en objetivos e indicadores para cuatro perspectivas: Financiera, Clientes, Procesos internos y Aprendizaje y crecimiento.</p>
        <p>Cada indicador muestra su fórmula, la meta y un semáforo con el valor actual.</p>
      </>
    ),
  },
  {
    page: 'ventas', target: 'sales-flow', section: 'Ventas',
    title: 'Circuito de ventas',
    body: <p>Presupuesto, pedido, remito, factura y cobranza. Cada documento nace del anterior, con numeración correlativa, y el ERP genera los asientos contables sin intervención manual.</p>,
  },
  {
    page: 'ventas', target: 'new-sale', section: 'Ventas',
    title: 'Simular una venta en vivo',
    body: (
      <>
        <p>Con este botón se emite una factura real dentro de la demo. Al confirmarla, el sistema muestra paso a paso todo lo que se actualizó:</p>
        <p>stock, cuenta corriente del cliente, libro diario e indicadores del tablero.</p>
      </>
    ),
  },
  {
    page: 'clientes', target: 'aging', section: 'Cuentas a cobrar',
    title: 'Cuentas corrientes y antigüedad de saldos',
    body: <p>Cada factura a crédito queda en la cuenta corriente del cliente. La antigüedad de saldos agrupa la deuda según los días de atraso y permite priorizar la gestión de cobranza.</p>,
  },
  {
    page: 'compras', target: 'po-flow', section: 'Compras',
    title: 'Circuito de compras',
    body: <p>Orden de compra, recepción en depósito, factura del proveedor y orden de pago. Cada paso lo ejecuta un sector distinto y queda firmado por su usuario.</p>,
  },
  {
    page: 'compras', target: 'retained', section: 'Compras',
    title: 'Control de tres vías',
    body: (
      <>
        <p>Antes de aceptar una factura de proveedor, el ERP la compara con la orden de compra y con lo que efectivamente ingresó al depósito.</p>
        <p>Si se factura mercadería que no llegó o a otro precio, la factura queda retenida y no se puede pagar.</p>
      </>
    ),
  },
  {
    page: 'stock', target: 'stock-table', section: 'Stock',
    title: 'Inventario valorizado',
    body: <p>Existencias por artículo, punto de reposición, costo por precio promedio ponderado y valorización. Haciendo clic en un artículo se abre su ficha de stock (kardex) con cada entrada y salida.</p>,
  },
  {
    page: 'tesoreria', target: 'cashflow', section: 'Tesorería',
    title: 'Flujo de fondos proyectado',
    body: <p>Con los vencimientos de clientes, cheques en cartera y facturas de proveedores, el sistema proyecta ingresos y egresos de las próximas semanas para anticipar faltantes de caja.</p>,
  },
  {
    page: 'contabilidad', target: 'journal', section: 'Contabilidad',
    title: 'Contabilidad automática',
    body: <p>Cada operación genera su asiento por partida doble en el momento. El libro diario, el mayor, el balance de sumas y saldos y el estado de resultados están siempre al día, sin esperar al cierre de mes.</p>,
  },
  {
    page: 'presupuesto', target: 'budget-sim', section: 'Planeamiento',
    title: 'Presupuesto económico y financiero',
    body: <p>Una empresa puede ganar dinero y aun así quedarse sin caja. Este simulador muestra cómo los plazos de cobro y de pago separan el resultado económico del flujo financiero.</p>,
  },
  {
    page: 'auditoria', target: 'audit', section: 'Control interno',
    title: 'Trazabilidad',
    body: <p>Cada acción queda registrada con fecha, hora, usuario y sector. Es la pista de auditoría que permite reconstruir quién hizo qué y cuándo.</p>,
  },
  {
    page: 'acerca', target: 'compare', section: 'Contexto',
    title: 'Comparación con ERP reales',
    body: <p>Los ERP comerciales (SAP Business One, Odoo, Tango Gestión, Microsoft Dynamics) funcionan con esta misma lógica, con más módulos, parametrización y años de implementación detrás.</p>,
  },
  {
    page: 'ventas',
    title: 'Probemos en vivo',
    body: (
      <>
        <p>Ahora se puede emitir una venta o avanzar una orden de compra y ver cómo cada módulo se actualiza.</p>
        <p className="muted small">El botón Reiniciar demo, arriba a la derecha, vuelve todos los datos a su estado inicial.</p>
      </>
    ),
  },
]
