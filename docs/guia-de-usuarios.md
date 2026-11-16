# Cómo funciona SATET

SATET es el sistema de recaudación de la Gobernación del Estado Trujillo. Todos entran por **Iniciar sesión** con correo y contraseña. La sesión dura 8 horas en ese navegador. **Cerrar sesión** sale y borra la sesión de este equipo.

Hay tres formas de usar el sistema:

1. **Contribuyente.** La empresa o la persona que declara y paga.
2. **Funcionario.** Personal de la Gobernación o del SAREN. No es una sola cuenta: hay tres, y cada una ve un menú distinto.
3. **Administrador.** Decide expedientes, aprueba declaraciones y configura el sistema.

Hasta que el administrador aprueba el expediente, el contribuyente puede entrar y ver su perfil, pero no puede declarar, cargar órdenes ni comprar timbres.

## 1. Contribuyente

Se crea solo. En la pantalla de inicio elige **Crear cuenta de contribuyente**, escribe el correo y la contraseña, y completa el expediente: documento, RIF, razón social, dirección, teléfono y representante legal.

### Qué ve en el menú

- **Mi perfil**
- **Impuesto minero:** Mis declaraciones, Nueva declaración, Regalías
- **Impuesto 1 x 1000:** Retenciones, Cargar órdenes
- **Timbres fiscales:** Mis timbres, Comprar timbre
- **Pagos:** Mis pagos, Registrar pago

### Declarar el impuesto minero

1. Entra a **Nueva declaración**.
2. Elige el período, la actividad y el material, y carga el volumen y el valor.
3. El sistema calcula el impuesto. Si la declaración es después del día 10, o de un período que no es el mes anterior, queda marcada como extemporánea. Igual se puede presentar.
4. Indica la cuenta institucional del tributo minero y registra la transferencia con su referencia y el comprobante.
5. La declaración queda **pendiente** hasta que el administrador la apruebe o la rechace.
6. En **Mis declaraciones** consulta el estado y abre el detalle.

**Regalías** es el mismo tributo minero cuando el pago es en dinero. Si la regalía es en especie, no se paga con transferencia.

### Cargar el impuesto 1 x 1000

Este impuesto es el monto ejecutado de la orden dividido entre 1.000.

1. Entra a **Cargar órdenes**.
2. Escribe los datos de la orden. Se pueden cargar varias en el mismo envío.
3. Elige la cuenta institucional del 1 x 1000. La pantalla muestra banco, número y titular, y el impuesto a pagar.
4. **Copiar datos** copia banco, cuenta de 20 dígitos, titular y monto.
5. Al guardar, la página no se va a otra. **Ver detalles** abre el resumen de la orden o de las órdenes cargadas.
6. En **Retenciones** se ve el estado: pendiente, verificado o rechazado.

### Comprar un timbre fiscal

1. Entra a **Comprar timbre**.
2. Busca el concepto en el tabulador y elige uno. El monto en bolívares sale de los euros del concepto por la tasa del día.
3. Al emitirlo, el tabulador se oculta y queda la ficha del timbre: serial, monto, estado y código QR.
4. Desde esa ficha puede **Descargar PDF**, **Registrar el pago** o **Emitir otro**.
5. **Mis timbres** guarda los timbres emitidos en esta sesión. Al cerrar sesión esa lista del navegador se limpia; el timbre sigue registrado en el sistema.

### Pagar

1. Entra a **Registrar pago**. Si viene desde un timbre recién emitido, la obligación y el monto ya vienen elegidos.
2. Elige la cuenta del tributo. **Copiar datos** copia banco, cuenta, titular y monto a pagar.
3. Escribe el banco de origen, la referencia, la fecha y adjunta el comprobante (imagen o PDF).
4. El pago queda **pendiente** hasta que tesorería lo verifique.
5. En **Mis pagos** se ve el estado. **Ver comprobante** abre el recibo, con los logos de SATET y Gobernación, y el archivo que se cargó. Desde ahí se puede imprimir.

Si tesorería rechaza el pago, el contribuyente ve el motivo. Si el pago era de un timbre y el timbre seguía activo, el timbre queda anulado.

## 2. Funcionario

El administrador crea estas cuentas. El funcionario no llena un expediente. Entra con el correo y la contraseña que le dieron y, en **Mi perfil**, ve su rol y las pantallas a las que tiene acceso.

### Analista de recaudación

Supervisa. No aprueba ni rechaza.

1. Entra a **Extemporáneas** para ver las declaraciones mineras presentadas fuera de lapso. Es una consulta: no cambia el estado.
2. Entra a **Retenciones** para revisar las órdenes del 1 x 1000 y sus montos.
3. Entra a **Dashboard POA** para ver la recaudación del período.

No declara, no carga órdenes, no compra timbres, no concilia pagos y no aprueba expedientes.

### Analista de tesorería

Decide si la transferencia es válida.

1. Entra a **Conciliación**.
2. Filtra por tributo si hace falta: minero, 1 x 1000 o timbre fiscal.
3. Abre **Comprobante** y revisa la referencia, la cuenta destino y el archivo cargado.
4. **Verificar** deja el pago en verificado. Si la declaración, la orden o la regalía seguía pendiente, también pasa a verificada.
5. **Rechazar** pide un motivo. El contribuyente lo ve en su comprobante. Un timbre activo cuyo pago se rechaza queda anulado.

También consulta el **Dashboard POA**. No crea declaraciones ni consume timbres.

### Verificador SAREN

Comprueba el timbre en la notaría o el registro y lo usa una sola vez.

1. Entra a **Verificar timbre**.
2. Escribe la oficina.
3. Escanea el QR o escribe el serial. Si pega el QR, se envía el código completo.
4. Pulsa **Verificar y consumir**.

El resultado puede ser:

- **Consumido.** El timbre era válido, tenía un pago verificado y queda usado en esa oficina. No se puede volver a usar.
- **Sin pago.** No hay un pago verificado. Sale la alerta de pago y el timbre sigue activo. Hay que esperar a que tesorería confirme la transferencia.
- **Ya usado.** El timbre ya se consumió. La alerta dice la fecha y la oficina del primer uso. No cambia.
- **Anulado.** Tesorería rechazó el pago o el timbre ya estaba anulado. No se consume.
- **No existe.** Ese serial no está en SATET.

**Historial** lista los timbres que ya se consumieron.

## 3. Administrador

Entra con la cuenta de administrador. Ve el control del sistema, no el trabajo diario del contribuyente: no aparecen **Mis declaraciones**, **Nueva declaración**, **Regalías**, **Mis timbres** ni **Comprar timbre**.

### Qué ve en el menú

- **Mi perfil**
- **Solicitudes de expediente** y **Verificadores SAREN**
- **Extemporáneas** y **Por aprobar**
- **Retenciones** y **Cargar órdenes**
- **Timbres emitidos**
- **Mis pagos**, **Registrar pago** y **Conciliación**
- **Verificar timbre** e **Historial**
- **Dashboard POA**, **Cuentas institucionales** y **Auditoría**

### Aprobar un expediente

1. Entra a **Solicitudes de expediente**. Son solicitudes de creación de expediente.
2. Revisa contribuyente, RIF y correo.
3. **Aprobar** habilita declaraciones, retenciones y timbres.
4. **Rechazar** pide confirmación y borra los datos de esa solicitud.

### Resolver declaraciones

1. **Por aprobar** lista las declaraciones mineras y las regalías que esperan decisión.
2. Aprueba o rechaza cada una. El 1 x 1000 no se resuelve ahí: se resuelve en **Retenciones**.
3. **Extemporáneas** muestra las declaraciones fuera de lapso. Sirve para verlas; la decisión se toma en **Por aprobar**.

### Seguir los timbres y los pagos

1. **Timbres emitidos** lista todos los timbres, con contribuyente, concepto, euros, bolívares, fecha y estado: activo, consumido o anulado. Desde la fila se abre el PDF.
2. **Conciliación** funciona igual que para tesorería: verificar o rechazar el pago.
3. **Verificar timbre** funciona igual que para el SAREN, incluida la alerta si el timbre no está pagado.

### Configurar el sistema

1. **Verificadores SAREN** crea la cuenta del funcionario del SAREN: correo y contraseña. Esa persona entra sin expediente.
2. **Cuentas institucionales** registra las cuentas de la Gobernación por tributo: minero, 1 x 1000 o timbre. Esas cuentas son las que el contribuyente ve al pagar y las que copia con **Copiar datos**. Antes de eliminar una cuenta, el sistema pide confirmación.
3. **Dashboard POA** muestra la recaudación para el seguimiento de gestión.
4. **Auditoría** guarda quién hizo cada cambio, cuándo y desde dónde.

## Cómo se conectan los tres

Una obligación recorre las tres cuentas en este orden:

1. El **contribuyente** crea el expediente y espera la aprobación.
2. El **administrador** aprueba el expediente.
3. El **contribuyente** declara, carga la orden o emite el timbre, transfiere a la cuenta institucional y registra el pago con el comprobante.
4. El **analista de recaudación** puede revisar lo extemporáneo y las retenciones. No las decide.
5. El **administrador** aprueba o rechaza la declaración minera, la regalía o la retención, cuando corresponda.
6. El **analista de tesorería** verifica o rechaza la transferencia. El administrador también puede hacerlo.
7. En un timbre, el **verificador SAREN** solo lo consume si tesorería ya verificó el pago. Si no, el sistema muestra la alerta y el timbre sigue activo.
