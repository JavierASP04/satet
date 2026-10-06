import type { RequestHandler } from 'express';
import { ERROR_CODES } from '@satet/shared';
import { errorBody } from '../lib/http.ts';

export const notFound: RequestHandler = (req, res) => {
	res
		.status(404)
		.json(errorBody(ERROR_CODES.NOT_FOUND, `Ruta no encontrada: ${req.method} ${req.path}`));
};
