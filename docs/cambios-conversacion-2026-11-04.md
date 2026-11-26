# Cambios de la conversación (4 y 5 de noviembre de 2026)

Registro de lo hecho en SATET durante esta conversación. El trabajo de pantallas quedó en el frontend. No se modificó el código del API ni `database/schema.sql`. No hay commit.

La sesión del navegador sigue en `admin@satet.local`. Las pruebas de cierre de sesión usaron una cookie aparte y no sacaron al administrador de la pestaña.

---

## 1. Timbres fiscales

Comprar timbre quedó conectado al tabulador legal y a `POST /stamps/purchase`.

- El formulario muestra los conceptos del tabulador, agrupados por artículo.
- Se envían los campos que el API pide, incluido el código del concepto.
- El PDF del timbre se descarga por el uuid y conserva el QR.
- Mis timbres lista los timbres emitidos en la sesión actual. El API no tiene un listado del historial de la cuenta, así que la pantalla no inventa uno.

Archivos nuevos o reescritos:

- `apps/web/src/lib/stamps.js`
- `apps/web/src/lib/server/issued-stamps.js`
- `apps/web/src/lib/server/stamp-qr.js`
- `apps/web/src/routes/(app)/timbres/+page.server.js`
- `apps/web/src/routes/(app)/timbres/+page.svelte`
- `apps/web/src/routes/(app)/timbres/comprar/+page.server.js`
- `apps/web/src/routes/(app)/timbres/comprar/+page.svelte`
- `apps/web/src/routes/(app)/timbres/[uuid]/`

## 2. Pagos

Registrar pago, conciliación y Mis pagos quedaron contra el API de pagos.

- Registrar usa `POST /payments/upload`, con comprobante, referencia, fecha, monto y la cuenta institucional del tributo.
- Conciliación lista pendientes y permite verificar o rechazar. Un 409 se muestra como aviso, no como error genérico.
- Mis pagos lista los pagos de la cuenta y avisa los rechazos.
- El comprobante se abre con el tipo de archivo que devuelve el API.
- Un timbre de otra cuenta se explica en español: no se puede pagar desde aquí.
- La pantalla advierte que la misma referencia no debe repetirse en la misma cuenta institucional.

Archivos:

- `apps/web/src/lib/payments.js`
- `apps/web/src/lib/server/download.js`
- `apps/web/src/routes/(app)/pagos/registrar/+page.server.js`
- `apps/web/src/routes/(app)/pagos/registrar/+page.svelte`
- `apps/web/src/routes/(app)/pagos/conciliacion/+page.server.js`
- `apps/web/src/routes/(app)/pagos/conciliacion/+page.svelte`
- `apps/web/src/routes/(app)/pagos/mios/`
- `apps/web/src/routes/(app)/pagos/[id]/`

## 3. SAREN

Verificar timbre e historial quedaron contra el API.

- Verificar envía oficina y uuid o el contenido del QR.
- La respuesta 200 se traduce: validado y consumido, no encontrado, ya usado o anulado.
- El serial y la oficina se conservan después de enviar, para poder repetir la consulta.
- El historial filtra por el nombre exacto de la oficina. Si la consulta no está permitida, no se muestra un conteo en cero.

Archivos:

- `apps/web/src/routes/(app)/saren/verificar/+page.server.js`
- `apps/web/src/routes/(app)/saren/verificar/+page.svelte`
- `apps/web/src/routes/(app)/saren/historial/+page.server.js`
- `apps/web/src/routes/(app)/saren/historial/+page.svelte`

## 4. Reportes POA

El dashboard usa `GET /reports/revenue-summary`. No se inventan metas ni un porcentaje de cumplimiento: la especificación no define una meta proyectada.

Gráficos añadidos: dona, columnas apiladas, barras horizontales, composición, tendencia y barras agrupadas. El Excel de conciliación y el PDF del informe se descargan por las rutas del API. Un contribuyente recibe 403 en este módulo.

Archivos:

- `apps/web/src/routes/(app)/reportes/+page.server.js`
- `apps/web/src/routes/(app)/reportes/+page.svelte`
- `apps/web/src/routes/(app)/reportes/excel/`
- `apps/web/src/routes/(app)/reportes/pdf/`

## 5. Auditoría

El listado de `GET /audit/logs` quedó en español llano y en tarjetas, no en nombres de tablas.

- Resumen por tipo de movimiento.
- Cada tarjeta dice quién actuó, qué hizo y sobre qué registro.
- Filtros de acción y tabla. Un límite fuera de 1 a 500 responde 400 y la pantalla lo respeta.
- Consultar la auditoría no escribe un movimiento nuevo.

Archivos:

- `apps/web/src/lib/audit.js`
- `apps/web/src/routes/(app)/auditoria/+page.server.js`
- `apps/web/src/routes/(app)/auditoria/+page.svelte`

## 6. Cuentas institucionales, conflictos y vacíos

Cuando el flujo ya cierra, el administrador puede dar de alta la cuenta donde se deposita cada tributo.

- Menú Gestión: Dashboard POA, Cuentas institucionales y Auditoría.
- `POST /bank-accounts` solo con permiso de cuentas. Banco, 20 dígitos y tributo.
- Si el número ya existe, el aviso dice que esa cuenta ya está registrada. No se inserta otra fila.
- SAREN no puede crear cuentas.

Los PDF de planilla que el API rechaza vuelven a la pantalla de origen con un aviso. Eso cubre la planilla minera, la de regalías y la del 1 x 1000. Un fallo al generar el archivo dice «No se pudo generar la planilla.»

También quedaron en aviso, no en error crudo:

- timbre de otro contribuyente al registrar un pago
- referencia repetida, cuando el API la rechaza
- planilla ya aprobada
- segunda regalía del mismo año
- regalías vacías: «Sin regalías declaradas»

Archivos:

- `apps/web/src/lib/navigation.js`
- `apps/web/src/lib/server/pdf.js`
- `apps/web/src/routes/(app)/cuentas/`
- `apps/web/src/routes/(app)/+error.svelte`
- `apps/web/src/routes/(app)/mineria/[id]/planilla/+server.js`
- `apps/web/src/routes/(app)/mineria/regalias/[id]/planilla/+server.js`
- `apps/web/src/routes/(app)/uno-por-mil/cargas/[id]/planilla/+server.js`
- acciones de resolución en minería, regalías, conciliación y 1 x 1000

## 7. Retenciones 1 x 1000

El administrador puede rechazar una carga. El motivo es obligatorio, se recorta y no puede quedar en blanco. Rechazar aplica a toda la carga, no a una orden suelta. Una carga rechazada no imprime planilla. Volver a resolver una carga ya decidida responde 409.

La tabla se reemplazó por un resumen y tarjetas: impuesto retenido, órdenes, pendientes, verificadas y rechazadas. Aprobar queda como botón corto al lado del motivo de rechazo.

Archivos:

- `apps/web/src/routes/(app)/uno-por-mil/+page.server.js`
- `apps/web/src/routes/(app)/uno-por-mil/+page.svelte`

## 8. Verde bosque

La paleta de todo el sistema pasó de vino a verde bosque. Los nombres de las variables siguen siendo `--wine`, `--wine-dark`, `--wine-deep` y `--wine-soft`, porque las pantallas ya las usaban. Cambió el color, no el nombre.

Valores:

- lienzo `#f2f6f3`, superficie `#fbfffc`, tinta `#14211a`
- verde `#1f6b45`, verde oscuro `#174e32`, verde profundo `#0f2e22`, verde suave `#e5f2eb`
- sombras `rgb(15 46 34 / 0.14)`
- portada con degradado `#2d6a4f` a `#0f2e22`
- gráficos: minero `#1f6b45`, 1 x 1000 `#c47b45`, timbre `#1a6b7a`

El rojo de error, el ámbar de pendiente y el verde de aprobado se mantuvieron: distinguen un estado, no la marca. Los fondos beige que quedaban (`#faf6f4`, `#e4d4cd`) pasaron a verdes claros. El icono de la pestaña dejó el logo naranja de Svelte y ahora es una S sobre verde profundo.

Revisado en el navegador, con la sesión de administrador abierta: portada, retenciones y cuentas institucionales.

## 9. Cien pruebas y datos de prueba

Se ejecutaron 100 llamadas al API local (`http://localhost:4390/api/v1`) con el administrador, el verificador SAREN y el contribuyente indicado. No se borró ningún registro previo. El script temporal se eliminó al terminar; no queda en el repositorio y no contiene contraseñas.

Resultado de la corrida completa: **99 correctas, 1 fallida**.

La prueba 075 esperaba que una referencia de pago repetida en la misma cuenta respondiera 409. La base local no tiene la restricción `payments_account_reference_key` que sí está en `database/schema.sql`. El alta respondió 201 y guardó el pago duplicado. No se borró. Tampoco se agregó la restricción: ya existían referencias repetidas de antes y quitarlas no formaba parte de este trabajo.

Datos que quedaron, sin contar lo que ya estaba:

- 9 cuentas «Banco Bosque», tres por tributo (minero, 1 x 1000 y timbre).
- 25 timbres creados desde el 4 de noviembre. Seis quedaron consumidos en la oficina «Oficina Bosque de Prueba».
- 29 órdenes del 1 x 1000 y 23 cargas, con referencias que empiezan por `BQ`. Hay cargas aprobadas y cargas rechazadas con el motivo «Comprobante de prueba BQ1105 ilegible.»
- 6 declaraciones mineras, años 2010 a 2015, material «Arena bosque». Dos aprobadas, una rechazada por volumen inconsistente y el resto pendientes. La planilla de una pendiente respondió 409. La planilla de una aprobada salió en PDF.
- 1 regalía en especie del año 2010, aprobada. Una segunda regalía de ese año respondió 409.
- 9 pagos con referencia `BQ`, entre timbres, 1 x 1000 y minería. Incluye verificados, un rechazo y la referencia repetida de la prueba 075.

La primera corrida se cortó porque el API se reinició a mitad de camino. Las siguientes completaron el resto. Por eso hay más de un juego de cuentas y de órdenes.

### Base local de minería

El alta minera responde 500 porque la tabla local no coincide con `database/schema.sql`. Ese desfase, y la referencia de pago repetida, quedaron sin tocar el API. La explicación y la forma de corregirlos están en `docs/errores-backend-2026-11-05.md`.

## Huecos que siguen

- No hay endpoint para listar todos los timbres de una cuenta. Mis timbres sigue mostrando los de la sesión.
- El cierre de sesión borra la cookie. El token anterior sigue válido si alguien lo reenvía: el API no lo revoca en servidor.
- Retenciones ya no aparece en el menú de SAREN ni de tesorería. Sigue visible para el contribuyente, recaudación y el administrador. Ese ajuste es solo del frontend.
