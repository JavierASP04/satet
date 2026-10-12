# database

- `schema.sql`: fuente de verdad del esquema. Es copia literal del DDL de la sección 2 de `docs/especificacion-satet.md`. Docker lo aplica automáticamente al crear el volumen de PostgreSQL por primera vez.
- `seeds/dev.sql`: datos iniciales de desarrollo. Docker lo aplica justo después del esquema, la primera vez que se crea el volumen.

## Semillas de desarrollo

`seeds/dev.sql` inserta las tres cuentas institucionales del módulo 05 y un administrador. Los números de cuenta son ficticios.

| Dato | Valor |
| --- | --- |
| Administrador | `admin@satet.local` / `SatetAdmin12` (rol `ADMIN_SISTEMA`) |
| Cuenta A | `00000000000000000001`, tipo `MINERO` |
| Cuenta B | `00000000000000000002`, tipo `UN_POR_MIL` |
| Cuenta C | `00000000000000000003`, tipo `TIMBRE_FISCAL` |

La contraseña está hasheada con bcrypt de costo 12. El administrador no tiene expediente de contribuyente.

Para reaplicar el esquema y las semillas desde cero (borra los datos locales):

```bash
npm run db:reset
```

La API accede con `pg` y SQL parametrizado. No hay ORM: `schema.sql` es el esquema que se ejecuta.
