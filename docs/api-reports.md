# Reportes POA y auditoría (API)

Contrato del módulo 07. La sesión es la cookie de [`api-auth.md`](api-auth.md).

`ANALISTA_RECAUDACION`, `ANALISTA_TESORERIA` y `ADMIN_SISTEMA` tienen `dashboard:poa`. El contribuyente y el verificador SAREN reciben `403` en los tres reportes. Sin sesión, `401`.

La consulta de auditoría es solo del administrador (`auditoria:consultar`).

## Lo que este módulo no calcula

La especificación nombra un gráfico de recaudación mensual frente a la meta proyectada. No trae tabla, periodo ni cifra de esa meta. Estos endpoints no inventan la meta, ni un porcentaje de cumplimiento, ni una cuota por ramo.

Tampoco hay tabulador de timbres. El ramo Timbres es la suma de los pagos `TIMBRE_FISCAL` ya verificados, no una tarifa.

## Qué cuenta como recaudación

Un pago entra al total cuando su estado es `VERIFICADO` y tiene `verified_at`. Ese instante lo escribe la conciliación de [`api-payments.md`](api-payments.md).

El mes es el calendario de `America/Caracas` de `verified_at`. Un pago verificado a las 03:30 UTC del día 1 cae en el mes anterior, porque en Caracas todavía es el día 31.

`PENDIENTE` y `RECHAZADO` no suman. Sí salen en el Excel de conciliación, con su estado.

Una planilla aprobada sin un pago verificado no está en el total: no hay monto cobrado en `payments`.

## `GET /api/v1/reports/revenue-summary`

`200`:

```json
{
	"currency": "VED",
	"totalVed": "85.50",
	"byBranch": [
		{ "taxType": "MINERO", "label": "Minería", "totalVed": "60.00" },
		{ "taxType": "UN_POR_MIL", "label": "1x1000", "totalVed": "15.50" },
		{ "taxType": "TIMBRE_FISCAL", "label": "Timbres", "totalVed": "10.00" }
	],
	"months": [
		{
			"month": "2026-10",
			"totalVed": "70.00",
			"byBranch": [
				{ "taxType": "MINERO", "label": "Minería", "totalVed": "60.00" },
				{ "taxType": "UN_POR_MIL", "label": "1x1000", "totalVed": "0.00" },
				{ "taxType": "TIMBRE_FISCAL", "label": "Timbres", "totalVed": "10.00" }
			]
		}
	]
}
```

`currency` es `VED`. `totalVed` es el acumulado. `byBranch` trae siempre los tres ramos de la especificación, en ese orden; el que no tiene pagos verificados va en `0.00`. `months` solo incluye meses con al menos un pago verificado, del más antiguo al más reciente. `month` es `YYYY-MM`. Los montos son texto con dos decimales.

No hay clave de meta.

## `GET /api/v1/reports/export/excel`

`200` con `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` y `Content-Disposition: attachment; filename="conciliacion.xlsx"`.

Una hoja, `Conciliacion`. Una fila por pago, de cualquier estado, ordenada por fecha de pago. Las celdas son texto. Columnas: fecha de pago, RIF, contribuyente, ramo, referencia, banco de origen, banco destino, cuenta destino, monto VED, estado, motivo de rechazo, verificado en, obligación e identificador. La obligación es `related_kind` y el identificador es `related_id`, vacíos si el pago no está asociado.

## `GET /api/v1/reports/export/pdf`

`200` con `application/pdf` y `filename="informe-gestion.pdf"`.

Repite el total, el desglose por ramo y el desglose por mes. El texto dice que la especificación no define la meta proyectada y que el informe no la compara.

## `GET /api/v1/audit/logs`

Solo `ADMIN_SISTEMA`.

Consulta opcional: `action` y `table` (coincidencia exacta con `action` y `table_affected`), y `limit` de 1 a 500. Si `limit` no viene, son 100. Un límite fuera de rango responde `400`.

`200`:

```json
{
	"total": 2,
	"logs": [
		{
			"id": "6b1e0c3a-1d2f-4a55-9c10-11aa22bb33cc",
			"createdAt": "2026-10-02T12:00:00.000Z",
			"action": "APPROVE",
			"tableAffected": "taxpayers",
			"recordId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
			"userId": "00000000-0000-4000-8000-000000000001",
			"email": "admin@satet.local",
			"ipAddress": "10.0.0.8",
			"userAgent": "prueba",
			"oldValues": { "isApproved": false },
			"newValues": { "isApproved": true }
		}
	]
}
```

`total` es la cantidad que cumple el filtro, aunque `logs` venga recortado por `limit`. El orden es del más reciente al más antiguo. `oldValues` y `newValues` son el JSON guardado; pueden ser `null`. `email` es `null` si la acción no tiene usuario. Esta consulta no modifica la bitácora.
