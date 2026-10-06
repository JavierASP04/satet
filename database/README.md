# database

- `schema.sql`: fuente de verdad del esquema. Es copia literal del DDL de la sección 2 de `docs/especificacion-satet.md`. Docker lo aplica automáticamente al crear el volumen de PostgreSQL por primera vez.
- `seeds/`: datos iniciales para desarrollo (pendiente; p. ej. cuentas bancarias A/B/C y usuario administrador).

Para reaplicar el esquema desde cero (borra los datos locales):

```bash
npm run db:reset
```

> Pendiente: decidir ORM/migraciones (Prisma o Drizzle) antes del Módulo 01.
