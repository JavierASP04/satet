# Declaraciones con comprobante, planillas y regalías

Contrato de lo pedido en la reunión del 22 de octubre de 2026. La sesión sigue siendo la cookie de [`api-auth.md`](api-auth.md). El inicio de sesión no exige aprobación. Declarar minería, uno por mil, regalías o emitir un timbre sí.

Donde este texto y la especificación no coinciden, manda lo acordado en la reunión. Las diferencias quedan al final.

Los montos numéricos de la base salen como texto con dos decimales (`68.00`). Los errores usan el mismo sobre de `error.code` y `error.message`.

## Cuentas institucionales

`GET /api/v1/bank-accounts?taxType=MINERO`

Cualquier sesión. `taxType` puede ser `MINERO`, `UN_POR_MIL` o `TIMBRE_FISCAL`. Sin filtro, devuelve las cuentas activas de todos los tributos.

`200`:

```json
{
	"accounts": [
		{
			"id": "00000000-0000-4000-8000-0000000000a1",
			"bankName": "Banco de Venezuela",
			"accountNumber": "01020000000000000001",
			"accountType": "MINERO",
			"holderName": "Gobernación del Estado Trujillo",
			"isActive": true
		}
	]
}
```

Minería y uno por mil usan Banco de Venezuela. Timbres usan Banco de Venezuela, Banca Amiga y BNC. Los números de 20 dígitos del esquema son de ejemplo.

`POST /api/v1/bank-accounts` lo usa solo el administrador (`cuentas:gestionar`). Cuerpo: `bankName`, `accountNumber` (20 dígitos) y `accountType`. `201`: `{ "account": { ... } }`.

## Comprobante

En minería, uno por mil y regalías en dinero el cuerpo incluye:

```json
{
	"bankReferenceNumber": "12345678",
	"bankAccountId": "00000000-0000-4000-8000-0000000000a1",
	"voucher": {
		"fileName": "pago.pdf",
		"mediaType": "application/pdf",
		"contentBase64": "JVBERi0xLjQ…"
	}
}
```

`mediaType` es `image/jpeg`, `image/png` o `application/pdf`. El contenido, ya decodificado, no pasa de 2 MB y debe coincidir con el tipo. La referencia tiene entre 4 y 100 caracteres. La cuenta tiene que estar activa y ser del tributo: minería y regalías en dinero, `MINERO`; uno por mil, `UN_POR_MIL`. Si no, `400`.

Sin comprobante o sin referencia el envío no se acepta.

## Minería

Alícuotas: extracción 6 %, procesamiento 5 %, producto (`SUBPRODUCTO`) 1 %, premezclado 2 %.

`POST /api/v1/mining/declarations`. Permiso `declaraciones:crear` y expediente aprobado.

```json
{
	"periodYear": 2024,
	"periodMonth": 1,
	"lines": [
		{
			"activityType": "EXTRACCION",
			"materialType": "Arena",
			"volumeCubicMeters": 10,
			"commercialValuePerUnit": 100
		}
	],
	"bankReferenceNumber": "12345678",
	"bankAccountId": "00000000-0000-4000-8000-0000000000a1",
	"voucher": { "fileName": "pago.pdf", "mediaType": "application/pdf", "contentBase64": "…" }
}
```

Hasta 30 materiales. También se acepta una sola línea con `activityType`, `materialType`, `volumeCubicMeters` y `commercialValuePerUnit` en la raíz, más el pago.

El subtotal de cada línea es el redondeo a 2 decimales de volumen × valor × alícuota / 100. `totalVed` es la suma. No hay multa: si el período no es el mes anterior presentado hasta el día 10 en Caracas, `isExtemporaneous` es `true` y la planilla dice «Fuera de tiempo».

`201`: `{ "declaration": { ... } }`. La declaración queda `PENDIENTE`. `subtotalVed` repite el total, para las pantallas que ya leían un solo monto. `lines` trae cada material. `activityType` y el resto de campos de la primera línea se conservan por compatibilidad.

`GET /api/v1/mining/declarations/my` lista las de la cuenta. `GET /api/v1/mining/declarations/pending` lista las que esperan decisión; solo el administrador. `GET /api/v1/mining/declarations/:id` la muestra al dueño, a quien supervisa o a quien resuelve. `GET /api/v1/mining/extemporaneous` exige `declaraciones:supervisar`.

`POST /api/v1/mining/declarations/:id/resolve` lo usa solo el administrador (`declaraciones:resolver`).

```json
{ "decision": "APROBAR" }
```

`RECHAZAR` exige `rejectionReason`. Solo se resuelve desde `PENDIENTE`. Aprobar deja el estado `VERIFICADO` (es el «aprobado» de la reunión). `409` si ya estaba resuelta.

`GET /api/v1/mining/declarations/:id/pdf` devuelve `application/pdf` solo si está `VERIFICADO`. Antes, `409`. El dueño o el administrador. Para el resto, `404`.

## Uno por mil

El impuesto de cada orden es el monto ejecutado dividido entre 1.000, redondeado a 2 decimales. Una carga, de una o de muchas órdenes, comparte comprobante, referencia, cuenta y estado.

`POST /api/v1/one-per-thousand/single` y `POST /api/v1/one-per-thousand/batch`.

La carga individual lleva los campos de la orden (`paymentOrderNumber`, `entityName`, `executedAmountVed`, `executionDate`) junto al pago. El lote lleva `orders` (hasta 100) más el pago.

`201`:

```json
{
	"filingId": "…",
	"totalTaxVed": "3.00",
	"declarations": []
}
```

En la individual, `declaration` en lugar de `declarations`.

`GET /api/v1/one-per-thousand/list` no cambió de forma: cada fila trae además `filingId` y `totalTaxVed`. El `status` es el de la carga.

`POST /api/v1/one-per-thousand/filings/:id/resolve` y `GET /api/v1/one-per-thousand/filings/:id/pdf` siguen la misma regla que minería: solo el administrador resuelve, y el PDF sale después de `VERIFICADO`.

## Regalías

`POST /api/v1/royalties`. El volumen es la suma de los materiales declarados de ese contribuyente y ese año cuya declaración no esté `RECHAZADO`. El contribuyente indica el valor comercial y la forma de pago: `DINERO_TOTAL`, `DINERO_FRACCIONADO` o `ESPECIE`.

El monto es el redondeo a 2 decimales de volumen × valor × 7 / 100. Una regalía por contribuyente y año; la segunda responde `409`.

En dinero, total o fraccionado, hacen falta referencia, cuenta `MINERO` y comprobante. El fraccionado es un solo pago por el monto completo: no hay cuotas. En especie no se piden. Si el año no tiene producción declarada, `400`.

`201`: `{ "royalty": { "volumeCubicMeters": "15.00", "amountVed": "105.00", "status": "PENDIENTE" } }`.

`GET /api/v1/royalties/my` lista las de la cuenta. `GET /api/v1/royalties/pending` lista las que esperan decisión; solo el administrador. `POST /api/v1/royalties/:id/resolve`. `GET /api/v1/royalties/:id/pdf` solo con `VERIFICADO`.

## Cuentas de contribuyente

Rechazar una solicitud pendiente (`PATCH /api/v1/taxpayers/:id/approve` con `{ "approved": false }`) borra el expediente y desactiva el usuario. La respuesta es `{ "deleted": true }`. Solo el administrador tiene `contribuyentes:aprobar`. El detalle está en [`api-auth.md`](api-auth.md).

## Diferencias con la especificación

- La extracción pasó de 10 % a 6 %. Se agregó premezclado al 2 %. Producto es la actividad `SUBPRODUCTO`, al 1 %.
- No se calcula la multa de 1.000 EUR. Solo queda el aviso de fuera de tiempo.
- La planilla se imprime con estado `VERIFICADO`. La deja así el administrador, o tesorería al verificar un pago asociado que todavía estaba pendiente. El rechazo de ese pago bloquea la planilla. Tesorería no revierte una planilla que ya estaba aprobada. El contrato está en [`api-payments.md`](api-payments.md).
- El timbre se emite al comprarlo, con PDF y QR firmado, al precio de una fila del tabulador. El contrato está en [`api-stamps.md`](api-stamps.md). La reunión pedía estados Disponible y Usado; siguen Activo, Consumido y Anulado.
- La transcripción dice «1 %» dentro del módulo titulado uno por mil. Se mantiene el divisor 1.000. Un 1 % multiplicaría el impuesto por diez y contradice el nombre del tributo.
- «Aprobado» es el estado `VERIFICADO` que ya existía.
- Los números de cuenta del esquema son ficticios.
- El SAREN consume el QR una sola vez. El contrato está en [`api-saren.md`](api-saren.md). Un timbre `CONSUMIDO` no se vuelve a verificar.
- Los reportes del POA leen los pagos ya verificados. La meta proyectada no está en la especificación y no se inventa. El contrato está en [`api-reports.md`](api-reports.md).
- El tabulador cargó los múltiplos fijos del tipo de cambio. El PDF no lista exoneraciones. Siguen fuera los porcentajes sobre obra o capital, y el numeral 3 del artículo 36, que no trae cifra. El cambio visual de la aplicación sigue pendiente. Las planillas sí llevan el texto de la Gobernación en verde y el aviso en rojo.
