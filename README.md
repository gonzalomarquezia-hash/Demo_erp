# ERP Materiales del Plata

ERP demostrativo para un corralón de materiales de construcción, desarrollado para la Fundación de Altos Estudios en Ciencias Comerciales.

Funciona en el navegador, sin base de datos: al abrirse simula un año completo de operaciones (ventas, compras, cobranzas, pagos, stock y asientos contables) y todo lo que se registre durante la demostración actualiza el sistema en el momento. El botón **Reiniciar demo** vuelve los datos al estado inicial.

## Módulos

- **Tablero de control**: indicadores, ventas contra presupuesto y alertas de gestión.
- **Mando integral**: Cuadro de Mando Integral con las cuatro perspectivas de Kaplan y Norton.
- **Ventas**: circuito comercial, emisión de facturas y efecto de cada venta en todos los módulos.
- **Compras**: circuito con separación de funciones y control de tres vías.
- **Stock**: inventario valorizado a precio promedio ponderado y ficha de stock (kardex).
- **Clientes y cobranzas / Proveedores y pagos**: cuentas corrientes y antigüedad de saldos.
- **Tesorería**: disponibilidades, cheques en cartera y flujo de fondos proyectado.
- **Contabilidad**: libro diario, mayor, balance de sumas y saldos y estados contables.
- **Presupuesto**: simulador de presupuesto económico, financiero y balance proyectado.
- **Auditoría**: pista de auditoría y controles internos.

## Presentación

- **Recorrido guiado**: botón en la barra superior. Se elige qué ver, **una venta** o **una compra**, y el sistema hace la operación en vivo:
  - *Venta* (6 pasos): se carga, se emite la factura y se ve cómo se actualizan stock, cuenta corriente, contabilidad y tablero.
  - *Compra* (7 pasos): arranca con un usuario de otro sector para mostrar el control de separación de funciones, cambia de usuario y recorre orden de compra, recepción, factura con control de tres vías y pago.
- **Explicar pantalla**: botón flotante abajo a la derecha. Explica cada componente del módulo en el que se está (gráficos, indicadores, tablas) y, en algunos, lo muestra en vivo, como el efecto de los plazos en el presupuesto.
- Teclas: se avanza con `Espacio`, `Enter` o `Av Pág` (compatible con punteros de presentación), se retrocede con `Re Pág` y se cierra con `Esc`. En la elección inicial, `C` abre la compra.
- **Modo proyector**: fondo oscuro mate, letra más grande y colores de alto contraste.

## Uso local

```bash
npm install
npm run dev
```

## Publicación en Vercel

1. Entrar a [vercel.com](https://vercel.com) con la cuenta de GitHub.
2. **Add New > Project** e importar este repositorio.
3. Vercel detecta Vite automáticamente (comando `npm run build`, carpeta `dist`). Presionar **Deploy**.

## Versión sin internet

`npm run build:offline` genera un único archivo HTML en la carpeta `offline/`, que se abre con doble clic sin conexión. Hay una copia lista en `offline/ERP-Materiales-del-Plata.html`.
