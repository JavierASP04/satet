import { ERROR_CODES } from '@satet/shared';
import { errorBody } from '../lib/http.js';

export function notFound(req, res) {
	res
		.status(404)
		.json(errorBody(ERROR_CODES.NOT_FOUND, `Ruta no encontrada: ${req.method} ${req.path}`));
}
