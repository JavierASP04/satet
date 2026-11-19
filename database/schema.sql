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

-- 7. TABULADOR DE TIMBRES (veces el tipo de cambio oficial). Fuente: database/stamp-fees.mjs
-- Tabulador legal. Cada cifra es veces el tipo de cambio oficial.
CREATE TABLE fiscal_stamp_fees (
    code VARCHAR(40) PRIMARY KEY,
    article VARCHAR(8) NOT NULL,
    item VARCHAR(24) NOT NULL,
    concept TEXT NOT NULL,
    times_official_rate NUMERIC(10, 2) NOT NULL CHECK (times_official_rate > 0),
    sort_order INTEGER NOT NULL UNIQUE
);

INSERT INTO fiscal_stamp_fees (code, article, item, concept, times_official_rate, sort_order)
VALUES
    ('31.1', '31', '1', 'Expedición de constancias de domicilio', 1.00, 1),
    ('31.2.a', '31', '2.a', 'Copias certificadas destinadas a particulares, por la primera pieza o documento', 1.00, 2),
    ('31.2.a.folio', '31', '2.a', 'Copia certificada de planos o mapas oficiales, por cada folio', 0.20, 3),
    ('31.2.b', '31', '2.b', 'Cada documento o folio adicional suscrito por el funcionario competente', 1.00, 4),
    ('31.3', '31', '3', 'Copias certificadas de títulos, constancias, certificados, credenciales o permisos de organismos oficiales, distintas de las reguladas por otros artículos', 1.00, 5),
    ('31.4', '31', '4', 'Copias fotostáticas, manuscritas o mecanografiadas del Registro Mercantil, notarías, tribunales u otro registro público, conforme al arancel judicial', 1.00, 6),
    ('31.5', '31', '5', 'Información o cuadros estadísticos certificados para particulares, cualquiera sea el número de folios', 1.00, 7),
    ('31.6', '31', '6', 'Consultas a la Administración Tributaria sobre la aplicación de normas tributarias a una situación concreta', 1.00, 8),
    ('31.7', '31', '7', 'Legalización de firmas de funcionarios públicos o autoridades venezolanas en el estado Trujillo', 1.00, 9),
    ('31.8', '31', '8', 'Certificación de títulos o diplomas profesionales, académicos de educación o instrucción', 1.20, 10),
    ('31.9', '31', '9', 'Títulos otorgados por instituciones académicas venezolanas para obtener el doctorado', 2.50, 11),
    ('31.10', '31', '10', 'Títulos otorgados para obtener la maestría o especialización', 2.00, 12),
    ('31.11', '31', '11', 'Títulos otorgados para obtener la licenciatura', 1.50, 13),
    ('31.12', '31', '12', 'Títulos otorgados por universidades venezolanas distintos de los anteriores', 1.20, 14),
    ('31.13', '31', '13', 'Títulos del área profesional (técnico superior universitario)', 1.20, 15),
    ('31.14', '31', '14', 'Demás títulos con validez legal otorgados por organismos nacionales', 1.00, 16),
    ('31.15', '31', '15', 'Inscripción y otorgamiento de matrícula o registro a títulos de profesionales de la salud y afines', 1.00, 17),
    ('32.1', '32', '1', 'Evaluación y estudio sanitario sobre proyectos', 1.50, 18),
    ('32.2', '32', '2', 'Evaluación y estudio de elaboración de agua potable y aguas residuales', 1.20, 19),
    ('32.3', '32', '3', 'Análisis físico-químico básico y de metales', 1.20, 20),
    ('32.4', '32', '4', 'Análisis físico-químicos especiales', 1.20, 21),
    ('32.5', '32', '5', 'Análisis físico-químico sobre compuestos orgánicos especiales', 1.20, 22),
    ('32.6', '32', '6', 'Análisis microbiológicos', 2.00, 23),
    ('32.7', '32', '7', 'Análisis biológicos', 2.00, 24),
    ('32.8', '32', '8', 'Análisis químico o físico-químico de sustancias desnaturalizantes o materia prima para bebidas alcohólicas', 25.00, 25),
    ('32.9.a', '32', '9.a', 'Inspección y evaluación para laboratorios farmacéuticos', 1.20, 26),
    ('32.9.b', '32', '9.b', 'Inspección y evaluación de casa de representación de droguerías y distribuidoras', 1.20, 27),
    ('32.9.c', '32', '9.c', 'Inspección y evaluación de farmacias', 1.20, 28),
    ('32.9.d', '32', '9.d', 'Inspección y evaluación de expendios de medicinas', 1.20, 29),
    ('32.10', '32', '10', 'Inspección y evaluación del cumplimiento de normas técnicas de manufactura de la industria farmacéutica, cosméticos y productos naturales', 1.20, 30),
    ('32.11', '32', '11', 'Inspecciones de reconocimiento de productos terminados', 1.20, 31),
    ('32.12', '32', '12', 'Evaluación y estudio de proyectos de instalación, reforma o modificación de establecimientos de alimentos', 1.20, 32),
    ('32.13', '32', '13', 'Evaluación y estudio higiénico-sanitario de empresas', 1.20, 33),
    ('32.14', '32', '14', 'Otorgamiento y renovación de permisos para la compraventa de sustancias psicotrópicas y estupefacientes lícitas', 1.20, 34),
    ('32.15', '32', '15', 'Registro y sellado de libros para el control de sustancias estupefacientes y psicotrópicas', 1.20, 35),
    ('32.16', '32', '16', 'Certificado de libre venta y consumo de productos alimenticios', 1.20, 36),
    ('32.17', '32', '17', 'Constancia de registro sanitario de productos alimenticios', 1.20, 37),
    ('32.18', '32', '18', 'Certificación sanitaria de la calidad de alimentos', 1.20, 38),
    ('32.19', '32', '19', 'Permiso sanitario para importación de alimentos', 1.20, 39),
    ('32.20', '32', '20', 'Certificación de ingredientes para la elaboración de alimentos', 1.20, 40),
    ('32.21', '32', '21', 'Certificación sanitaria de materiales en contacto con alimentos', 1.20, 41),
    ('32.22', '32', '22', 'Certificación sanitaria de equipos y utensilios para el manejo de productos alimenticios', 1.20, 42),
    ('32.23', '32', '23', 'Permiso sanitario para el funcionamiento de industrias de alimentos', 2.00, 43),
    ('32.24', '32', '24', 'Permiso sanitario para el funcionamiento de expendio y almacenamiento de alimentos', 2.00, 44),
    ('32.25', '32', '25', 'Permiso sanitario para expendios ambulantes y transporte de alimentos', 1.20, 45),
    ('32.26', '32', '26', 'Constancia o informe técnico de operatividad y funcionamiento, distinto de los regulados en otros artículos', 1.20, 46),
    ('32.27', '32', '27', 'Autorización para prácticas sujetas al régimen de excepciones de la ley de antimonopolio', 1.20, 47),
    ('32.28', '32', '28', 'Autorización y registro sanitario de productos cosméticos', 1.20, 48),
    ('32.29', '32', '29', 'Asesoría técnico-científica y revisión de expedientes', 1.20, 49),
    ('32.30', '32', '30', 'Autorización para el registro de productos cosméticos', 1.20, 50),
    ('32.31', '32', '31', 'Inspección para instalación de establecimientos distribuidores de productos cosméticos', 1.20, 51),
    ('32.32', '32', '32', 'Cambio de fórmula cosmética (reformulación)', 1.20, 52),
    ('32.33', '32', '33', 'Otros conceptos cosméticos', 1.20, 53),
    ('32.34', '32', '34', 'Certificado de libre venta', 1.00, 54),
    ('32.35', '32', '35', 'Constancia de fórmula aprobada', 1.00, 55),
    ('32.36', '32', '36', 'Copia certificada de registro', 1.20, 56),
    ('32.37', '32', '37', 'Copia certificada de documentos', 1.20, 57),
    ('32.38', '32', '38', 'Cambio de fabricante', 1.00, 58),
    ('32.39', '32', '39', 'Cambio de propietario', 1.20, 59),
    ('32.40', '32', '40', 'Cambio de razón social', 1.00, 60),
    ('32.41', '32', '41', 'Cambio de establecimiento distribuidor', 1.20, 61),
    ('32.42', '32', '42', 'Cambio de patrocinante', 1.20, 62),
    ('32.43', '32', '43', 'Permiso de exportación de productos farmacéuticos, productos naturales y cosméticos', 2.00, 63),
    ('32.44', '32', '44', 'Permisos de importación', 2.00, 64),
    ('32.45', '32', '45', 'Publicación, autorización y renovación', 1.20, 65),
    ('32.46', '32', '46', 'Cambio de denominación comercial', 1.20, 66),
    ('32.47', '32', '47', 'Cambio o periodo de validez', 1.20, 67),
    ('32.48', '32', '48', 'Cambio por modificación de rótulos o empaques (post-registro)', 1.20, 68),
    ('32.49', '32', '49', 'Evaluación y estudio de laboratorio de control de plaguicidas en alimentos y de tipo ambiental', 1.20, 69),
    ('32.50', '32', '50', 'Evaluación y estudio de laboratorio de residuos de plaguicidas en sangre biológica y estudios epidemiológicos', 1.20, 70),
    ('33.1', '33', '1', 'Autorización de industrias productoras de alcohol y especies alcohólicas, o ampliación de las ya instaladas', 10.00, 71),
    ('33.1.renovacion', '33', '1', 'Renovación anual de la autorización de industrias productoras de alcohol y especies alcohólicas', 10.00, 72),
    ('33.2.urbana', '33', '2', 'Autorización para instalación, transformación, traspaso o traslado de expendios de bebidas alcohólicas en zonas urbanas', 8.00, 73),
    ('33.2.suburbana', '33', '2', 'Autorización para instalación, transformación, traspaso o traslado de expendios de bebidas alcohólicas en zonas suburbanas', 6.00, 74),
    ('33.2.renovacion', '33', '2', 'Renovación anual de las autorizaciones de expendios de bebidas alcohólicas', 6.00, 75),
    ('33.3', '33', '3', 'Autorización a personas naturales para operar como agentes de aduanas', 2.00, 76),
    ('33.4', '33', '4', 'Autorización a personas jurídicas para operar como agentes de aduanas', 35.00, 77),
    ('33.5', '33', '5', 'Autorización para operar bajo el régimen de puerto libre', 10.00, 78),
    ('33.6', '33', '6', 'Autorización para operar como almacenes generales de depósito, depósitos temporales, depósitos aduaneros y almacenes de impuesto', 10.00, 79),
    ('34.1', '34', '1', 'Registro de proyectos para el establecimiento de nuevas industrias o la ampliación de las ya instaladas', 10.00, 80),
    ('34.2', '34', '2', 'Certificados o informes periciales técnicos sobre la calidad de bienes y servicios', 6.00, 81),
    ('34.3', '34', '3', 'Certificación de lotes o partidas de productos, materiales, partes y componentes', 4.00, 82),
    ('34.4', '34', '4', 'Certificación de calidad de productos o servicios', 4.00, 83),
    ('34.5', '34', '5', 'Evaluación del control de calidad', 6.00, 84),
    ('34.6', '34', '6', 'Análisis químico o físico-químico de productos y mercancías para su clasificación arancelaria', 6.00, 85),
    ('34.7', '34', '7', 'Aprobación para la colocación de vallas publicitarias en los laterales de la vialidad, fuera del derecho de vía', 5.00, 86),
    ('34.10', '34', '10', 'Solicitud de licencias para expender timbres fiscales', 1.00, 87),
    ('34.11', '34', '11', 'Otorgamiento o renovación de licencia para expendio de timbres fiscales', 1.00, 88),
    ('34.parrafo', '34', 'parrafo', 'Constancias, solicitudes u otros actos emitidos por entes, empresas e instituciones adscritos a la Gobernación del estado Trujillo', 2.00, 89),
    ('35.1', '35', '1', 'Certificados de registro de marcas, lemas, denominaciones comerciales, patentes, modelos, dibujos industriales e introducción de invento o mejora', 8.00, 90),
    ('35.2', '35', '2', 'Nombres y denominaciones de empresas mercantiles y firmas comerciales ante el Registro Mercantil', 12.00, 91),
    ('35.3', '35', '3', 'Registro de documentos constitutivos de sociedades de comercio e inscripción de modificaciones al documento constitutivo y a los estatutos', 23.00, 92),
    ('35.4', '35', '4', 'Registro de sociedades extranjeras, domiciliaciones, agencias, sucursales o representaciones, y sus actuaciones sucesivas', 25.00, 93),
    ('35.4.folio', '35', '4', 'Registro de sociedades extranjeras, por cada folio de inscripción', 0.20, 94),
    ('35.7', '35', '7', 'Registro de sociedades accidentales y consorcios en el Registro Mercantil', 12.00, 95),
    ('35.8.hasta50', '35', '8', 'Registro de la venta de un fondo de comercio, del 1 % al 50 %', 12.00, 96),
    ('35.8.desde51', '35', '8', 'Registro de la venta de un fondo de comercio, del 51 % al 100 %', 23.00, 97),
    ('35.9.a', '35', '9.a', 'Poder de comerciante a factores y dependientes, si el poderdante es persona jurídica', 3.00, 98),
    ('35.9.b', '35', '9.b', 'Poder de comerciante a factores y dependientes, si el poderdante es persona natural', 1.50, 99),
    ('35.10.a', '35', '10.a', 'Cualquier otro poder, si el poderdante es persona jurídica', 3.00, 100),
    ('35.10.b', '35', '10.b', 'Cualquier otro poder, si el poderdante es persona natural', 1.50, 101),
    ('35.11', '35', '11', 'Cualquier solicitud dirigida a las notarías públicas, sin perjuicio de los demás tributos', 1.00, 102),
    ('35.12', '35', '12', 'Inscripción de cualquier otro documento en los registros de comercio, distinto de los regulados por otros artículos', 5.00, 103),
    ('35.12.b', '35', '12.b', 'Inscripción en los registros de comercio, por cada folio adicional', 1.00, 104),
    ('36.1', '36', '1', 'Autorización de venta de plaguicidas y productos químicos, tóxicos y peligrosos de uso doméstico', 1.50, 105),
    ('36.2', '36', '2', 'Registro de plaguicidas y productos químicos, tóxicos y peligrosos de uso doméstico', 1.50, 106),
    ('36.4', '36', '4', 'Permiso para transporte de plaguicidas y productos químicos, tóxicos y peligrosos de uso doméstico', 1.50, 107),
    ('36.5', '36', '5', 'Permiso para rociamiento urbano de plaguicidas y productos químicos, tóxicos y peligrosos de uso doméstico', 1.50, 108),
    ('36.6', '36', '6', 'Certificado de libre venta de plaguicidas y productos químicos, tóxicos y peligrosos de uso doméstico', 1.50, 109),
    ('36.7', '36', '7', 'Registro de interesado para distribución, expendio, publicidad y almacenamiento de plaguicidas de uso doméstico', 1.20, 110),
    ('36.8', '36', '8', 'Registro de interesado para la aplicación de plaguicidas de uso doméstico', 1.20, 111),
    ('36.9', '36', '9', 'Permiso para fumigaciones aéreas con plaguicidas de uso doméstico en zonas residenciales', 1.50, 112),
    ('37.1', '37', '1', 'Habitabilidad de vivienda, por metro cuadrado', 0.10, 113),
    ('37.2', '37', '2', 'Habitabilidad de comercio, por metro cuadrado', 0.40, 114),
    ('37.3', '37', '3', 'Habitabilidad industrial, por metro cuadrado', 0.40, 115),
    ('37.4', '37', '4', 'Conformidad sanitaria de aptitud de condominio, por metro cuadrado', 0.10, 116),
    ('37.5', '37', '5', 'Conformación sanitaria para cambio de uso del local', 1.50, 117),
    ('37.6', '37', '6', 'Conformación sanitaria para desarrollos urbanísticos', 2.00, 118),
    ('37.7', '37', '7', 'Conformación sanitaria de integración, parcelamiento y cambio de uso de parcela, por metro cuadrado', 1.00, 119),
    ('37.8', '37', '8', 'Conformación sanitaria de proyectos de tratamiento de aguas blancas y residuales, por metro cúbico', 0.40, 120),
    ('37.9', '37', '9', 'Conformación sanitaria de instalación y funcionamiento de industrias', 2.00, 121),
    ('38.1', '38', '1', 'Registro para la fabricación de plaguicidas de uso agrícola o pecuario, fertilizantes, abonos y productos de uso animal', 1.70, 122),
    ('38.2', '38', '2', 'Registro para distribución, expendio, publicidad, almacenamiento y transporte de plaguicidas agrícolas o pecuarios, fertilizantes, abonos y productos de uso animal', 1.70, 123),
    ('38.3', '38', '3', 'Registro para la aplicación de plaguicidas de uso agrícola o pecuario, fertilizantes, abonos y productos de uso animal', 1.70, 124),
    ('38.4', '38', '4', 'Registro de productos biológicos, medicamentos y alimentos para uso animal', 1.70, 125),
    ('38.5', '38', '5', 'Autorización para la fabricación de plaguicidas de uso agrícola, fertilizantes y abonos', 1.70, 126),
    ('38.6', '38', '6', 'Autorización para expendio, aplicación comercial, depósito, publicidad, formulación y envasado de plaguicidas de uso agrícola', 1.70, 127),
    ('38.7', '38', '7', 'Certificado de libre venta de plaguicidas de uso agrícola, fertilizantes, abonos biológicos y productos de uso animal', 1.70, 128),
    ('39.1', '39', '1', 'Permiso para el funcionamiento de pool y billar', 10.00, 129),
    ('39.2', '39', '2', 'Renovación de permisos de pool y billar', 5.00, 130),
    ('39.3', '39', '3', 'Permiso para el funcionamiento de parley o sport book', 10.00, 131),
    ('39.4', '39', '4', 'Renovación de permisos de parley o sport book', 5.00, 132),
    ('39.5.a', '39', '5.a', 'Permiso para el funcionamiento de bingos y casinos', 3.00, 133),
    ('39.5.b', '39', '5.b', 'Cada inscripción en el libro de bingos y casinos', 3.00, 134),
    ('39.5.c', '39', '5.c', 'Inscripción en el registro de organizaciones de juegos y apuestas lícitas', 3.00, 135),
    ('39.5.d', '39', '5.d', 'Permiso para la organización eventual de juegos y apuestas lícitas', 3.00, 136),
    ('39.6', '39', '6', 'Identificación de cada máquina o aparato de juegos', 3.00, 137),
    ('40.1', '40', '1', 'Permiso de dotación de agua para uso doméstico', 1.50, 138),
    ('40.2', '40', '2', 'Permiso de dotación de agua para uso sanitario industrial', 1.50, 139),
    ('40.3', '40', '3', 'Permiso de perforación de pozos profundos', 1.50, 140),
    ('40.4', '40', '4', 'Permiso de perforación de sistemas de tratamiento de aguas blancas y servidas', 1.50, 141),
    ('40.5', '40', '5', 'Permiso de operación para empresa de limpieza y desinfección de estanques de agua potable', 1.50, 142),
    ('40.6', '40', '6', 'Permiso para transporte de agua en camión cisterna', 1.50, 143),
    ('41.1', '41', '1', 'Autorización de venta de plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario o industrial', 1.50, 144),
    ('41.2', '41', '2', 'Registro de plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario o industrial', 1.50, 145),
    ('41.3', '41', '3', 'Autorización para almacenar plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario o industrial', 1.50, 146),
    ('41.4', '41', '4', 'Permiso para transporte de plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario, industrial o agropecuario', 1.50, 147),
    ('41.5', '41', '5', 'Permiso para rociamiento urbano de plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario o industrial', 1.50, 148),
    ('41.6', '41', '6', 'Certificado de libre venta de plaguicidas y productos químicos, tóxicos y peligrosos de uso sanitario o industrial', 1.50, 149),
    ('41.7', '41', '7', 'Registro para distribución, expendio, publicidad y almacenamiento de plaguicidas de uso sanitario o industrial', 1.20, 150),
    ('41.8', '41', '8', 'Registro para la aplicación de plaguicidas de uso sanitario o industrial', 1.20, 151),
    ('41.9', '41', '9', 'Permiso para fumigaciones aéreas con plaguicidas de uso sanitario o industrial', 1.50, 152),
    ('41.10', '41', '10', 'Evaluación y estudio de laboratorio de control de plaguicidas en alimentos y de tipo ambiental', 1.20, 153),
    ('41.11', '41', '11', 'Evaluación y estudio de laboratorio de residuos de plaguicidas en sangre biológica y estudios epidemiológicos', 1.20, 154),
    ('42.1', '42', '1', 'Constancia de registro de hierros', 2.00, 155),
    ('42.2', '42', '2', 'Constancia de registro de señal', 2.00, 156),
    ('44.1.a', '44', '1.a', 'Servicios técnicos forestales de madera en rolas y escuadrada importada, por metro cúbico', 0.40, 157),
    ('44.1.b', '44', '1.b', 'Servicios técnicos forestales de madera aserrada importada, por metro cúbico', 0.40, 158),
    ('44.2.a', '44', '2.a', 'Estantes, estantillos, viguetas, barras, listones de mangle y otras especies importados, por unidad', 1.00, 159),
    ('44.2.b', '44', '2.b', 'Cogollos de palmitos importados, por unidad', 1.00, 160),
    ('44.3', '44', '3', 'Fibras de palma de chiquichiqui, por kilogramo', 1.00, 161),
    ('44.4', '44', '4', 'Horcones, vigas, viguetones, tirantes, soleras, costillas, madrinas, puntales y esquineros, por unidad', 1.00, 162),
    ('44.5', '44', '5', 'Postes', 1.00, 163),
    ('44.6', '44', '6', 'Leñas', 1.00, 164),
    ('44.7', '44', '7', 'Carbón vegetal, por tonelada', 1.00, 165),
    ('44.8', '44', '8', 'Permiso o autorización de deforestación y roza que no origine aprovechamiento forestal, por hectárea autorizada', 1.00, 166),
    ('44.9', '44', '9', 'Certificación de ubicación en áreas bajo régimen de administración especial, por una hectárea', 1.00, 167),
    ('44.9.adicional', '44', '9', 'Certificación de ubicación en áreas bajo régimen de administración especial, por hectárea o fracción adicional', 0.20, 168),
    ('44.10', '44', '10', 'Autorización para la afectación de recursos naturales', 1.00, 169),
    ('44.11', '44', '11', 'Afectación de recursos naturales para actividades residenciales, turísticas y recreacionales, por una hectárea', 1.00, 170),
    ('44.11.adicional', '44', '11', 'Afectación de recursos naturales para actividades residenciales, turísticas y recreacionales, por hectárea o fracción adicional', 0.50, 171),
    ('44.12', '44', '12', 'Afectación de recursos naturales para actividades industriales', 1.00, 172),
    ('44.12.adicional', '44', '12', 'Afectación de recursos naturales para actividades industriales, por hectárea o fracción adicional', 0.50, 173),
    ('44.13.a', '44', '13.a', 'Licencia o permiso de exploración, extracción y aprovechamiento de minerales no metálicos, hasta por una hectárea', 5.00, 174),
    ('44.13.a.adicional', '44', '13.a', 'Licencia o permiso de minerales no metálicos, por cada hectárea adicional', 0.40, 175),
    ('44.13.b', '44', '13.b', 'Declaratoria de impacto ambiental', 1.00, 176),
    ('44.14.a', '44', '14.a', 'Evaluación y estudio de laboratorio de suelos: análisis de rutina', 1.00, 177),
    ('44.14.b', '44', '14.b', 'Evaluación y estudio de laboratorio de suelos: análisis de calicata', 1.00, 178),
    ('44.14.c', '44', '14.c', 'Evaluación y estudio de laboratorio de suelos: análisis de salinidad', 1.00, 179),
    ('44.14.d', '44', '14.d', 'Evaluación y estudio de laboratorio de suelos: análisis de física de suelos', 1.00, 180),
    ('44.14.e', '44', '14.e', 'Evaluación y estudio de laboratorio de suelos: análisis de fertilidad', 1.00, 181),
    ('44.14.f', '44', '14.f', 'Evaluación y estudio de análisis integrado de suelos y aguas', 1.00, 182),
    ('44.15', '44', '15', 'Autorización de funcionamiento a personas que realicen actividades susceptibles de degradar el ambiente', 2.00, 183),
    ('44.16', '44', '16', 'Estudio, análisis y evaluación para el registro de actividades susceptibles de degradar el ambiente', 2.00, 184),
    ('44.16.renovacion', '44', '16', 'Renovación anual de la autorización de funcionamiento del numeral 15: 50 % del monto establecido', 1.00, 185),
    ('44.17', '44', '17', 'Estudio, análisis y evaluación permanente de actividades que generen contaminación sónica', 2.00, 186),
    ('45.1', '45', '1', 'Actos, documentos u otorgamientos no previstos en el instrumento, emitidos en el estado Trujillo', 2.00, 187),
    ('47.1', '47', '1', 'Legalización de firmas de funcionarios de órganos o entes adscritos al Ejecutivo del estado Trujillo', 1.00, 188),
    ('47.2', '47', '2', 'Inscripción de empresas o firmas personales en el Registro de Contratistas, proveedores y prestadores de servicios', 10.00, 189),
    ('47.2.renovacion', '47', '2', 'Renovación anual de la inscripción en el Registro de Contratistas: 50 % del tributo', 5.00, 190),
    ('47.3', '47', '3', 'Manifestación de voluntad para participar en procesos de contratación pública del estado Trujillo', 10.00, 191),
    ('47.4', '47', '4', 'Solicitud de adquisición de guías de circulación de materiales no metálicos por mineros autorizados o registrados', 25.00, 192),
    ('48.1', '48', '1', 'Autorización a personas naturales o jurídicas para el expendio de timbres fiscales', 1.00, 193),
    ('48.1.renovacion', '48', '1', 'Renovación anual de la autorización para el expendio de timbres fiscales: 100 % del tributo', 1.00, 194),
    ('48.2', '48', '2', 'Solicitud de adquisición de timbres fiscales por expendedores o distribuidores mayoristas autorizados', 0.50, 195),
    ('48.3', '48', '3', 'Solicitud de habilitación de libros ante el órgano de Administración Tributaria del estado Trujillo', 0.50, 196);

-- 7. TABLE: ELECTRONIC STAMPS (MÓDULO 4 & 6)
CREATE TABLE electronic_stamps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uuid_code VARCHAR(36) UNIQUE NOT NULL, -- Serial único UUID v4
    taxpayer_id UUID NOT NULL REFERENCES taxpayers(id),
    amount_eur NUMERIC(10, 2) NOT NULL,
    bcv_rate_applied NUMERIC(12, 4) NOT NULL,
    amount_ved NUMERIC(15, 2) NOT NULL,
    qr_payload TEXT NOT NULL,
    fee_code VARCHAR(40) REFERENCES fiscal_stamp_fees(code),
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
