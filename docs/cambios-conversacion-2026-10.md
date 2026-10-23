# Cambios de la conversación (13–20 de octubre de 2026)

Registro de lo hecho en SATET durante esta conversación, en la rama `dev-val`. Nada de esto está commiteado por esta jornada.

La interfaz cubre los módulos 01 a 07. Los servicios reales de esta conversación son el impuesto minero, el presentador del 1 x 1000 y la creación de verificadores SAREN. Pagos, verificación SAREN, reportes y auditoría siguen en pantalla, con una alerta de que son estáticos.

---

## Backend

### Impuesto minero

El listado de `/mineria` devolvía 501 y la pantalla lo mostraba como si la base estuviera caída. El módulo quedó implementado.

Archivos:

- `apps/api/src/modules/mining/mining.schema.js`
- `apps/api/src/modules/mining/mining.controller.js`
- `apps/api/src/modules/mining/mining.routes.js`
- `apps/api/src/lib/present.js` (`toMiningDeclaration`)

Contrato:

- `POST /api/v1/mining/declarations` valida el cuerpo y exige `declaraciones:crear`.
- `GET /api/v1/mining/declarations/my` lista las declaraciones del contribuyente.
- `GET /api/v1/mining/declarations/:id` la ve el dueño o quien tenga `declaraciones:supervisar`. Un uuid inválido responde 404.
- `GET /api/v1/mining/extemporaneous` exige `declaraciones:supervisar`.

Reglas que calcula el servidor:

- Tasas: extracción 10 %, procesamiento 5 %, subproducto 1 %.
- Subtotal: `ROUND(volumen × precio × tasa / 100, 2)`.
- En término solo si, en `America/Caracas`, el día es del 1 al 10 y el período es el mes anterior. El resto queda extemporáneo. No se calcula la multa.
- Períodos futuros responden 400.
- Contribuyente sin aprobar: 403. Cuenta sin expediente: 404 al crear y lista vacía al consultar.
- El estado inicial es `PENDIENTE`.
- Cada alta escribe auditoría `CREATE` sobre `mining_declarations`.

### Presentador del 1 x 1000

El controlador de retenciones ya existía y importa `toOnePerThousand`. Esa exportación se agregó en `apps/api/src/lib/present.js` para que la API vuelva a arrancar.

`toOnePerThousand(row, includeTaxpayer)` devuelve id, contribuyente, número de orden, ente, monto ejecutado, impuesto, fecha de ejecución, estado y fecha de creación. Con el segundo argumento en verdadero agrega razón social y RIF. La fecha de ejecución ya viene como `YYYY-MM-DD`. Los montos se dejan como los entrega PostgreSQL.

### Cuentas de verificador SAREN

El administrador puede crear personal SAREN. Esas cuentas no llevan expediente de contribuyente.

Archivos:

- `apps/api/src/modules/users/users.schema.js`
- `apps/api/src/modules/users/users.controller.js`
- `apps/api/src/modules/users/users.routes.js`
- `apps/api/src/routes.js` monta el router en `/users`
- `packages/shared/src/permissions.js` agrega `USUARIOS_CREAR` (`usuarios:crear`)

Contrato:

- `GET /api/v1/users/verificadores` lista usuarios con rol `VERIFICADOR_SAREN`.
- `POST /api/v1/users/verificadores` recibe correo y contraseña (8 a 72 caracteres). El rol queda fijo en `VERIFICADOR_SAREN`.
- Las dos rutas exigen sesión y `usuarios:crear`. Ese permiso no está en contribuyente, recaudación, tesorería ni SAREN. El administrador lo hereda porque tiene todos los permisos.
- La respuesta no incluye el hash. Un correo repetido responde 409: «Ya existe un usuario con ese correo.»
- La auditoría `CREATE` queda a nombre del administrador que crea la cuenta.

Durante la prueba quedó creada la cuenta `saren.dev@satet.local`.

---

## Frontend

### Escritorio, menú y perfil

- `/panel` saluda según la hora de Caracas, muestra el rol y arma tarjetas con los módulos a los que el rol puede entrar.
- Los grupos del menú con más de un ítem se pliegan. Inicio queda fijo. El grupo de la ruta actual se abre al navegar.
- `/perfil` del contribuyente sin aprobar edita el expediente y lo guarda con `PUT /taxpayers/profile`. Aprobado, el expediente queda solo de lectura.
- Un perfil sin expediente (personal) muestra la cuenta, el estado, las fechas y los accesos de su rol.

### Sistema visual

Pase sobre el cascarón y las pantallas que se habían quedado atrás:

- Barra superior en píldora, con la inicial del correo.
- Área de trabajo a 78 rem.
- Tablas con encabezado `#faf6f4` y fila al pasar el cursor.
- Encabezado de pantalla con línea inferior.
- Fichas de propiedades con título en mayúsculas y divisores.
- Alertas con borde izquierdo.
- «Próximamente» con una franja vinotinto.
- Bienvenida del panel en vinotinto oscuro.
- Tarjetas del inicio con borde y sombra.
- Selección de texto en vinotinto suave.

Archivos: `apps/web/src/app.css`, `+layout.svelte`, `+page.svelte`, `DataTable`, `Placeholder`, `Screen`, `PropertyList`, `Alert`, `panel/+page.svelte`.

### Impuesto minero

Pantallas conectadas al servicio:

- `apps/web/src/lib/mining.js` — etiquetas, montos, período y la misma regla de extemporánea que usa el servidor.
- `/mineria` — tablero con subtotal, cantidad, extemporáneas y pastillas de estado.
- `/mineria/nueva` — período, actividad con la tasa, mineral y base, y un estimado en vivo. Solo si el expediente está aprobado.
- `/mineria/[id]` — ficha y subtotal.
- `/mineria/extemporaneas` — tablero y tabla para supervisión.

### Impuesto 1 x 1000

- `apps/web/src/lib/one-per-thousand.js` — formatos y el impuesto como monto ejecutado / 1.000.
- `/uno-por-mil` — tablero de impuesto retenido, órdenes y monto ejecutado.
- `/uno-por-mil/cargar` — una orden o hasta 100. La fila vacía no cuenta aunque traiga la fecha de hoy. El tope de 100 desactiva «Agregar orden». El servidor recalcula el impuesto.

### Timbres y tasa BCV

La tasa vigente sale de `GET /bcv-rate/current`. El front no consulta al BCV.

- `apps/web/src/lib/bcv.js` y `apps/web/src/lib/server/bcv-rate.js`.
- `/timbres` muestra la tasa en vivo. El listado de timbres es de ejemplo y lo dice la alerta. El botón de PDF no descarga.
- `/timbres/comprar` estima euros a bolívares (1, 5, 10, 20, 50 u otro valor). «Solicitar timbre» no emite ni descarga el PDF.

### Pantallas estáticas

`StaticNotice` avisa: «Pantalla estática. El formulario y los datos de ejemplo no se envían al servicio.» Esas pantallas no llaman a los endpoints que siguen en 501.

- `/pagos/registrar` — tributo, cuenta, banco, referencia, fecha, monto y comprobante. Si el tributo y la cuenta no coinciden, no deja el aviso de guardado.
- `/pagos/conciliacion` — dos pagos de ejemplo. Verificar y rechazar cambian el estado solo en la pantalla.
- `/saren/historial` — tres verificaciones de ejemplo.
- `/reportes` — recaudación de ejemplo de octubre de 2026. Excel y PDF dejan una nota y no descargan.
- `/auditoria` — filtro local sobre cuatro registros de ejemplo.

### Verificar timbre y escáner

`/saren/verificar` sigue estática: «Verificar y consumir» no llama al servicio.

«Escanear QR» abre un modal con la cámara en un cuadro cuadrado y un recuadro blanco para apuntar el código. Cerrar, pulsar fuera o Escape apagan la cámara. Si el QR trae un JSON con `uuid` o un UUID suelto, el serial queda en el campo.

En navegadores con `BarcodeDetector` se usa ese lector. En los demás se usa `jsqr` (dependencia de `@satet/web`). `stopScan` no toca `window` durante el render del servidor.

### Verificadores SAREN

- Menú «Verificadores SAREN» en Contribuyentes, visible con `usuarios:crear`.
- `/usuarios/verificadores` lista las cuentas y crea una con correo y contraseña. El mensaje de éxito nombra el correo. Si falla, el correo vuelve al formulario y la contraseña no.
