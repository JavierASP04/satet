import type { RequestHandler } from 'express';
import { ERROR_CODES, type ApiError, type ErrorCode } from '@satet/shared';

export class HttpError extends Error {
	constructor(
		public readonly status: number,
		public readonly code: ErrorCode,
		message: string,
		public readonly details?: unknown
	) {
		super(message);
	}
}

export function errorBody(code: ErrorCode, message: string, details?: unknown): ApiError {
	return { error: { code, message, ...(details === undefined ? {} : { details }) } };
}

export function notImplemented(operation: string): RequestHandler {
	return (_req, res) => {
		res
			.status(501)
			.json(errorBody(ERROR_CODES.NOT_IMPLEMENTED, `${operation}: aún no implementado.`));
	};
}
