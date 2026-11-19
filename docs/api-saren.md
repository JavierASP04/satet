# Verificación SAREN del timbre (API)

Contrato del módulo 06. La sesión es la cookie de [`api-auth.md`](api-auth.md). El timbre se emite como está en [`api-stamps.md`](api-stamps.md): nace `ACTIVO`. Este módulo solo lo pasa a `CONSUMIDO`, una vez.

`VERIFICADOR_SAREN` y `ADMIN_SISTEMA` tienen `timbres:consumir`. El resto recibe `403`. Sin sesión, `401`.

Un serial que no existe, un timbre ya consumido y un timbre anulado responden `200`. El resultado va en `success`, `code` y `message`. No usan el sobre `error`. El segundo consumo es una verificación fallida: el timbre sigue consumido, con la misma fecha y la misma oficina.

Tesorería ya puede dejar un timbre `ANULADO` al rechazar su pago, si todavía estaba `ACTIVO`. Este módulo no lo reactiva ni lo vuelve a consumir.

## `POST /api/v1/saren/verify-stamp`

```json
{
	"officeName": "Registro Principal de Trujillo",
	"qrPayload": "{\"uuid\":\"…\",\"sig\":\"…\"}"
}
```

`officeName` tiene de 2 a 255 caracteres. Hace falta `uuid` o `qrPayload`. Pueden ir los dos; el serial del cuerpo tiene que ser el del QR.

Si el texto del QR no verifica la firma, o el QR firmado no es el que está guardado en ese timbre, la respuesta es `400` con `VALIDATION_ERROR` y el timbre no cambia. Escribir solo el serial no exige la firma: el funcionario puede teclear `uuid_code`.

`200`, timbre `ACTIVO`:

```json
{
	"success": true,
	"code": "VALIDATED_AND_CONSUMED",
	"message": "Timbre fiscal VÁLIDO. Ha sido marcado como CONSUMIDO en este momento.",
	"data": {
		"uuid": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
		"rif": "J-12345678-9",
		"taxpayer": "Constructora Trujillo C.A.",
		"amountEur": "10.00",
		"bcvRate": "41.2500",
		"amountVed": "412.50",
		"issuedAt": "2026-10-23T18:30:00.000Z",
		"status": "CONSUMIDO",
		"consumedAt": "2026-10-30T15:04:00.000Z",
		"officeName": "Registro Principal de Trujillo",
		"consumedBy": "6b1e0c3a-1d2f-4a55-9c10-11aa22bb33cc"
	}
}
```

`rif` y `taxpayer` son los que quedaron firmados al emitir, no un cambio posterior del expediente. `consumedBy` es el usuario del SAREN.

`200`, sin fila:

```json
{
	"success": false,
	"code": "NOT_FOUND",
	"message": "El timbre fiscal no existe en los registros oficiales."
}
```

`200`, ya `CONSUMIDO`. La fecha es la del primer consumo, en ISO, y la oficina es la que lo consumió:

```json
{
	"success": false,
	"code": "ALREADY_USED",
	"message": "ALERTA DE REUTILIZACIÓN: Este timbre ya fue consumido el 2026-10-30T15:04:00.000Z en la oficina Registro Principal de Trujillo."
}
```

`200`, `ANULADO`:

```json
{
	"success": false,
	"code": "ANNULLED",
	"message": "Este timbre fiscal fue anulado previamente."
}
```

El consumo y el intento sobre un timbre ya consumido o anulado quedan en la auditoría, con acción `CONSUME` o `REJECT`. Un serial inexistente o un QR inválido no se auditan.

## `GET /api/v1/saren/history`

Lista timbres `CONSUMIDO`, del más reciente al más antiguo. `officeName` filtra por el nombre exacto de la oficina. `limit` va de 1 a 500; si no viene, son 100.

`200`: `{ "verifications": [ { "uuid": "…", "officeName": "…", "consumedAt": "…", "consumedByEmail": "saren@satet.local", "status": "CONSUMIDO" } ] }`.
