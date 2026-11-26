# Cambios pedidos el 12 de noviembre de 2026

Contrato de lo que el documento de requerimientos deja en el sistema. Lo que el documento no cifra queda pendiente y no se inventa.

## Roles

Cinco: `CONTRIBUYENTE`, `PERSONA_NATURAL`, `ANALISTA_RECAUDACION`, `FISCALIZACION`, `ADMIN_SISTEMA`. No hay Tesorería ni SAREN.

La persona natural compra timbres y registra pagos. No declara minería ni el 1 por mil. Recaudación concilia, administra cuentas institucionales y aprueba o rechaza timbres. Fiscalización aprueba expedientes y resuelve declaraciones. El administrador indica la forma de pago de la regalía.

`POST /api/v1/auth/register` acepta `accountKind`: `CONTRIBUYENTE` (omisión) o `PERSONA_NATURAL`.

`GET /api/v1/users/funcionarios` y `POST /api/v1/users/funcionarios` crean Recaudación o Fiscalización. El cuerpo pide `email`, `password` y `role`.

## Regalía

`POST /api/v1/royalties` solo recibe `periodYear` y `extractedSquareMeters`. No pide forma de pago ni comprobante.

El monto es metros cuadrados por el valor comercial promedio de los meses del año que ya tienen volumen declarado, por 7 %. Si ese año no tiene extracción, responde `400`. Un año anterior sin verificar bloquea el siguiente con `409`.

`POST /api/v1/royalties/:id/instruct` es solo del administrador y guarda `paymentForm`: `DINERO_TOTAL`, `DINERO_FRACCIONADO` o `ESPECIE`.

`POST /api/v1/royalties/:id/pay` registra referencia, cuenta y comprobante cuando la forma ya fue indicada y no es en especie. La planilla responde `409` hasta que la regalía esté `VERIFICADO`. Aprobar exige forma de pago y, si no es en especie, la referencia.

## Timbres

La compra nace `SOLICITADO`. `GET /stamps/:uuid/pdf` responde `409` mientras no esté `ACTIVO`.

`POST /stamps/:uuid/resolve` con `decision` `APROBAR` exige un pago `VERIFICADO` de ese timbre. `RECHAZAR` exige `rejectionReason`.

`GET /stamps/public/:uuid` no pide sesión. Devuelve serial, emisión, caducidad, días restantes, concepto, estado y montos. La vigencia es de 15 días desde la emisión: `validityDays` es `15`. El QR impreso abre `/timbres/consulta/{uuid}`. El JSON firmado se guarda y no se publica.

Nadie quedó encargado de pasar un timbre a `CONSUMIDO` después de retirar el SAREN. El estado existe; no hay un endpoint nuevo para marcarlo.

## Lo demás que sí entra

- `GET /taxpayers/alerts` lista expediente, declaraciones, cargas, regalías y pagos pendientes del contribuyente.
- No se declara un mes posterior si hay uno anterior sin verificar o un hueco desde el primer mes declarado por ese contribuyente. El primer período no exige historia previa.
- `PATCH /bank-accounts/:id` edita nombre, número, tipo o si está activa.
- Una referencia bancaria no puede repetirse en pagos, declaraciones, cargas del 1 por mil ni regalías.
- El reporte acepta `grain` (`day`, `week`, `fortnight`, `month`, `year`), `from` y `to`. Incluye `stamps.usersServed`, `stamps.stampsSold` y `stamps.amountCollectedVed`. No hay meta proyectada ni porcentaje del POA.

## Pendiente porque el documento no da el dato

- Acceso desde fuera del país: el sistema ya es web; el despliegue no está en el documento.
- Quién marca un timbre como consumido.
