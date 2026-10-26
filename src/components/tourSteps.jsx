// Guiones del recorrido.
//
// TOURS: recorrido guiado con dos ramas (una venta o una compra). Cada paso puede traer un `enter`,
//   una función que ejecuta la operación en el sistema de verdad (clics, cambio de usuario, etc.).
// EXPLAIN: explicación por pantalla ("Explicar pantalla"): señala cada componente y dice cómo se lee.
//
// Cada paso indica la página (`page`), el elemento a resaltar (`target`, uno o varios data-tour),
// y el texto. Las ayudas de `enter` (a.click, a.wait, a.setRole...) están en Tour.jsx.

const KEYS = (
  <p className="muted small">
    Avanzá con <span className="kbd">Espacio</span> o <span className="kbd">Av Pág</span>, volvé con <span className="kbd">Re Pág</span> y salí con <span className="kbd">Esc</span>.
  </p>
)

export const CHOICE = {
  title: '¿Qué querés ver?',
  body: (
    <>
      <p>
        Un <strong>ERP</strong> es un solo sistema donde trabajan todas las áreas de la empresa. Lo que se carga en un lado se actualiza en todos los demás.
      </p>
      <p>Elegí una operación y el sistema la hace en vivo, paso a paso.</p>
      <p className="muted small">
        <span className="kbd">Espacio</span> una venta · <span className="kbd">C</span> una compra · <span className="kbd">Esc</span> salir
      </p>
    </>
  ),
}

// ------------------------------------------------------------------------------------------ Recorridos
export const TOURS = {
  venta: {
    label: 'Una venta',
    other: 'compra',
    steps: [
      {
        page: 'ventas', target: 'sales-flow', section: 'El circuito',
        title: 'El circuito de ventas',
        enter: async (a) => { await a.closeModals(); a.setRole('Ventas') },
        body: (
          <>
            <p>Una venta tiene cinco pasos: presupuesto, pedido, remito, factura y cobranza.</p>
            <p>Cada documento sale del anterior, así que no se vuelve a cargar nada.</p>
          </>
        ),
      },
      {
        page: 'ventas', target: 'sale-modal', section: 'La venta',
        title: 'Cargamos la venta',
        enter: async (a) => {
          await a.click('[data-tour="new-sale"]')
          await a.wait('[data-tour="sale-modal"]')
          await a.click('[data-tour="sale-example"]')
          await a.pause(300)
          // Si el cliente del ejemplo ya no tiene crédito disponible, se prueba con otro
          const confirm = () => document.querySelector('[data-tour="sale-confirm"]')
          const sel = document.querySelector('[data-tour="sale-customer"]')
          if (confirm()?.disabled && sel) {
            for (const o of [...sel.options].filter((x) => x.value !== 'C000')) {
              a.setSelect(sel, o.value)
              await a.pause(120)
              if (!confirm().disabled) break
            }
          }
        },
        body: (
          <>
            <p>Un cliente compra materiales. El vendedor elige el cliente y los artículos.</p>
            <p>El precio y el IVA los calcula el sistema, y no deja vender si no hay stock o si el cliente se pasa de su límite de crédito.</p>
          </>
        ),
      },
      {
        page: 'ventas', target: 'impact-0', section: 'La factura',
        title: 'Emitimos la factura',
        enter: async (a) => {
          await a.click('[data-tour="sale-confirm"]')
          await a.wait('[data-tour="impact-0"]')
          await a.pause(900)
        },
        body: (
          <>
            <p>Con un solo clic la factura queda emitida, con su número y su CAE (simulado).</p>
            <p>Todo lo que viene a continuación lo hizo el sistema solo.</p>
          </>
        ),
      },
      {
        page: 'ventas', target: ['impact-1', 'impact-2'], section: 'Lo que se actualizó',
        title: 'Stock y cuenta corriente',
        body: (
          <>
            <p><strong>Depósito:</strong> bajó la mercadería. Si el stock queda bajo el mínimo, el sistema avisa que hay que reponer.</p>
            <p><strong>Cuentas a cobrar:</strong> el cliente ahora debe esa plata y queda anotado su vencimiento.</p>
          </>
        ),
      },
      {
        page: 'ventas', target: 'impact-3', section: 'Lo que se actualizó',
        title: 'Contabilidad',
        body: (
          <>
            <p>El asiento contable se hizo solo, por partida doble: el Debe es igual al Haber.</p>
            <p>Nadie lo pasó a mano ni hay que esperar al cierre de mes.</p>
          </>
        ),
      },
      {
        page: 'tablero', target: 'kpis', section: 'Lo que se actualizó',
        title: 'Tablero de control',
        enter: async (a) => { await a.closeModals(); a.goto('tablero') },
        body: (
          <>
            <p>Las ventas, el margen y lo que hay que cobrar ya cambiaron.</p>
            <p>Una sola carga actualizó cinco áreas, y eso es un ERP.</p>
          </>
        ),
      },
    ],
  },

  compra: {
    label: 'Una compra',
    other: 'venta',
    steps: [
      {
        page: 'compras', target: 'po-flow', section: 'El circuito',
        title: 'El circuito de compras',
        enter: async (a) => { await a.closeModals(); a.setRole('Ventas') },
        body: (
          <>
            <p>Una compra tiene cuatro pasos: orden de compra, recepción, factura del proveedor y pago.</p>
            <p>Cada uno lo hace un sector distinto. Eso es la <strong>separación de funciones</strong>: quien pide no recibe, y quien recibe no paga.</p>
          </>
        ),
      },
      {
        page: 'compras', target: 'guard-modal', section: 'Control interno',
        title: 'Probamos con el usuario equivocado',
        enter: async (a) => {
          a.setRole('Ventas')
          await a.click('[data-tour="new-po"]')
          await a.wait('[data-tour="po-new-modal"]')
          // Si no hay sugerencia de reposición se agrega un artículo a mano
          if (document.querySelector('[data-tour="po-confirm"]')?.disabled) {
            const sel = document.querySelector('[data-tour="po-add-item"]')
            const opt = sel && [...sel.options].find((o) => o.value)
            if (opt) a.setSelect(sel, opt.value)
            await a.pause(200)
          }
          await a.pause(500)
          await a.click('[data-tour="po-confirm"]')
          await a.wait('[data-tour="guard-modal"]')
        },
        body: (
          <>
            <p>Estamos con <strong>Lucía Fernández, del sector Ventas</strong>, e intentamos emitir una orden de compra.</p>
            <p>El sistema la frena: emitir órdenes de compra le corresponde al sector Compras. El intento queda registrado en Auditoría.</p>
          </>
        ),
      },
      {
        page: 'compras', target: 'po-steps', section: 'Compras',
        title: 'Cambiamos de usuario y se emite',
        enter: async (a) => {
          await a.click('[data-tour="guard-continue"]')
          await a.wait('[data-tour="po-modal"]')
          await a.pause(500)
        },
        body: (
          <>
            <p>Ahora entró <strong>Ricardo Acosta, de Compras</strong>, y la orden sí se emitió.</p>
            <p>Todavía no se gastó nada: es un compromiso con el proveedor, por eso no hay asiento contable.</p>
          </>
        ),
      },
      {
        page: 'compras', target: 'po-impact', section: 'Depósito',
        title: 'Llega la mercadería',
        enter: async (a) => {
          a.setRole('Depósito')
          await a.click('[data-tour="po-receive"]')
          await a.wait('[data-tour="po-impact"]')
          await a.pause(900)
        },
        body: (
          <>
            <p>Llega el camión y <strong>Depósito</strong> registra lo que entró: sube el stock y se recalcula el costo promedio.</p>
            <p>Todavía no llegó la factura, así que el sistema anota una cuenta puente: "recibido sin facturar".</p>
          </>
        ),
      },
      {
        page: 'compras', target: 'po-impact', section: 'Contaduría',
        title: 'Factura y control de tres vías',
        enter: async (a) => {
          a.setRole('Contaduría')
          await a.click('[data-tour="po-invoice"]')
          await a.wait('[data-tour="invoice-modal"]')
          await a.pause(900)
          await a.click('[data-tour="invoice-confirm"]')
          await a.waitGone('[data-tour="invoice-modal"]')
          await a.pause(900)
        },
        body: (
          <>
            <p>Llega la factura. <strong>Contaduría</strong> la carga y el sistema compara tres cosas: lo que se pidió, lo que llegó y lo que se factura.</p>
            <p>Si coinciden, queda conciliada y recién ahí se reconoce la deuda con el proveedor.</p>
          </>
        ),
      },
      {
        page: 'compras', target: 'po-impact', section: 'Tesorería',
        title: 'Pagamos',
        enter: async (a) => {
          a.setRole('Tesorería')
          await a.click('[data-tour="po-pay"]')
          await a.wait('[data-tour="po-impact"]')
          await a.pause(900)
        },
        body: (
          <>
            <p><strong>Tesorería</strong> paga la factura conciliada.</p>
            <p>La deuda con el proveedor se cancela, sale la plata del banco y se genera el asiento. Cuatro sectores, cuatro firmas, un solo registro.</p>
          </>
        ),
      },
      {
        page: 'compras', target: 'po-retained-detail', section: 'Cuando algo no coincide',
        title: 'Factura con diferencias',
        enter: async (a) => {
          await a.closeModals()
          await a.pause(200)
          const row = document.querySelector('[data-tour="retained"] tbody tr')
          if (row) {
            row.click()
            await a.wait('[data-tour="po-retained-detail"]')
          }
        },
        body: (
          <>
            <p>Si el proveedor factura más de lo que llegó, o a otro precio, la factura queda <strong>retenida</strong> y no se puede pagar.</p>
            <p>Así se evita pagar de más o pagar mercadería que nunca llegó.</p>
          </>
        ),
      },
    ],
  },
}

// ------------------------------------------------------------------------------------------ Explicaciones por pantalla
export const EXPLAIN = {
  tablero: [
    {
      target: 'kpis', title: 'Los indicadores',
      body: (
        <>
          <p>Estas ocho tarjetas resumen cómo está la empresa. Ningún número se carga a mano: se calculan con las operaciones registradas.</p>
          <p>Pasá el mouse por la (i) de cada una y ves la fórmula.</p>
        </>
      ),
    },
    {
      target: 'kpi-cumplimiento', title: 'Cumplimiento del presupuesto',
      body: (
        <>
          <p>Ventas reales ÷ lo que se tendría que haber vendido hasta hoy según el presupuesto.</p>
          <p><strong>Verde:</strong> se llegó o se pasó. <strong>Amarillo:</strong> 90 % o más. <strong>Rojo:</strong> menos de 90 %.</p>
        </>
      ),
    },
    {
      target: 'kpi-ccc', title: 'Ciclo de conversión de caja',
      body: (
        <>
          <p>Días que se tarda en cobrar + días que la mercadería está en el depósito − días que se tarda en pagar.</p>
          <p>Es cuánto tiempo la empresa financia la operación con plata propia. Cuanto menos, mejor.</p>
        </>
      ),
    },
    {
      target: 'chart-budget', title: 'Ventas contra presupuesto',
      body: (
        <>
          <p><strong>Barras azules:</strong> lo vendido cada mes. <strong>Línea gris:</strong> lo presupuestado.</p>
          <p>Si la barra queda por debajo de la línea hay un desvío, y hay que averiguar por qué. El último mes está incompleto y se compara contra el presupuesto proporcional (marcado con *).</p>
        </>
      ),
    },
    {
      target: 'alerts', title: 'Alertas de gestión',
      body: (
        <>
          <p>El sistema muestra solo lo que necesita atención: facturas retenidas, artículos para reponer, deuda vencida, pagos que se acercan.</p>
          <p>Cada alerta es un botón que lleva directo al módulo donde se resuelve.</p>
        </>
      ),
    },
    {
      target: 'chart-rubro', title: 'Ventas por rubro',
      body: <p>Cuánto aportó cada familia de productos a las ventas del mes. Sirve para ver de qué depende la facturación.</p>,
    },
    {
      target: 'chart-aging', title: 'Antigüedad de saldos',
      body: (
        <>
          <p>Cuánta plata nos deben, agrupada por días de atraso.</p>
          <p>De azul (todavía no venció) a rojo (más de 60 días): cuanto más rojo, más difícil de cobrar.</p>
        </>
      ),
    },
    {
      target: 'recent', title: 'Actividad reciente',
      body: <p>Las últimas operaciones del sistema, con usuario y sector. Es un resumen de la auditoría: quién hizo qué y cuándo.</p>,
    },
  ],

  bsc: [
    {
      target: 'bsc-intro', title: 'La estrategia',
      body: <p>El Cuadro de Mando Integral (Kaplan y Norton) traduce la estrategia en objetivos que se pueden medir. Acá la estrategia es crecer con constructoras sin perder liquidez.</p>,
    },
    {
      target: 'bsc', title: 'Las cuatro perspectivas',
      body: (
        <>
          <p>Cada fila responde una pregunta: <em>¿cómo nos ven los socios, los clientes?, ¿en qué procesos hay que ser excelentes?, ¿cómo seguimos mejorando?</em></p>
          <p>Se encadenan de abajo hacia arriba: personas capacitadas mejoran los procesos, procesos confiables satisfacen a los clientes, y clientes fieles dan resultados financieros.</p>
        </>
      ),
    },
    {
      target: 'bsc-first', title: 'Cómo se lee un indicador',
      body: (
        <>
          <p>Cada indicador tiene el <strong>objetivo</strong> que persigue, la <strong>fórmula</strong>, el <strong>valor actual</strong>, la <strong>meta</strong> y una barra de avance.</p>
          <p>La etiqueta de color es el semáforo: en meta, cerca de la meta o fuera de meta.</p>
        </>
      ),
    },
    {
      target: 'bsc-row-1', title: 'Meta "mayor" o "menor"',
      body: (
        <>
          <p>En algunos indicadores conviene que el valor sea alto (tasa de recompra) y en otros que sea bajo (morosidad).</p>
          <p>La meta lo indica: "mayor o igual a" o "menor o igual a". El semáforo ya tiene eso en cuenta.</p>
        </>
      ),
    },
  ],

  ventas: [
    {
      target: 'sales-flow', title: 'El circuito',
      body: <p>Presupuesto, pedido, remito, factura y cobranza. Debajo de cada paso se ve qué sector lo hace y qué efecto tiene en stock y contabilidad.</p>,
    },
    {
      target: 'sales-kpis', title: 'Indicadores de ventas',
      body: (
        <>
          <p>Facturas del día, ventas del mes y ticket promedio (ventas netas ÷ cantidad de facturas).</p>
          <p>La última tarjeta muestra qué parte de las ventas se dio a crédito: el resto se cobró al contado.</p>
        </>
      ),
    },
    {
      target: 'sales-table', title: 'Comprobantes',
      body: (
        <>
          <p>Todas las facturas emitidas, con buscador y filtro por condición. El estado dice si está cobrada, pendiente, parcial o vencida.</p>
          <p>Si hacés clic en una fila se abre la factura completa con su CAE, sus asientos contables y su cobranza. Las que se emiten en la demo llevan una marca.</p>
        </>
      ),
    },
    {
      target: 'new-sale', title: 'Nueva venta',
      body: <p>Emite una factura de verdad dentro de la demo. Antes de dejarla emitir el sistema controla el stock y el límite de crédito, y después muestra todo lo que se actualizó.</p>,
    },
  ],

  compras: [
    {
      target: 'po-flow', title: 'El circuito',
      body: <p>Orden de compra, recepción, factura del proveedor y pago. Cada etapa la hace un sector distinto y queda firmada por su usuario.</p>,
    },
    {
      target: 'po-kpis', title: 'Indicadores de compras',
      body: (
        <>
          <p>Órdenes abiertas, compras del mes y facturas retenidas.</p>
          <p>"Recibido sin facturar" es el saldo de la cuenta puente: mercadería que ya entró al depósito y cuya factura todavía no llegó.</p>
        </>
      ),
    },
    {
      target: 'retained', title: 'Facturas retenidas',
      body: <p>Facturas que no pasaron el control de tres vías (orden, recepción y factura). No se pueden pagar hasta que el proveedor mande la nota de crédito o la factura corregida. La columna Motivo dice qué no coincidió.</p>,
    },
    {
      target: 'po-table', title: 'Órdenes de compra',
      body: <p>Todas las órdenes con su estado: emitida, recibida, facturada, retenida o pagada. Hacé clic en una para ver su circuito, sus asientos y avanzar al paso siguiente.</p>,
    },
    {
      target: 'new-po', title: 'Nueva orden de compra',
      body: <p>Las cantidades sugeridas salen del punto de reposición y del stock máximo de cada artículo. Solo el sector Compras puede emitirla.</p>,
    },
  ],

  stock: [
    {
      target: 'stock-kpis', title: 'Indicadores de stock',
      body: (
        <>
          <p><strong>Stock valorizado:</strong> existencias por su costo promedio ponderado.</p>
          <p><strong>Rotación:</strong> costo de lo vendido en el año ÷ stock valorizado. Dice cuántas veces se renueva el inventario.</p>
        </>
      ),
    },
    {
      target: 'stock-table', title: 'Inventario',
      body: (
        <>
          <p>Existencias por artículo con su punto de reposición, costo promedio, precio de lista y margen.</p>
          <p>El estado avisa: <strong>Reponer</strong> (hay que pedir), <strong>Pedido en curso</strong> (ya se pidió) o <strong>Sin stock</strong>.</p>
        </>
      ),
    },
    {
      target: 'kardex-chart', title: 'Evolución del stock',
      enter: async (a) => {
        await a.click('[data-tour="stock-table"] tbody tr')
        await a.wait('[data-tour="kardex"]')
      },
      body: (
        <>
          <p>Abrimos la ficha de un artículo. El gráfico muestra el saldo al cierre de cada día.</p>
          <p>La línea punteada es el punto de reposición: cuando el stock baja de ahí, hay que comprar.</p>
        </>
      ),
    },
    {
      target: 'kardex-table', title: 'Ficha de stock (kardex)',
      body: <p>Cada entrada y cada salida con su comprobante, el saldo que quedó y el costo unitario. Es el registro que respalda el número del inventario.</p>,
    },
  ],

  clientes: [
    {
      target: 'aging', title: 'Antigüedad de saldos',
      body: <p>La deuda de los clientes agrupada por días de atraso, con el porcentaje de cada tramo sobre el total. Sirve para decidir a quién reclamarle primero.</p>,
    },
    {
      target: 'cust-kpis', title: 'Indicadores',
      body: (
        <>
          <p>El total coincide con el saldo contable de Deudores por ventas.</p>
          <p><strong>Días de cobro (DSO):</strong> cuentas a cobrar ÷ ventas diarias de los últimos 90 días. Se compara con el plazo pactado.</p>
        </>
      ),
    },
    {
      target: 'cust-table', title: 'Clientes en cuenta corriente',
      body: (
        <>
          <p>Cada cliente con su límite de crédito, su saldo y cuánto del límite está usando.</p>
          <p>El estado marca <strong>Al día</strong>, <strong>Con deuda vencida</strong> o <strong>Moroso</strong> (más de 60 días de atraso).</p>
        </>
      ),
    },
    {
      target: 'cust-ledger', title: 'Cuenta corriente de un cliente',
      enter: async (a) => {
        await a.click('[data-tour="cust-table"] tbody tr')
        await a.wait('[data-tour="cust-drawer"]')
      },
      body: <p>Las facturas van al Debe, los cobros al Haber y el saldo se va acumulando. Así se sabe exactamente cuánto debe y desde cuándo.</p>,
    },
    {
      target: 'cust-collect', title: 'Registrar un cobro',
      body: <p>Desde acá se registra el recibo. El sistema lo aplica a las facturas más antiguas y genera el asiento. Solo lo puede hacer Tesorería.</p>,
    },
  ],

  proveedores: [
    {
      target: 'sup-kpis', title: 'Vencimientos',
      body: <p>La deuda con proveedores agrupada por cuándo vence: ya vencida, próximos 7 días, 8 a 15 días y más de 15. Sirve para ordenar los pagos.</p>,
    },
    {
      target: 'sup-table', title: 'Proveedores',
      body: (
        <>
          <p>Cada proveedor con su plazo de pago, lo que se le compró en el año, las facturas pendientes y el saldo.</p>
          <p>El estado marca si tiene una factura retenida, si hay deuda vencida o si está al día.</p>
        </>
      ),
    },
    {
      target: 'sup-pending', title: 'Facturas pendientes de pago',
      enter: async (a) => {
        await a.click('[data-tour="sup-table"] tbody tr')
        await a.wait('[data-tour="sup-drawer"]')
      },
      body: <p>Solo aparecen las facturas ya conciliadas. Desde acá Tesorería emite la orden de pago y se ve el impacto en el banco y en la contabilidad.</p>,
    },
  ],

  tesoreria: [
    {
      target: 'treas-kpis', title: 'Disponibilidades',
      body: <p>Caja, banco y valores a depositar (cheques en cartera). La suma es lo que la empresa tiene disponible hoy.</p>,
    },
    {
      target: 'cashflow', title: 'Flujo de fondos proyectado',
      body: (
        <>
          <p><strong>Barras azules:</strong> lo que se espera cobrar cada semana. <strong>Barras naranjas:</strong> lo que se espera pagar.</p>
          <p>Se arma con los vencimientos de clientes, cheques y facturas de proveedores. Sirve para ver un faltante de caja antes de que ocurra.</p>
        </>
      ),
    },
    {
      target: 'cashflow-table', title: 'El detalle semana por semana',
      body: <p>Saldo inicial, cada tipo de ingreso y de egreso, y el saldo final proyectado. Si algún saldo final aparece en rojo, esa semana falta plata.</p>,
    },
    {
      target: 'cashflow-callout', title: 'La conclusión',
      body: <p>El sistema avisa si en algún momento el saldo proyectado queda negativo y sugiere acelerar cobranzas, negociar plazos o gestionar un descubierto con tiempo.</p>,
    },
    {
      target: 'treas-cheques', title: 'Cheques en cartera',
      body: <p>Cheques recibidos de clientes, ordenados por fecha de cobro. Cuando llega la fecha se habilita el botón Depositar, que mueve la plata al banco.</p>,
    },
    {
      target: 'treas-bank', title: 'Movimientos bancarios',
      body: <p>Los últimos movimientos del banco según la contabilidad. En un ERP real se concilian con el extracto que manda el banco.</p>,
    },
  ],

  contabilidad: [
    {
      target: 'acc-kpis', title: 'Partida doble',
      enter: async (a) => { await a.click('[data-tab="diario"]') },
      body: <p>Cantidad de asientos y totales de Debe y Haber. Si los dos totales son iguales aparece "Partida doble verificada": todo asiento tiene que balancear.</p>,
    },
    {
      target: 'journal', title: 'Libro diario',
      body: (
        <>
          <p>Cada operación de cualquier módulo genera su asiento en el momento. Arriba de cada uno dice de qué módulo viene y con qué comprobante.</p>
          <p>Primero van las cuentas que se debitan y después, con una "a", las que se acreditan.</p>
        </>
      ),
    },
    {
      target: 'acc-ledger', title: 'Libro mayor',
      enter: async (a) => { await a.click('[data-tab="mayor"]'); await a.wait('[data-tour="acc-ledger"]') },
      body: <p>Todos los movimientos de una sola cuenta, con su saldo acumulado. Se cambia de cuenta con el selector de arriba a la derecha. La D es saldo deudor y la A acreedor.</p>,
    },
    {
      target: 'acc-trial', title: 'Balance de sumas y saldos',
      enter: async (a) => { await a.click('[data-tab="sumas"]'); await a.wait('[data-tour="acc-trial"]') },
      body: <p>Todas las cuentas con la suma de su Debe y de su Haber y el saldo que queda. Si el total de saldos deudores es igual al de acreedores, la contabilidad cierra.</p>,
    },
    {
      target: ['acc-results', 'acc-balance'], title: 'Estados contables',
      enter: async (a) => { await a.click('[data-tab="estados"]'); await a.wait('[data-tour="acc-results"]') },
      body: (
        <>
          <p><strong>Estado de resultados:</strong> ventas menos costo de lo vendido y menos gastos. Se puede ver por mes o del ejercicio completo.</p>
          <p><strong>Situación patrimonial:</strong> activo = pasivo + patrimonio neto. Sale de los mismos asientos, siempre al día.</p>
        </>
      ),
    },
    {
      target: 'acc-chart', title: 'Plan de cuentas',
      enter: async (a) => { await a.click('[data-tab="plan"]'); await a.wait('[data-tour="acc-chart"]') },
      body: <p>La lista de cuentas con su código. Los asientos automáticos se arman con estos códigos, y "saldo habitual" dice si la cuenta normalmente es deudora o acreedora.</p>,
    },
  ],

  presupuesto: [
    {
      target: 'bud-intro', title: 'Económico y financiero',
      enter: async (a) => { await a.click('[data-tour="bud-assumptions"] button', { text: 'Situación actual' }) },
      body: (
        <>
          <p>El <strong>presupuesto económico</strong> anota ingresos y gastos cuando se devengan (al vender o comprar).</p>
          <p>El <strong>financiero</strong> los anota cuando se cobran o se pagan. La diferencia entre los dos son los créditos a clientes y las deudas con proveedores.</p>
        </>
      ),
    },
    {
      target: 'bud-assumptions', title: 'Los supuestos',
      body: (
        <>
          <p>Cada deslizador es un supuesto: crecimiento de ventas, qué parte se vende a crédito, plazo de cobro, plazo de pago y margen.</p>
          <p>Cuando movés uno, el gráfico, las tablas y el balance se recalculan al instante. Los botones de arriba cargan tres escenarios armados.</p>
        </>
      ),
    },
    {
      target: 'bud-chart', title: 'Cómo se lee el gráfico',
      body: (
        <>
          <p><strong>Línea azul:</strong> resultado económico acumulado, o sea cuánto se va ganando.</p>
          <p><strong>Línea naranja:</strong> saldo de caja, o sea cuánta plata hay realmente. Si baja de cero, falta plata.</p>
        </>
      ),
    },
    {
      target: 'bud-chart', title: 'Vender más, pero a 90 días',
      enter: async (a) => {
        await a.click('[data-tour="bud-assumptions"] button', { text: 'Crecer vendiendo a 90 días' })
        await a.pause(500)
      },
      body: (
        <>
          <p>Cargamos el escenario "crecer vendiendo a 90 días". El resultado (azul) sube porque se vende más.</p>
          <p>Pero la caja (naranja) se hunde: se paga a los proveedores a 15 días y se cobra a 90. Una empresa puede ganar plata y quedarse sin caja.</p>
        </>
      ),
    },
    {
      target: 'bud-chart', title: 'Negociar con los proveedores',
      enter: async (a) => {
        await a.click('[data-tour="bud-assumptions"] button', { text: 'Negociar pago a 60 días' })
        await a.pause(500)
      },
      body: (
        <>
          <p>Mismo crecimiento, pero ahora se negocia pagar a 60 días. El resultado es el mismo, pero la caja se recupera.</p>
          <p>Cuanto más se acerca el plazo de pago al de cobro, menos hay que financiar.</p>
        </>
      ),
    },
    {
      target: 'bud-table', title: 'El presupuesto mes a mes',
      enter: async (a) => { await a.click('[data-tour="bud-assumptions"] button', { text: 'Situación actual' }) },
      body: (
        <>
          <p>Arriba, el económico: ventas menos costo menos gastos fijos da el resultado del mes.</p>
          <p>Abajo, el financiero: el saldo inicial de caja, más cobranzas, menos pagos, da el saldo final.</p>
        </>
      ),
    },
    {
      target: 'bud-balance', title: 'Balance proyectado',
      body: <p>Une los dos presupuestos: la caja sale del financiero y el resultado del económico. Si el activo es igual al pasivo más el patrimonio neto, el modelo cierra.</p>,
    },
  ],

  auditoria: [
    {
      target: 'audit', title: 'Pista de auditoría',
      body: <p>Cada acción queda registrada con fecha, hora, usuario y sector, y no se puede modificar. Se puede filtrar por sector o ver solo las alertas, que salen en rojo.</p>,
    },
    {
      target: 'audit-controls', title: 'Controles internos',
      body: <p>Los controles que el sistema aplica solo: separación de funciones, tres vías, límite de crédito, stock, numeración correlativa y partida doble. El color dice si alguno tiene algo para revisar.</p>,
    },
    {
      target: 'audit-perms', title: 'Matriz de permisos',
      body: <p>Qué sector puede ejecutar cada operación. Por eso, si alguien de otro sector lo intenta, el sistema lo rechaza y deja el intento anotado.</p>,
    },
  ],

  acerca: [
    {
      target: 'about-erp', title: 'Qué es un ERP',
      body: <p>El dibujo muestra la idea central: todos los módulos conectados a una sola base de datos. Cada operación se registra una vez y el resto se actualiza solo.</p>,
    },
    {
      target: 'about-company', title: 'La empresa simulada',
      body: <p>Materiales del Plata S.R.L. es una empresa ficticia. Estos datos son el tamaño de lo que simula el sistema: artículos, clientes, proveedores, facturas y asientos.</p>,
    },
    {
      target: 'compare', title: 'Comparación con ERP reales',
      body: <p>Qué hace un ERP comercial (SAP, Odoo, Tango, Dynamics) y qué hace esta demostración. Los ERP reales tienen más módulos, impuestos completos y meses de implementación.</p>,
    },
  ],
}
