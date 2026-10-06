// Espejo de los enums de `database/schema.sql`.

export const DOC_TYPES = {
	RIF_JURIDICO: 'RIF_JURIDICO',
	RIF_NATURAL: 'RIF_NATURAL',
	CEDULA: 'CEDULA',
	PASAPORTE: 'PASAPORTE'
} as const;
export type DocType = (typeof DOC_TYPES)[keyof typeof DOC_TYPES];

export const TAX_TYPES = {
	MINERO: 'MINERO',
	UN_POR_MIL: 'UN_POR_MIL',
	TIMBRE_FISCAL: 'TIMBRE_FISCAL'
} as const;
export type TaxType = (typeof TAX_TYPES)[keyof typeof TAX_TYPES];

export const PAYMENT_STATUS = {
	PENDIENTE: 'PENDIENTE',
	VERIFICADO: 'VERIFICADO',
	RECHAZADO: 'RECHAZADO'
} as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const STAMP_STATUS = {
	ACTIVO: 'ACTIVO',
	CONSUMIDO: 'CONSUMIDO',
	ANULADO: 'ANULADO'
} as const;
export type StampStatus = (typeof STAMP_STATUS)[keyof typeof STAMP_STATUS];

export const MINING_ACTIVITIES = {
	EXTRACCION: 'EXTRACCION',
	PROCESAMIENTO: 'PROCESAMIENTO',
	SUBPRODUCTO: 'SUBPRODUCTO'
} as const;
export type MiningActivity = (typeof MINING_ACTIVITIES)[keyof typeof MINING_ACTIVITIES];
