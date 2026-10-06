import type { ErrorRequestHandler } from 'express';
import { ERROR_CODES } from '@satet/shared';
import { errorBody, HttpError } from '../lib/http.ts';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
	if (err instanceof HttpError) {
		res.status(err.status).json(errorBody(err.code, err.message, err.details));
		return;
	}

	console.error('[api] Error no controlado:', err);
	res.status(500).json(errorBody(ERROR_CODES.INTERNAL_ERROR, 'Error interno del servidor.'));
};
