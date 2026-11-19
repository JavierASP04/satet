# Conciliación de pagos (API)

Contrato del módulo 05. La sesión es la cookie de [`api-auth.md`](api-auth.md). El inicio de sesión no exige aprobación. Registrar un pago sí: hace falta un expediente aprobado.

Tesorería (`ANALISTA_TESORERIA`) y el administrador tienen `pagos:conciliar`. El contribuyente y el administrador tienen `pagos:registrar`. Recaudación no registra ni concilia.

El pago nace `PENDIENTE`. Verificar lo deja `VERIFICADO`. Rechazar lo deja `RECHAZADO` y guarda el motivo. No vuelve atrás.

Si el pago señala una obligación que todavía está `PENDIENTE`, verificarla la aprueba y rechazarla la deja `RECHAZADO` (la planilla no se imprime). Si esa obligación ya estaba `VERIFICADO`, el rechazo del pago responde `409` y no la revierte: el administrador pudo haberla aprobado antes. Un timbre `ACTIVO` asociado a un pago rechazado pasa a `ANULADO`. Un timbre ya `CONSUMIDO` no se anula por este rechazo.

El timbre sigue emitiéndose al comprarlo. Este módulo no cambia esa emisión; solo la revoca cuando el pago asociado se rechaza y el timbre no se ha consumido.

Los errores usan el sobre `error.code` y `error.message`. Los montos salen como texto con dos decimales.

## `POST /api/v1/payments/upload`

```json
{
	"taxType": "MINERO",
	"bankAccountId": "00000000-0000-4000-8000-0000000000a1",
	"bankReferenceNumber": "87654321",
	"originBank": "Banesco",
	"paymentDate": "2026-10-29",
	"amountPaidVed": 60,
	"voucher": {
		"fileName": "pago.pdf",
		"mediaType": "application/pdf",
		"contentBase64": "JVBERi0xLjQ…"
	},
	"relatedKind": "MINING_DECLARATION",
	"relatedId": "6b1e0c3a-1d2f-4a55-9c10-11aa22bb33cc"
}
```

`taxType` es `MINERO`, `UN_POR_MIL` o `TIMBRE_FISCAL`. La cuenta tiene que estar activa y ser de ese tributo. La referencia, de 4 a 100 caracteres, no se repite en la misma cuenta. La fecha no puede ser futura. El comprobante es JPEG, PNG o PDF de hasta 2 MB, igual que en las declaraciones.

`relatedKind` y `relatedId` van juntos o no van. Los tipos son `MINING_DECLARATION`, `ONE_PER_THOUSAND_FILING`, `MINING_ROYALTY` y `ELECTRONIC_STAMP`. En el timbre, `relatedId` es el serial (`uuid`), no el id interno. El monto tiene que coincidir con el total de la obligación. La regalía en especie no se asocia a una transferencia. No puede haber otro pago pendiente o verificado de la misma obligación.

`201`: `{ "payment": { "status": "PENDIENTE", "amountPaidVed": "60.00", ... } }`.

## `GET /api/v1/payments/pending`

Solo conciliación. Query opcional `taxType`. `200`: `{ "payments": [ ... ] }`, del más antiguo al más reciente. Solo `PENDIENTE`.

## `GET /api/v1/payments/mine`

Los pagos de la cuenta que registra. Incluye `notice` cuando el pago fue rechazado: asunto, texto y fecha del aviso.

## `GET /api/v1/payments/:id` y `GET /api/v1/payments/:id/voucher`

El dueño o quien concilia. Para el resto, `404`. El comprobante se descarga con el tipo declarado y `Content-Disposition: attachment`.

## `PATCH /api/v1/payments/:id/verify`

Sin cuerpo. `200`: `{ "payment": { "status": "VERIFICADO" } }`. Si ya estaba conciliado, `409`.

## `PATCH /api/v1/payments/:id/reject`

```json
{ "rejectionReason": "La referencia no aparece en el banco." }
```

`200`: `{ "payment": { "status": "RECHAZADO", "notice": { "subject": "…", "body": "…" } }, "notice": { ... } }`.

El aviso queda guardado para el correo del contribuyente. El texto incluye la referencia, el monto y el motivo. No hay servidor de correo en este corte: el aviso es el registro que tesorería y el contribuyente consultan.
