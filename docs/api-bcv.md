# Tasa oficial BCV (API)

Contrato para el frontend. Cubre la consulta EUR/VED del módulo 04. La emisión de timbres (`POST /stamps/purchase` y el PDF) sigue en `501`.

La sesión es la cookie descrita en [`api-auth.md`](api-auth.md). Los errores usan el mismo sobre:

```json
{ "error": { "code": "NOT_FOUND", "message": "No hay una tasa BCV vigente." } }
```

## Cuándo se guarda

La API consulta [https://www.bcv.org.ve/](https://www.bcv.org.ve/) (bloque `#euro`) y guarda el resultado en `bcv_rates`.

|                |                                                        |
| -------------- | ------------------------------------------------------ |
| Expresión      | `0 18 * * *` (`BCV_RATE_CRON` en `@satet/shared`)      |
| Zona           | `America/Caracas` (UTC−4, sin horario de verano)       |
| Fecha guardada | Día calendario en Caracas en el momento de la consulta |
| Moneda         | Siempre `EUR`                                          |
| Decimales      | 4, redondeo half-up. El BCV publica coma decimal       |

Si el proceso arranca cuando ya pasaron las 18:00 de hoy y ese día no tiene fila, consulta una vez. No repone días anteriores. No hay endpoint para lanzarla a mano.

Una segunda consulta el mismo día no inserta otra fila ni cambia el monto.

## `GET /api/v1/bcv-rate/current`

Sesión vigente y permiso `timbres:comprar`.

Ese permiso lo tienen `CONTRIBUYENTE` y `ADMIN_SISTEMA`. Recaudación, tesorería y SAREN reciben `403`. No hace falta que el contribuyente esté aprobado.

`200`:

```json
{
	"rate": {
		"id": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
		"currency": "EUR",
		"rateInVed": "41.2500",
		"effectiveDate": "2026-10-08",
		"createdAt": "2026-10-08T22:00:01.000Z"
	}
}
```

`rateInVed` es un string con 4 decimales, no un número JSON. `effectiveDate` es `YYYY-MM-DD`.

La vigente es la fila EUR con mayor `effectiveDate` que no sea posterior a hoy en Caracas. Si hoy todavía no hay tasa, se devuelve la anterior más reciente.

| HTTP | `code`         | Cuándo                                          |
| ---- | -------------- | ----------------------------------------------- |
| 401  | `UNAUTHORIZED` | Sin cookie, token inválido o usuario inactivo   |
| 403  | `FORBIDDEN`    | La sesión no tiene permiso para comprar timbres |
| 404  | `NOT_FOUND`    | No hay ninguna tasa con fecha de hoy o anterior |

El frontend no llama al BCV. Solo a este endpoint.
