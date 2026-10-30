-- =============================================================================
-- SATET - Esquema de base de datos (PostgreSQL 16+)
-- Fuente de verdad del modelo de datos. Copia literal del DDL de la sección 2
-- de docs/especificacion-satet.md; cualquier cambio debe reflejarse en ambos.
-- =============================================================================

-- gen_random_uuid() es nativo desde PostgreSQL 13; pgcrypto se deja por compatibilidad.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ENUMS DEFINITION
CREATE TYPE user_role AS ENUM ('CONTRIBUYENTE', 'ANALISTA_RECAUDACION', 'ANALISTA_TESORERIA', 'VERIFICADOR_SAREN', 'ADMIN_SISTEMA');
CREATE TYPE doc_type AS ENUM ('RIF_JURIDICO', 'RIF_NATURAL', 'CEDULA', 'PASAPORTE');
CREATE TYPE tax_type AS ENUM ('MINERO', 'UN_POR_MIL', 'TIMBRE_FISCAL');
CREATE TYPE payment_status AS ENUM ('PENDIENTE', 'VERIFICADO', 'RECHAZADO');
CREATE TYPE stamp_status AS ENUM ('ACTIVO', 'CONSUMIDO', 'ANULADO');
CREATE TYPE mining_activity AS ENUM ('EXTRACCION', 'PROCESAMIENTO', 'SUBPRODUCTO', 'PREMEZCLADO');
CREATE TYPE royalty_payment_form AS ENUM ('DINERO_TOTAL', 'DINERO_FRACCIONADO', 'ESPECIE');

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
-- Varios materiales por declaración. El comprobante va con la declaración.
-- La planilla PDF solo sale cuando status = VERIFICADO (aprobada por el administrador).
CREATE TABLE mining_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taxpayer_id UUID NOT NULL REFERENCES taxpayers(id),
    period_year INT NOT NULL,
    period_month INT NOT NULL, -- 1 to 12
    total_ved NUMERIC(15, 2) NOT NULL,
    is_extemporaneous BOOLEAN DEFAULT FALSE,
    bank_reference_number VARCHAR(100) NOT NULL,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    voucher_file_name VARCHAR(120) NOT NULL,
    voucher_media_type VARCHAR(40) NOT NULL,
    voucher_content BYTEA NOT NULL,
    declaration_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status payment_status DEFAULT 'PENDIENTE',
    rejection_reason TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE mining_declaration_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    declaration_id UUID NOT NULL REFERENCES mining_declarations(id) ON DELETE CASCADE,
    line_order INT NOT NULL,
    activity_type mining_activity NOT NULL,
    material_type VARCHAR(100) NOT NULL,
    volume_cubic_meters NUMERIC(12, 2) NOT NULL,
    commercial_value_per_unit NUMERIC(12, 2) NOT NULL,
    applied_tax_rate NUMERIC(5, 2) NOT NULL,
    subtotal_ved NUMERIC(15, 2) NOT NULL
);

-- 6. TABLE: ONE_PER_THOUSAND (MÓDULO 3)
-- Una carga (una o muchas órdenes) comparte comprobante, referencia y estado.
CREATE TABLE one_per_thousand_filings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taxpayer_id UUID NOT NULL REFERENCES taxpayers(id),
    total_tax_ved NUMERIC(15, 2) NOT NULL DEFAULT 0,
    bank_reference_number VARCHAR(100) NOT NULL,
    bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
    voucher_file_name VARCHAR(120) NOT NULL,
    voucher_media_type VARCHAR(40) NOT NULL,
    voucher_content BYTEA NOT NULL,
    status payment_status DEFAULT 'PENDIENTE',
    rejection_reason TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE one_per_thousand_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filing_id UUID NOT NULL REFERENCES one_per_thousand_filings(id) ON DELETE CASCADE,
    taxpayer_id UUID NOT NULL REFERENCES taxpayers(id),
    payment_order_number VARCHAR(100) NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    executed_amount_ved NUMERIC(15, 2) NOT NULL,
    tax_amount_ved NUMERIC(15, 2) NOT NULL, -- executed_amount / 1000
    execution_date DATE NOT NULL,
    status payment_status DEFAULT 'PENDIENTE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6b. REGALÍAS MINERAS (7 % anual sobre el volumen declarado del año)
CREATE TABLE mining_royalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    taxpayer_id UUID NOT NULL REFERENCES taxpayers(id),
    period_year INT NOT NULL,
    volume_cubic_meters NUMERIC(14, 2) NOT NULL,
    commercial_value_per_unit NUMERIC(12, 2) NOT NULL,
    applied_rate NUMERIC(5, 2) NOT NULL,
    amount_ved NUMERIC(15, 2) NOT NULL,
    payment_form royalty_payment_form NOT NULL,
    bank_reference_number VARCHAR(100),
    bank_account_id UUID REFERENCES bank_accounts(id),
    voucher_file_name VARCHAR(120),
    voucher_media_type VARCHAR(40),
    voucher_content BYTEA,
    status payment_status DEFAULT 'PENDIENTE',
    rejection_reason TEXT,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (taxpayer_id, period_year)
);

-- Cuentas institucionales de ejemplo (números ficticios). Minería y 1 x 1000: Banco de Venezuela.
-- Timbres: Banco de Venezuela, Banca Amiga y BNC.
INSERT INTO bank_accounts (id, bank_name, account_number, account_type, holder_name, holder_rif)
VALUES
    ('00000000-0000-4000-8000-0000000000a1', 'Banco de Venezuela', '01020000000000000001', 'MINERO', 'Gobernación del Estado Trujillo', 'G-200001234'),
    ('00000000-0000-4000-8000-0000000000b1', 'Banco de Venezuela', '01020000000000000002', 'UN_POR_MIL', 'Gobernación del Estado Trujillo', 'G-200001234'),
    ('00000000-0000-4000-8000-0000000000c1', 'Banco de Venezuela', '01020000000000000003', 'TIMBRE_FISCAL', 'Gobernación del Estado Trujillo', 'G-200001234'),
    ('00000000-0000-4000-8000-0000000000c2', 'Banca Amiga', '01720000000000000001', 'TIMBRE_FISCAL', 'Gobernación del Estado Trujillo', 'G-200001234'),
    ('00000000-0000-4000-8000-0000000000c3', 'BNC', '01910000000000000001', 'TIMBRE_FISCAL', 'Gobernación del Estado Trujillo', 'G-200001234');

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
-- El comprobante queda en la fila. La obligación asociada es opcional:
-- al verificar, una declaración pendiente pasa a VERIFICADO; al rechazar, no se emite.
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
    voucher_media_type VARCHAR(40) NOT NULL,
    voucher_content BYTEA NOT NULL,
    related_kind VARCHAR(40),
    related_id UUID,
    status payment_status DEFAULT 'PENDIENTE',
    rejection_reason TEXT,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payments_account_reference_key UNIQUE (target_bank_account_id, bank_reference_number),
    CONSTRAINT payments_related_pair CHECK (
        (related_kind IS NULL AND related_id IS NULL)
        OR (related_kind IS NOT NULL AND related_id IS NOT NULL)
    ),
    CONSTRAINT payments_related_kind CHECK (
        related_kind IS NULL OR related_kind IN (
            'MINING_DECLARATION',
            'ONE_PER_THOUSAND_FILING',
            'MINING_ROYALTY',
            'ELECTRONIC_STAMP'
        )
    )
);

CREATE UNIQUE INDEX payments_one_open_subject
    ON payments (related_kind, related_id)
    WHERE status <> 'RECHAZADO' AND related_id IS NOT NULL;

-- Aviso al contribuyente cuando tesorería rechaza el pago.
CREATE TABLE payment_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id),
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
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
