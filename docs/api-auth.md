# Autenticación y contribuyentes (API)

Contrato del módulo 01 para integrar el frontend. La base es `docs/especificacion-satet.md` (sección 1.3, reglas de RIF y aprobación, matriz RBAC).

Prefijo: `/api/v1`. Los errores usan siempre:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Datos inválidos.", "details": {} } }
```

`details` solo aparece cuando aporta datos (validación Zod o el campo en conflicto).

El cliente debe llamar a la API con `credentials: "include"` (o reenviar la cabecera `Cookie` desde el servidor de SvelteKit). CORS solo acepta el origen `WEB_ORIGIN`.

## Cookie de sesión

| Atributo   | Valor                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------- |
| Nombre     | `SESSION_COOKIE_NAME` (por defecto `satet_session`)                                                |
| Contenido  | JWT HS256. El claim `sub` es el `id` del usuario. Caduca según `JWT_EXPIRES_IN` (por defecto `8h`) |
| `HttpOnly` | sí                                                                                                 |
| `Secure`   | variable `SESSION_COOKIE_SECURE` (`true` o `false`). En HTTP local tiene que ser `false`           |
| `SameSite` | `Lax`                                                                                              |
| `Path`     | `/`                                                                                                |
| `Max-Age`  | la misma duración que el JWT                                                                       |

El token no se devuelve en el JSON. En cada petición protegida el servidor verifica la firma y vuelve a leer `users` (rol vigente e `is_active`). Una cuenta desactivada pasa a `401` aunque la cookie no haya caducado.

`SameSite=Lax` cubre el frontend en otro puerto del mismo sitio (`http://localhost:5390` contra `http://localhost:4390`). Si web y API quedan en sitios distintos, el navegador no enviará esta cookie en `fetch` y habrá que cambiar el atributo.

## Cuerpos JSON

Campos en camelCase. El correo se guarda en minúsculas y el RIF en mayúsculas (`J-12345678-9`, `G-12345678-9` o `V-12345678-9`).

La contraseña de registro tiene entre 8 y 72 caracteres. El registro público siempre crea el rol `CONTRIBUYENTE` con `isApproved: false`. No inicia sesión.

No hay columnas para archivos de expediente: el perfil es solo los datos de `taxpayers`. Un usuario interno (analista, tesorería, SAREN, admin) no sale del registro público; hay que insertarlo en `users`.

## Endpoints

### `POST /auth/register`

Público. `201` con `{ user, taxpayer }`.

```json
{
	"email": "empresa@ejemplo.com",
	"password": "una-clave-larga",
	"docType": "RIF_JURIDICO",
	"rifNumber": "J-12345678-9",
	"companyName": "Constructora Trujillo C.A.",
	"commercialDenomination": "Constructora Trujillo",
	"fiscalAddress": "Av. Principal, Valera",
	"phoneNumber": "0271-1234567",
	"legalRepresentativeName": "Ana Pérez",
	"legalRepresentativeDna": "V-12345678"
}
```

`docType`: `RIF_JURIDICO`, `RIF_NATURAL`, `CEDULA`, `PASAPORTE`. `commercialDenomination` es opcional (`null` si se omite o va vacío).

### `POST /auth/login`

Público. Cuerpo: `{ "email", "password" }`.

`200` y `Set-Cookie`. Cuerpo: `{ user, taxpayer }`. `taxpayer` es `null` si el usuario no tiene expediente.

Un contribuyente **puede iniciar sesión antes de la aprobación**. La especificación impide declarar y emitir timbres hasta `isApproved: true`; esos módulos siguen en `501`, así que el bloqueo se aplicará cuando se implementen. La respuesta trae `taxpayer.isApproved` para que la interfaz lo respete.

Correo inexistente, contraseña incorrecta o usuario con `is_active = false`: `401` y el mismo mensaje (`Credenciales inválidas.`).

### `POST /auth/logout`

Público. Borra la cookie y responde `204` sin cuerpo. No hace falta sesión válida. El JWT no se anula en el servidor: si alguien conservó el valor, sigue válido hasta que caduque o el usuario quede inactivo.

### `GET /taxpayers/profile`

Sesión vigente. Cualquier rol (todos tienen permiso de perfil). `200`:

```json
{
	"user": {
		"id": "uuid",
		"email": "empresa@ejemplo.com",
		"role": "CONTRIBUYENTE",
		"isActive": true,
		"createdAt": "2026-10-07T12:00:00.000Z",
		"updatedAt": "2026-10-07T12:00:00.000Z"
	},
	"taxpayer": {
		"id": "uuid",
		"userId": "uuid",
		"docType": "RIF_JURIDICO",
		"rifNumber": "J-12345678-9",
		"companyName": "Constructora Trujillo C.A.",
		"commercialDenomination": "Constructora Trujillo",
		"fiscalAddress": "Av. Principal, Valera",
		"phoneNumber": "0271-1234567",
		"legalRepresentativeName": "Ana Pérez",
		"legalRepresentativeDna": "V-12345678",
		"isApproved": false,
		"approvedBy": null,
		"createdAt": "2026-10-07T12:00:00.000Z",
		"updatedAt": "2026-10-07T12:00:00.000Z"
	}
}
```

Es la comprobación de sesión: si la cookie falta o no vale, `401`.

### `PUT /taxpayers/profile`

Mismos campos que el registro, sin correo ni contraseña. Solo el dueño del expediente, y **solo mientras `isApproved` es false**. `200`: `{ taxpayer }`.

Si ya fue aprobado: `403`. Si el usuario no tiene expediente: `404`.

### `GET /taxpayers/pending`

Rol con permiso de aprobar (`ANALISTA_RECAUDACION` o `ADMIN_SISTEMA`). `200`:

```json
{ "taxpayers": [{ "email": "empresa@ejemplo.com", "isApproved": false }] }
```

Cada elemento es un contribuyente más `email`, del más antiguo al más reciente. Solo `isApproved: false`.

### `PATCH /taxpayers/:id/approve`

El `:id` es el del contribuyente, no el del usuario. Mismo permiso que el listado.

```json
{ "approved": true }
```

`true` marca `is_approved` y guarda `approvedBy` con el id de quien aprueba. `false` deja el expediente pendiente y limpia `approvedBy` (no hay columna de motivo de rechazo). `200`: `{ taxpayer }`.

Si el expediente ya estaba en ese estado, la respuesta es el mismo registro y no se vuelve a auditar. UUID inválido: `400`. Id inexistente: `404`.

## Códigos de error

| HTTP | `code`             | Cuándo                                                                                     |
| ---- | ------------------ | ------------------------------------------------------------------------------------------ |
| 400  | `VALIDATION_ERROR` | Cuerpo, RIF o UUID inválidos. `details` es el árbol de Zod                                 |
| 401  | `UNAUTHORIZED`     | Sin cookie, JWT inválido o caducado, usuario inactivo, o credenciales de login incorrectas |
| 403  | `FORBIDDEN`        | El rol no tiene el permiso, o el expediente aprobado ya no se puede editar                 |
| 404  | `NOT_FOUND`        | Expediente inexistente, o actualización sin expediente                                     |
| 409  | `CONFLICT`         | Correo o RIF duplicados. `details.field` es `email` o `rifNumber`                          |
| 501  | `NOT_IMPLEMENTED`  | Otro módulo, con sesión y permiso válidos                                                  |
| 500  | `INTERNAL_ERROR`   | Fallo no previsto                                                                          |

Las rutas de los demás módulos ya exigen sesión. Sin cookie responden `401`, no `501`.

## Usuario de recaudación en desarrollo

El registro público no crea analistas. Para probar la aprobación, insertar un usuario `ANALISTA_RECAUDACION` (o `ADMIN_SISTEMA`) con una clave bcrypt de costo 12 y luego usar `POST /auth/login`. Ejemplo, con el `.env` de la raíz cargado:

```bash
node --env-file=.env --input-type=module -e "
import bcrypt from 'bcryptjs';
import pg from 'pg';
const email = 'analista@satet.local';
const password = 'analista-dev-12';
const hash = await bcrypt.hash(password, 12);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(
  \"INSERT INTO users (email, password_hash, role) VALUES (\$1, \$2, 'ANALISTA_RECAUDACION') ON CONFLICT (email) DO NOTHING\",
  [email, hash]
);
await client.end();
console.log(email, password);
"
```
