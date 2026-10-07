import { z } from 'zod';
import { ERROR_CODES } from '@satet/shared';
import { HttpError } from '../lib/http.js';

/**
 * Valida y normaliza una parte de la petición con un esquema Zod.
 * @param {z.ZodType} schema
 * @param {'body' | 'query' | 'params'} [part]
 */
export function validate(schema, part = 'body') {
	return (req, _res, next) => {
		const result = schema.safeParse(req[part]);
		if (!result.success) {
			throw new HttpError(
				400,
				ERROR_CODES.VALIDATION_ERROR,
				'Datos inválidos.',
				z.treeifyError(result.error)
			);
		}
		if (part === 'body') req.body = result.data;
		else Object.defineProperty(req, part, { value: result.data });
		next();
	};
}
