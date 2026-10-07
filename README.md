# SATET

Sistema Integrado de Recaudación y Control Tributario del Estado Trujillo.

La especificación técnica completa está en [`docs/especificacion-satet.md`](docs/especificacion-satet.md).

> **Estado:** solo existe la estructura inicial del proyecto. Ningún módulo de negocio está implementado: las pantallas son marcadores (`ModulePlaceholder`) y los endpoints de la API responden `501 NOT_IMPLEMENTED`.

## Stack

| Capa          | Tecnología                                                  |
| ------------- | ----------------------------------------------------------- |
| Frontend      | SvelteKit 3 (Svelte 5, JavaScript, `adapter-node`)          |
| Backend       | Node.js + Express 5 (JavaScript)                            |
| Base de datos | PostgreSQL (`pg`, SQL parametrizado, `database/schema.sql`) |
| Colas / caché | Redis                                                       |
| Compartido    | `@satet/shared`: roles, permisos RBAC, enums y constantes   |

## Estructura

```
satet/
├── apps/
│   ├── api/                  # API REST (Express 5)
│   │   └── src/
│   │       ├── config/       # Variables de entorno validadas con Zod
│   │       ├── db/           # Pool de PostgreSQL
│   │       ├── lib/          # Utilidades HTTP (errores, respuesta 501)
│   │       ├── middleware/   # authenticate, authorize (RBAC), validate, errores
│   │       ├── modules/      # Un directorio por recurso: *.routes.js + *.controller.js
│   │       └── routes.js     # Montaje de módulos bajo /api/v1
│   └── web/                  # Frontend SvelteKit
│       └── src/
│           ├── lib/          # navigation.js, components/, server/api.js
│           └── routes/
│               ├── (auth)/   # login, registro
│               └── (app)/    # Pantallas de cada módulo
├── packages/
│   └── shared/               # @satet/shared
├── database/
│   ├── schema.sql            # Fuente de verdad del esquema
│   └── seeds/
├── docs/
│   └── especificacion-satet.md
├── docker-compose.yml        # PostgreSQL + Redis
└── .env.example
```

## Requisitos

- Node.js **22.17 o superior** (con 22.14 funciona, pero npm muestra avisos `EBADENGINE`).
- npm 10+
- Docker y Docker Compose (para PostgreSQL y Redis).

## Puesta en marcha

```bash
# 1. Variables de entorno (un único .env en la raíz, compartido por web y api)
cp .env.example .env

# 2. Dependencias de todo el monorepo
npm install

# 3. PostgreSQL (puerto 5433) y Redis (puerto 6380)
npm run db:up

# 4. Web y API en paralelo
npm run dev
```

| Servicio   | URL / puerto                             |
| ---------- | ---------------------------------------- |
| Web        | http://localhost:5390                    |
| API        | http://localhost:4390/api/v1             |
| Salud API  | http://localhost:4390/api/health         |
| PostgreSQL | `localhost:5433` (usuario/clave `satet`) |
| Redis      | `localhost:6380`                         |

El esquema `database/schema.sql` se aplica automáticamente la primera vez que se crea el volumen de PostgreSQL. Para reaplicarlo desde cero: `npm run db:reset` (borra los datos locales).

## Scripts (raíz)

| Script             | Descripción                                         |
| ------------------ | --------------------------------------------------- |
| `npm run dev`      | Levanta API y web en paralelo                       |
| `npm run dev:api`  | Solo la API (`node --watch`)                        |
| `npm run dev:web`  | Solo la web (Vite)                                  |
| `npm run build`    | Compila la web para producción                      |
| `npm run check`    | `node --check` en los workspaces                    |
| `npm run format`   | Formatea con Prettier                               |
| `npm run db:up`    | Inicia PostgreSQL y Redis                           |
| `npm run db:down`  | Detiene los contenedores                            |
| `npm run db:reset` | Elimina volúmenes y vuelve a crear la base de datos |

## Módulos y endpoints

Cada endpoint ya está declarado con su middleware de autenticación y permiso RBAC, y responde `501` hasta que se implemente.

| Módulo                            | Web                                                                     | API (`/api/v1`)                                                                                     |
| --------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 01 Contribuyentes y autenticación | `/login`, `/registro`, `/perfil`, `/contribuyentes/pendientes`          | `auth/register`, `auth/login`, `taxpayers/profile`, `taxpayers/pending`, `taxpayers/:id/approve`    |
| 02 Impuesto minero                | `/mineria`, `/mineria/nueva`, `/mineria/[id]`, `/mineria/extemporaneas` | `mining/declarations`, `mining/declarations/my`, `mining/declarations/:id`, `mining/extemporaneous` |
| 03 Impuesto 1 x 1000              | `/uno-por-mil`, `/uno-por-mil/cargar`                                   | `one-per-thousand/batch`, `one-per-thousand/single`, `one-per-thousand/list`                        |
| 04 Timbres y tasa BCV             | `/timbres`, `/timbres/comprar`                                          | `stamps/purchase`, `stamps/:uuid/pdf`, `bcv-rate/current`                                           |
| 05 Pagos y conciliación           | `/pagos/registrar`, `/pagos/conciliacion`                               | `payments/upload`, `payments/pending`, `payments/:id/verify`, `payments/:id/reject`                 |
| 06 Verificación SAREN             | `/saren/verificar`, `/saren/historial`                                  | `saren/verify-stamp`, `saren/history`                                                               |
| 07 Reportes, auditoría y POA      | `/panel`, `/reportes`, `/auditoria`                                     | `reports/revenue-summary`, `reports/export/excel`, `reports/export/pdf`, `audit/logs`               |

## Notas de SvelteKit 3

- El alias de `src/lib` es `#lib` (campo `imports` de `package.json`), no `$lib`. Los módulos JS se importan con extensión: `#lib/navigation.js`.
- Las variables de entorno se declaran en `apps/web/src/env.js` con `defineEnvVars` y se importan desde `$app/env/private` / `$app/env/public`.
- shadcn-svelte aún no reconoce `#lib`, por eso no está instalado.

## Pendiente

- Decidir ORM/migraciones (Prisma o Drizzle) antes del Módulo 01.
- Implementar los módulos en el orden de la sección 5 de la especificación, empezando por autenticación y RBAC.
