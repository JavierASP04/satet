export const APP_NAME = 'SATET';
export const APP_FULL_NAME =
	'Sistema Integrado de Recaudación y Control Tributario del Estado Trujillo';

export const API_PREFIX = '/api/v1';

export const DEFAULT_SESSION_COOKIE = 'satet_session';

export const CURRENCY = Object.freeze({
	VED: 'VED',
	EUR: 'EUR'
});

/** Formato de RIF: J-12345678-9, G-12345678-9, V-12345678-9 (Módulo 01, regla 1). */
export const RIF_REGEX = /^[JGV]-\d{8}-\d$/;

/** Costo mínimo de bcrypt (Módulo 01, regla 3). */
export const BCRYPT_COST = 12;

/** Alícuotas legales configurables del impuesto minero, en % (Módulo 02). */
export const MINING_TAX_RATES = Object.freeze({
	EXTRACCION: 10,
	PROCESAMIENTO: 5,
	SUBPRODUCTO: 1
});

/** Último día del lapso declarativo mensual (Módulo 02, regla del día 11). */
export const DECLARATION_DEADLINE_DAY = 10;

/** Sanción por extemporaneidad, procesada vía expediente (no se calcula en la planilla). */
export const EXTEMPORANEOUS_FINE_EUR = 1000;

/** Divisor del impuesto 1 x 1000 (Módulo 03). */
export const ONE_PER_THOUSAND_DIVISOR = 1000;

/** Cron diario de la tasa BCV EUR/VED a las 18:00 (Módulo 04). */
export const BCV_RATE_CRON = '0 18 * * *';
