export const ERROR_CODES = {
	NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
	NOT_FOUND: 'NOT_FOUND',
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	UNAUTHORIZED: 'UNAUTHORIZED',
	FORBIDDEN: 'FORBIDDEN',
	INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface ApiError {
	error: {
		code: ErrorCode;
		message: string;
		details?: unknown;
	};
}

export interface HealthResponse {
	status: 'ok';
	service: string;
	database: 'up' | 'down';
	timestamp: string;
}

/** Códigos de resultado de `POST /api/v1/saren/verify-stamp` (Módulo 06). */
export const STAMP_VERIFICATION_CODES = {
	NOT_FOUND: 'NOT_FOUND',
	ALREADY_USED: 'ALREADY_USED',
	ANNULLED: 'ANNULLED',
	VALIDATED_AND_CONSUMED: 'VALIDATED_AND_CONSUMED'
} as const;

export type StampVerificationCode =
	(typeof STAMP_VERIFICATION_CODES)[keyof typeof STAMP_VERIFICATION_CODES];

/** Payload firmado del QR del timbre (Módulo 04, sección 4.3). */
export interface StampQrPayload {
	uuid: string;
	rif: string;
	taxpayer: string;
	amount_eur: number;
	bcv_rate: number;
	amount_ved: number;
	issued_at: string;
}
