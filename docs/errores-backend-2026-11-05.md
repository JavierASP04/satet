# Errores que están en el backend

Estos dos fallos salen de la base local, no de la interfaz. El código del API ya está escrito para el esquema de `database/schema.sql`. No hace falta cambiar el controlador: hay que dejar la base igual que ese archivo.

Los registros que ya existen no se borraron.

## 1. Una referencia de pago repetida se guarda

`POST /api/v1/payments/upload` responde 201 cuando la misma cuenta institucional ya tiene esa referencia. El comportamiento esperado es 409, con el texto «Esa referencia ya está registrada en la cuenta institucional.»

El API ya traduce ese caso. En `apps/api/src/lib/db-errors.js`, si PostgreSQL responde `23505` por la restricción `payments_account_reference_key`, el manejador de errores devuelve ese 409. El alta no hace otra comprobación: confía en la base.

En `database/schema.sql` la tabla `payments` declara:

```sql
CONSTRAINT payments_account_reference_key UNIQUE (target_bank_account_id, bank_reference_number)
```

En esta base ese índice no está. Por eso el insert entra. Hoy hay tres grupos repetidos:

| Referencia | Filas | Se puede conservar la más antigua |
| --- | --- | --- |
| `VALUNA0411OK` | 3 | `32ff54b9-203b-4750-bf3e-2840e13c39dc` |
| `BQ491251T1` | 2 | `40704011-2dc3-4df1-825c-7e8378bfd25f` |
| `BQ292480T1` | 2 | `164d27a6-2a65-4384-b1b2-10c6443b4b2d` |

Las otras filas de cada grupo son `ce96194e-a087-43d1-b600-ed25f457d6e1`, `90877b79-a034-46ea-85d2-6f4cf067a085`, `90b6c7c7-acab-4634-9128-bfae3a292671` y `18ea7176-6594-4d49-975d-126fd951d3bf`.

### Cómo solucionarlo

PostgreSQL no crea la restricción mientras existan pares repetidos. Hay que dejar una sola fila por cuenta y referencia. Las copias se pueden borrar o se les puede cambiar `bank_reference_number` para que dejen de coincidir. Conviene conservar la más antigua de cada grupo.

Después:

```sql
ALTER TABLE payments
  ADD CONSTRAINT payments_account_reference_key
  UNIQUE (target_bank_account_id, bank_reference_number);
```

A partir de ahí el API responde 409 solo. No hay que editar `payments.controller.js`.

## 2. La tabla de minería local no es la del esquema

`mining_declarations` en esta base sigue en la forma vieja. El material va en la cabecera y es obligatorio. No tiene cuenta, comprobante ni quién resolvió la declaración.

El API, en `apps/api/src/modules/mining/mining.controller.js`, ya usa la forma nueva de `database/schema.sql`:

- El alta inserta `bank_account_id`, `voucher_file_name`, `voucher_media_type` y `voucher_content`. El material va a `mining_declaration_lines`.
- Aprobar o rechazar escribe `resolved_by` y `resolved_at`.
- La planilla hace `JOIN bank_accounts b ON b.id = d.bank_account_id`.

Con la tabla vieja, eso responde 500: `column "bank_account_id" of relation "mining_declarations" does not exist`. Falla el alta, la resolución y el PDF. El mensaje que ve la pantalla es «No se pudo generar la planilla» o «Error interno del servidor».

Las 8 declaraciones que ya estaban se conservaron. A las 6 de prueba (referencias `BQ`) se les volvió a guardar el material en la cabecera para que la tabla vieja las acepte. Sus líneas siguen en `mining_declaration_lines`. Las 2 anteriores no se tocaron.

### Cómo solucionarlo

Hay que acercar la tabla al `CREATE TABLE` de `database/schema.sql`, sin perder las filas.

1. Copiar el material de la cabecera a `mining_declaration_lines` cuando esa declaración todavía no tenga líneas. Así las 2 declaraciones viejas no se quedan sin material cuando el API lea las líneas.
2. Agregar las columnas que el API ya usa:

```sql
ALTER TABLE mining_declarations
  ADD COLUMN bank_account_id UUID REFERENCES bank_accounts(id),
  ADD COLUMN voucher_file_name VARCHAR(120),
  ADD COLUMN voucher_media_type VARCHAR(40),
  ADD COLUMN voucher_content BYTEA,
  ADD COLUMN resolved_by UUID REFERENCES users(id),
  ADD COLUMN resolved_at TIMESTAMPTZ;
```

3. Dejar de exigir el material en la cabecera, porque el alta nueva no lo escribe ahí:

```sql
ALTER TABLE mining_declarations
  ALTER COLUMN activity_type DROP NOT NULL,
  ALTER COLUMN material_type DROP NOT NULL,
  ALTER COLUMN volume_cubic_meters DROP NOT NULL,
  ALTER COLUMN commercial_value_per_unit DROP NOT NULL,
  ALTER COLUMN applied_tax_rate DROP NOT NULL,
  ALTER COLUMN subtotal_ved DROP NOT NULL;
```

Las declaraciones viejas no tienen `bank_account_id`. La planilla de una pendiente debe responder 409 («La planilla se imprime cuando el administrador aprueba la declaración»). Con el `JOIN` actual, si `bank_account_id` es nulo PostgreSQL no devuelve la fila y el API responde 404, «No se encontró la declaración». Cuando esas filas tengan cuenta, o cuando el `JOIN` pase a `LEFT JOIN` y el estado se revise antes de exigir la cuenta, el 409 vuelve a salir. Ese es el único ajuste de código, y solo hace falta si se quieren imprimir o rechazar con claridad las declaraciones que se crearon sin cuenta.
