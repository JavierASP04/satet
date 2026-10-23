# Timbres fiscales electrónicos (API)

Contrato del módulo 04 para integrar el frontend. La sesión es la cookie descrita en [`api-auth.md`](api-auth.md). La tasa EUR/VED es la vigente de [`api-bcv.md`](api-bcv.md). Los errores usan el mismo sobre:

```json
{
	"error": {
		"code": "FORBIDDEN",
		"message": "El expediente debe estar aprobado para emitir timbres."
	}
}
```

El inicio de sesión no exige aprobación. Emitir un timbre sí: sin expediente aprobado no hay timbre. La tesorería todavía no interviene: al solicitarlo, el timbre queda emitido con estado `ACTIVO`.

## Cálculo

Bolívares = redondeo a 2 decimales de (euros × tasa vigente).

La tasa es la fila EUR guardada con mayor fecha que no sea posterior a hoy en Caracas. El servidor no vuelve a consultar al BCV en esta operación. Si no hay tasa, no emite.

Ejemplo: 10 euros con tasa `41.2500` producen `412.50` bolívares.

## `POST /api/v1/stamps/purchase`

Sesión vigente, permiso `timbres:comprar` y expediente aprobado.

`CONTRIBUYENTE` y `ADMIN_SISTEMA` tienen ese permiso. Recaudación, tesorería y SAREN reciben `403`. El administrador solo emite si su cuenta tiene un expediente aprobado; si no lo tiene, la respuesta es `404`.

Cuerpo:

```json
{ "amountEur": 10 }
```

`amountEur` es un número JSON mayor que cero, con hasta dos decimales, y como máximo `99999999.99`.

`201`:

```json
{
	"stamp": {
		"id": "6b1e0c3a-1d2f-4a55-9c10-11aa22bb33cc",
		"uuid": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
		"rif": "J-12345678-9",
		"taxpayer": "Constructora Trujillo C.A.",
		"amountEur": "10.00",
		"bcvRate": "41.2500",
		"amountVed": "412.50",
		"issuedAt": "2026-10-23T14:30:00.000Z",
		"status": "ACTIVO",
		"qrPayload": "{\"uuid\":\"f81d4fae-7dec-11d0-a765-00a0c91e6bf6\",\"rif\":\"J-12345678-9\",\"taxpayer\":\"Constructora Trujillo C.A.\",\"amount_eur\":10,\"bcv_rate\":41.25,\"amount_ved\":412.5,\"issued_at\":\"2026-10-23T14:30:00.000Z\",\"sig\":\"…\"}"
	}
}
```

`uuid` es el serial del timbre (UUID v4). `id` es la fila interna. `amountEur` y `amountVed` traen dos decimales; `bcvRate`, cuatro. Son strings. Dentro del QR los montos van como números JSON.

Cada compra crea un timbre nuevo. No reemplaza los anteriores.

## `GET /api/v1/stamps/:uuid/pdf`

Misma sesión y el mismo permiso. `200` con `Content-Type: application/pdf` y `Content-Disposition: attachment`. El archivo se llama `timbre-<uuid>.pdf`.

El PDF trae el serial, el contribuyente, el RIF, los euros, la tasa, los bolívares, la fecha y el estado, más el código QR de `qrPayload`.

Lo descarga el dueño del timbre. El administrador puede descargar cualquiera. Para el resto, un serial ajeno o inexistente responde `404` con el mismo mensaje, para no revelar si el timbre existe.

## Código QR

El texto del QR es un JSON con las claves de la especificación y una firma `sig`:

| Clave        | Contenido                                     |
| ------------ | --------------------------------------------- |
| `uuid`       | Serial                                        |
| `rif`        | RIF del contribuyente                         |
| `taxpayer`   | Razón social, tal como está en el expediente  |
| `amount_eur` | Euros                                         |
| `bcv_rate`   | Tasa aplicada                                 |
| `amount_ved` | Bolívares                                     |
| `issued_at`  | Fecha de emisión en UTC (`issuedAt` del JSON) |
| `sig`        | HMAC-SHA256 en base64url                      |

La firma cubre el JSON de esos campos, sin `sig`, con las claves en el orden de la tabla. El secreto es `JWT_SECRET` del servidor. El navegador no firma ni verifica: muestra el serial y descarga el PDF. Una verificación que cambie un monto, el RIF o el serial tiene que fallar.

## Errores

| HTTP | `code`             | Cuándo                                                                        |
| ---- | ------------------ | ----------------------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR` | Falta el monto, no es un número, no es positivo o trae más de dos decimales   |
| 401  | `UNAUTHORIZED`     | Sin cookie, token inválido o usuario inactivo                                 |
| 403  | `FORBIDDEN`        | Sin permiso, o el expediente todavía no está aprobado                         |
| 404  | `NOT_FOUND`        | No hay expediente, no hay tasa vigente, o el PDF no corresponde a esta sesión |
