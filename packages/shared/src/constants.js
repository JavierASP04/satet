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

/**
 * Alícuotas del impuesto minero, en %. Reunión del 22 de octubre de 2026:
 * extracción 6, procesamiento 5, producto (subproducto) 1, premezclado 2.
 */
export const MINING_TAX_RATES = Object.freeze({
	EXTRACCION: 6,
	PROCESAMIENTO: 5,
	SUBPRODUCTO: 1,
	PREMEZCLADO: 2
});

/** Último día del lapso declarativo mensual. Fuera de ese lapso solo se marca el aviso. */
export const DECLARATION_DEADLINE_DAY = 10;

/** Regalía anual sobre el volumen declarado del año, en %. */
export const ROYALTY_TAX_RATE = 7;

/** Divisor del impuesto 1 x 1000 (Módulo 03). */
export const ONE_PER_THOUSAND_DIVISOR = 1000;

/** Cron diario de la tasa BCV EUR/VED a las 18:00 (Módulo 04). */
export const BCV_RATE_CRON = '0 18 * * *';

/** Venezuela no usa horario de verano. El cron de las 18:00 se interpreta en esta zona. */
export const BCV_RATE_TIME_ZONE = 'America/Caracas';

/** Página oficial. La tasa EUR está en el bloque `#euro`. */
export const BCV_RATE_SOURCE_URL = 'https://www.bcv.org.ve/';
