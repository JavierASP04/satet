import { ERROR_CODES } from '@satet/shared';
import { conflictFromDb } from '../lib/db-errors.js';
import { errorBody, HttpError } from '../lib/http.js';

export function errorHandler(err, _req, res, _next) {
	const httpError = err instanceof HttpError ? err : conflictFromDb(err);
	if (httpError) {
		res
			.status(httpError.status)
			.json(errorBody(httpError.code, httpError.message, httpError.details));
		return;
	}

	console.error('[api] Error no controlado:', err);
	res.status(500).json(errorBody(ERROR_CODES.INTERNAL_ERROR, 'Error interno del servidor.'));
}
