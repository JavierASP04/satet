# PLAN DE TRABAJO Y ESPECIFICACIÓN TÉCNICA DE REQUERIMIENTOS (SRS)
## SISTEMA INTEGRADO DE RECAUDACIÓN Y CONTROL TRIBUTARIO DEL ESTADO TRUJILLO (SATET)

---

### INSTRUCCIONES GENERALES PARA EL AGENTE DE CODIFICACIÓN (AI CODING ASSISTANT)
> **Rol:** Actúa como Ingeniero Lead Software Architect y Desarrollador Full-Stack Senior.  
> **Misión:** Desarrollar el sistema web **SATET** (Sistema Integrado de Recaudación y Control Tributario) cumpliendo estrictamente con la arquitectura, esquemas de base de datos, reglas de negocio, endpoints y componentes frontend definidos en este documento.  
> **Criterios de Calidad:**
> 1. Código limpio, modular, desacoplado y fuertemente tipado.
> 2. Implementación de seguridad OWASP Top 10 (Sanitización de entradas, prevención de SQL Injection, XSS, CSRF, JWT/Session tokens y cifrado TLS).
> 3. Trazabilidad total de auditoría en cada operación mutativa (`CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `REJECT`).
> 4. Adherencia estricta a los modelos de dominio y flujos de estado definidos (no omitir ninguna validación ni regla de negocio).

---

## 1. ARQUITECTURA Y STACK TECNOLÓGICO RECOMENDADO

* **Backend Framework:** Laravel 11.x (PHP 8.3+) o Node.js (TypeScript) con NestJS / Express.
* **Frontend Framework:** React 18+ (TypeScript) con TailwindCSS y Shadcn UI o Vue 3 (Options/Composition API).
* **Base de Datos:** PostgreSQL 16+ con extensión PostGIS (opcional para geolocalización minera) o MySQL 8.0+.
* **Motor de Tareas / Queues:** Redis (para procesamiento diferido de generación de PDFs, envío de correos y syncing de tasa BCV).
* **Librerías de Utilidad:**
  * Generación de PDF: Dompdf / Snappy / Puppeteer.
  * Generación de QR: `SimpleSoftwareIO/QrCode` o `qrcode` (NodeJS).
  * Generación de UUID: UUID v4 para seriales únicos.
  * Gráficos/Dashboard: Chart.js / Recharts.

---

## 2. ESQUEMA GLOBAL DE BASE DE DATOS (RELATIONAL ENTITY SCHEMA)

Below is the DDL SQL structure representing the core relational data model for SATET:

```sql
-- ENUMS DEFINITION
CREATE TYPE user_role AS ENUM ('CONTRIBUYENTE', 'ANALISTA_RECAUDACION', 'ANALISTA_TESORERIA', 'VERIFICADOR_SAREN', 'ADMIN_SISTEMA');
CREATE TYPE doc_type AS ENUM ('RIF_JURIDICO', 'RIF_NATURAL', 'CEDULA', 'PASAPORTE');
CREATE TYPE tax_type AS ENUM ('MINERO', 'UN_POR_MIL', 'TIMBRE_FISCAL');
CREATE TYPE payment_status AS ENUM ('PENDIENTE', 'VERIFICADO', 'RECHAZADO');
CREATE TYPE stamp_status AS ENUM ('ACTIVO', 'CONSUMIDO', 'ANULADO');
CREATE TYPE mining_activity AS ENUM ('EXTRACCION', 'PROCESAMIENTO', 'SUBPRODUCTO');

-- 1. TABLE: USERS & RBAC
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'CONTRIBUYENTE',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLE: CONTRIBUYENTES (PROFILE)
CREATE TABLE taxpayers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    doc_type doc_type NOT NULL,
    rif_number VARCHAR(20) UNIQUE NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    commercial_denomination VARCHAR(255),
    fiscal_address TEXT NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    legal_representative_name VARCHAR(255) NOT NULL,
    legal_representative_dna VARCHAR(20) NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABLE: BANK ACCOUNTS (CUENTAS INSTITUCIONALES)
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(20) UNIQUE NOT NULL,
    account_type tax_type NOT NULL, -- Minero, 1x1000, Timbre
    holder_name VARCHAR(255) NOT NULL DEFAULT 'Gobernación del Estado Trujillo',
    holder_rif VARCHAR(20) NOT NULL DEFAULT 'G-200001234',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLE: BCV EXCHANGE RATES (HISTÓRICO TASA EURO/USD)
CREATE TABLE bcv_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency VARCHAR(10) NOT NULL DEFAULT 'EUR',
    rate_in_ved NUMERIC(12, 4) NOT NULL,
    effective_date DATE UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLE: MINING DECLARATIONS (MÓDULO 2)
CREATE TABLE mining_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taxpayer_id UUID NOT NULL REFERENCES taxpayers(id),
    period_year INT NOT NULL,
    period_month INT NOT NULL, -- 1 to 12
    activity_type mining_activity NOT NULL,
    material_type VARCHAR(100) NOT NULL, -- Arena, Grava, Arcilla, etc.
    volume_cubic_meters NUMERIC(12, 2) NOT NULL,
    commercial_value_per_unit NUMERIC(12, 2) NOT NULL,
    applied_tax_rate NUMERIC(5, 2) NOT NULL, -- 10.00, 5.00, 1.00
    subtotal_ved NUMERIC(15, 2) NOT NULL,
    is_extemporaneous BOOLEAN DEFAULT FALSE, -- Flag si > día 10
    declaration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status payment_status DEFAULT 'PENDIENTE'
);

-- 6. TABLE: ONE_PER_THOUSAND DECLARATIONS (MÓDULO 3)
CREATE TABLE one_per_thousand_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taxpayer_id UUID NOT NULL REFERENCES taxpayers(id),
    payment_order_number VARCHAR(100) NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    executed_amount_ved NUMERIC(15, 2) NOT NULL,
    tax_amount_ved NUMERIC(15, 2) NOT NULL, -- executed_amount / 1000
    execution_date DATE NOT NULL,
    status payment_status DEFAULT 'PENDIENTE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLE: ELECTRONIC STAMPS (MÓDULO 4 & 6)
CREATE TABLE electronic_stamps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid_code VARCHAR(36) UNIQUE NOT NULL, -- Serial único UUID v4
    taxpayer_id UUID NOT NULL REFERENCES taxpayers(id),
    amount_eur NUMERIC(10, 2) NOT NULL,
    bcv_rate_applied NUMERIC(12, 4) NOT NULL,
    amount_ved NUMERIC(15, 2) NOT NULL,
    qr_payload TEXT NOT NULL,
    status stamp_status DEFAULT 'ACTIVO',
    consumed_at TIMESTAMP WITH TIME ZONE,
    consumed_by_saren_user UUID REFERENCES users(id),
    saren_office_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABLE: PAYMENTS & VOUCHERS (MÓDULO 5)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taxpayer_id UUID NOT NULL REFERENCES taxpayers(id),
    tax_type tax_type NOT NULL,
    target_bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    bank_reference_number VARCHAR(100) NOT NULL,
    origin_bank VARCHAR(100) NOT NULL,
    payment_date DATE NOT NULL,
    amount_paid_ved NUMERIC(15, 2) NOT NULL,
    voucher_file_path VARCHAR(512) NOT NULL,
    status payment_status DEFAULT 'PENDIENTE',
    rejection_reason TEXT,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABLE: AUDIT LOGS (MÓDULO 7)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    table_affected VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. ESPECIFICACIÓN DETALLADA DE MÓDULOS Y REQUERIMIENTOS

---

### MÓDULO 01: CONTRIBUYENTES Y AUTENTICACIÓN (RBAC)

#### 1.1 Descripción
Módulo encargado del autoregistro de empresas/entes, gestión de expedientes legales, aprobación de usuarios por parte de Recaudación y control de acceso basado en roles (RBAC).

#### 1.2 Matriz CRUD
| Entidad | Create | Read | Update | Delete | Aprobación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Usuarios** | Registro público | Admin / Self | Self / Admin | Soft delete | Admin |
| **Contribuyentes** | Autoregistro | Analista / Self | Self (Si no aprobado) | Admin | Analista Recaudación |

#### 1.3 Endpoints REST API
```
POST   /api/v1/auth/register            -> Registro inicial de contribuyente
POST   /api/v1/auth/login               -> Autenticación JWT / Session
GET    /api/v1/taxpayers/profile        -> Perfil del usuario autenticado
PUT    /api/v1/taxpayers/profile        -> Actualizar perfil/documentos
GET    /api/v1/taxpayers/pending        -> (Analista) Listar solicitudes pendientes
PATCH  /api/v1/taxpayers/:id/approve    -> (Analista) Aprobar/Rechazar expediente
```

#### 1.4 Reglas de Negocio
1. **Verificación Previa de RIF:** Formato válido de RIF (`J-12345678-9`, `G-12345678-9`, `V-12345678-9`).
2. **Bloqueo Operativo:** Un contribuyente registrado **NO puede declarar ni emitir timbres** hasta que un Analista de Recaudación revise su expediente y marque `is_approved = TRUE`.
3. **Cifrado de Claves:** bcrypt con factor de costo de al menos 12.

---

### MÓDULO 02: IMPUESTO MINERO (EXTRACCIÓN, PROCESAMIENTO Y SUBPRODUCTOS)

#### 2.1 Descripción
Gestión de la declaración jurada mensual para la explotación y comercialización de minerales no metálicos (arena, piedra, arcilla, granzón).

#### 2.2 Matriz CRUD
| Entidad | Create | Read | Update | Delete |
| :--- | :--- | :--- | :--- | :--- |
| **Declaración Minera** | Contribuyente | Self / Analista | No permitida si enviada | Admin (Solo anulación) |

#### 2.3 Regla de Cálculo Matemático
Para cada renglón de la declaración, se aplica la siguiente fórmula:

$$\text{Subtotal VED} = \text{Volumen } (m^3) \times \text{Precio Comercial Unitario (VED)} \times \left(\frac{\text{Alícuota (\%)}}{100}\right)$$

**Alícuotas Legales Configurables:**
* **Extracción:** $10.00\%$
* **Procesamiento:** $5.00\%$
* **Subproductos:** $1.00\%$

#### 2.4 Control de Extemporaneidad
* **Lapso Declarativo:** Primeros 10 días continuos de cada mes (ej. Declaración de Enero se declara del 1 al 10 de Febrero).
* **Regla del Día 11:** Si `current_date > 10`, el atributo `is_extemporaneous` se establece en `TRUE`.
* **Procesamiento de Multa:** El sistema **NO calcula la multa automáticamente** en la planilla de pago. En su lugar, el sistema genera una marca de alerta para el módulo de Fiscalización (Sanción legal establecida: $1.000\text{ EUR}$ a procesar vía expediente).

#### 2.5 Endpoints REST API
```
POST   /api/v1/mining/declarations      -> Crear declaración mensual
GET    /api/v1/mining/declarations/my   -> Listar mis declaraciones
GET    /api/v1/mining/declarations/:id  -> Detalle de declaración
GET    /api/v1/mining/extemporaneous    -> (Recaudación) Reporte de extemporáneos
```

---

### MÓDULO 03: IMPUESTO DEL 1 POR 1000

#### 3.1 Descripción
Módulo de retención aplicable a entes públicos (Gobernación, Alcaldías, Institutos) y entidades bancarias sobre ejecuciones de órdenes de pago a proveedores.

#### 3.2 Matriz CRUD
| Entidad | Create | Read | Update | Delete |
| :--- | :--- | :--- | :--- | :--- |
| **Retención 1x1000** | Ente Público / Banco | Self / Analista | Editar borrador | Anulación con causa |

#### 3.3 Regla de Cálculo Matemático
$$\text{Impuesto 1x1000 (VED)} = \frac{\text{Monto Ejecutado en Orden de Pago (VED)}}{1000}$$

*Ejemplo:* Para una orden de pago ejecutada de $\text{Bs. } 500.000,00$:
$$\text{Impuesto} = \frac{500.000}{1000} = \text{Bs. } 500,00$$

#### 3.4 Endpoints REST API
```
POST   /api/v1/one-per-thousand/batch    -> Carga masiva de órdenes de pago
POST   /api/v1/one-per-thousand/single   -> Carga individual de orden de pago
GET    /api/v1/one-per-thousand/list     -> Listar retenciones registradas
```

---

### MÓDULO 04: TIMBRES FISCALES ELECTRÓNICOS Y INTEGRACIÓN BCV

#### 4.1 Descripción
Generación de timbres fiscales electrónicos en PDF con código QR y serial único de seguridad.

#### 4.2 Integración con Tasa Oficial BCV
El sistema ejecutará un Cron Job diario a las 18:00 hrs para consultar el tipo de cambio oficial Euro/VED publicado por el Banco Central de Venezuela.

$$\text{Monto en Bolívares (VED)} = \text{Monto del Timbre en Euros (EUR)} \times \text{Tasa BCV del Día}$$

#### 4.3 Generación del Código QR y Payload
El QR impreso en el documento PDF debe contener un payload cifrado o firmado que codifique la siguiente estructura JSON:

```json
{
  "uuid": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
  "rif": "J-30012345-0",
  "taxpayer": "CONSTRUCTORA TRUJILLO C.A.",
  "amount_eur": 10.00,
  "bcv_rate": 41.2500,
  "amount_ved": 412.50,
  "issued_at": "2026-10-15T10:30:00Z"
}
```

#### 4.4 Endpoints REST API
```
POST   /api/v1/stamps/purchase           -> Solicitar emisión de timbre
GET    /api/v1/stamps/:uuid/pdf          -> Descargar PDF oficial de timbre
GET    /api/v1/bcv-rate/current          -> Consultar tasa EUR/VED activa
```

---

### MÓDULO 05: VALIDACIÓN DE PAGOS Y CONCILIACIÓN BANCARIA

#### 5.1 Descripción
Módulo utilizado por los contribuyentes para registrar sus váuchers de transferencia y por el equipo de **Tesorería / Administración** para validar el ingreso efectivo en cuentas institucionales.

#### 5.2 Estructura de Cuentas Separadas
El sistema validará que cada pago se asocie estrictamente a la cuenta correspondiente:
* **Cuenta A:** Exclusiva para *Impuestos Mineros*.
* **Cuenta B:** Exclusiva para *Impuesto 1 por 1000*.
* **Cuenta C:** Exclusiva para *Timbres Fiscales*.

#### 5.3 Máquina de Estados de Pago
```
                 ┌──────────────────────────┐
                 │    PAGO REGISTRADO       │
                 │   (status = PENDIENTE)   │
                 └────────────┬─────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
   [Analista Tesorería             [Analista Tesorería
      Verifica Crédito]               No Verifica Crédito]
               │                             │
               ▼                             ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│     PAGO VERIFICADO      │   │      PAGO RECHAZADO      │
│  (status = VERIFICADO)   │   │  (status = RECHAZADO)    │
└────────────┬─────────────┘   └────────────┬─────────────┘
             │                              │
             ▼                              ▼
    [Genera Planilla /            [Notifica Motivo a  ]
    Activa Timbre QR  ]           [Contribuyente      ]
```

#### 5.4 Reglas del Estado "Rechazado" (No Verificado)
1. Si Tesorería rechaza un pago, el sistema registra el motivo (`rejection_reason`).
2. Se envía una notificación por correo electrónico al contribuyente.
3. El timbre o la planilla asociada **NUNCA se activan ni se emiten**.

#### 5.5 Endpoints REST API
```
POST   /api/v1/payments/upload           -> Registrar transferencia + Váucher
GET    /api/v1/payments/pending          -> (Tesorería) Listar pagos por conciliar
PATCH  /api/v1/payments/:id/verify       -> (Tesorería) Aprobar pago
PATCH  /api/v1/payments/:id/reject       -> (Tesorería) Rechazar pago con motivo
```

---

### MÓDULO 06: MÓDULO SAREN / VERIFICACIÓN EXCLUSIVA Y ANTI-FRAUDE

#### 6.1 Descripción
Módulo exclusivo de lectura y validación para funcionarios del **SAREN (Servicio Autónomo de Registros y Notarías)**. Diseñado para evitar la reutilización de timbres fiscales fotocopiados o impresos múltiples veces.

#### 6.2 Protocolo de Consumo del QR (Uso Único)

1. **Estatus Inicial:** El timbre se crea con `status = 'ACTIVO'`.
2. **Escaneo en Notaría/Registro:** El funcionario del SAREN escanea el QR o ingresa el serial `uuid_code` en la plataforma web de verificación.
3. **Petición de Validación:** El backend recibe la solicitud y ejecuta la siguiente lógica:

```typescript
async function validateAndConsumeStamp(uuidCode: string, sarenUser: User, officeName: string) {
  const stamp = await db.electronic_stamps.findOne({ where: { uuid_code: uuidCode } });

  if (!stamp) {
    return { success: false, code: "NOT_FOUND", message: "El timbre fiscal no existe en los registros oficiales." };
  }

  if (stamp.status === 'CONSUMIDO') {
    return {
      success: false,
      code: "ALREADY_USED",
      message: `ALERTA DE REUTILIZACIÓN: Este timbre ya fue consumido el ${stamp.consumed_at} en la oficina ${stamp.saren_office_name}.`
    };
  }

  if (stamp.status === 'ANULADO') {
    return { success: false, code: "ANNULLED", message: "Este timbre fiscal fue anulado previamente." };
  }

  //Transición de Estado: Inactivación Inmediata
  stamp.status = 'CONSUMIDO';
  stamp.consumed_at = new Date();
  stamp.consumed_by_saren_user = sarenUser.id;
  stamp.saren_office_name = officeName;
  await db.electronic_stamps.save(stamp);

  return {
    success: true,
    code: "VALIDATED_AND_CONSUMED",
    message: "Timbre fiscal VÁLIDO. Ha sido marcado como CONSUMIDO en este momento.",
    data: stamp
  };
}
```

#### 6.3 Endpoints REST API
```
POST   /api/v1/saren/verify-stamp        -> Escanear/Validar timbre (Consumo único)
GET    /api/v1/saren/history             -> Histórico de verificaciones por oficina
```

---

### MÓDULO 07: REPORTES, AUDITORÍA E INDICADORES DE GESTIÓN (POA)

#### 7.1 Descripción
Panel de Inteligencia de Datos para la Superintendencia de Tributos y Gerencia de Recaudación.

#### 7.2 Funciones Clave
1. **Exportación Multiformato:** Generación de archivos Excel (`.xlsx`) y PDF para conciliaciones.
2. **Tablero de Control POA (Plan Operativo Anual):**
   * Gráfico comparativo de recaudación mensual vs meta proyectada.
   * Desglose por ramos tributarios (Minería, 1x1000, Timbres).
   * Total acumulado en Bolívares (VED).
3. **Auditoría de Acciones (Audit Trail):**
   * Registro inmutable de cada acción con IP, fecha, hora y datos modificados (`old_values` vs `new_values`).

#### 7.3 Endpoints REST API
```
GET    /api/v1/reports/revenue-summary   -> Métricas globales para Dashboard
GET    /api/v1/reports/export/excel      -> Descargar reporte conciliación Excel
GET    /api/v1/reports/export/pdf        -> Descargar informe PDF de gestión
GET    /api/v1/audit/logs                -> Consultar logs de auditoría (Admin)
```

---

## 4. MATRIZ DE PERMISOS Y SEGURIDAD (RBAC)

| Módulo / Acción | CONTRIBUYENTE | ANALISTA RECAUDACIÓN | ANALISTA TESORERÍA | VERIFICADOR SAREN | ADMIN SISTEMA |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Autoregistro / Ver Perfil | **X** | **X** | **X** | **X** | **X** |
| Aprobar Registro Contribuyente | | **X** | | | **X** |
| Declarar Minería / 1x1000 | **X** | | | | **X** |
| Comprar Timbre Electrónico | **X** | | | | **X** |
| Registrar Carga de Váucher | **X** | | | | **X** |
| Conciliar / Aprobar Pago | | | **X** | | **X** |
| Escanear / Consumir QR Timbre | | | | **X** | **X** |
| Consultar Dashboard POA | | **X** | **X** | | **X** |
| Consultar Logs Auditoría | | | | | **X** |

---

## 5. RECOMENDACIONES DE IMPLEMENTACIÓN PASO A PASO PARA EL DESARROLLADOR AI

1. **Paso 1 (Database & Models):** Ejecuta el script DDL de PostgreSQL provisto en la Sección 2. Crea las entidades/modelos correspondiente en el ORM de tu elección (Prisma, TypeORM o Eloquent).
2. **Paso 2 (Auth & RBAC):** Implementa los endpoints de autenticación, generación de tokens JWT con roles y el middleware de restricción por rol (`user_role`).
3. **Paso 3 (Tasa BCV Cron Job):** Configura la tarea programada que consulta la API de tasas de cambio o parsea la tasa oficial EUR/VED del BCV.
4. **Paso 4 (Core Tributario):** Implementa los controladores para las declaraciones de Minería y 1x1000 con sus fórmulas exactas de cálculo.
5. **Paso 5 (Timbres & QR PDF):** Implementa la generación de PDF con la biblioteca QR integrada y el UUID v4 único.
6. **Paso 6 (Flujo de Tesorería):** Desarrolla el panel de verificación de transferencias y la máquina de estados de pagos.
7. **Paso 7 (Módulo SAREN):** Implementa el endpoint de validación y la función de transición de estado `ACTIVO -> CONSUMIDO` con bloqueo de reingreso.
8. **Paso 8 (Reportes y Dashboard):** Construye las consultas agregadas para Chart.js/Recharts y los servicios de exportación Excel/PDF.