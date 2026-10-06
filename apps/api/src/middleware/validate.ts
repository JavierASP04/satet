import type { RequestHandler } from 'express';
import { z } from 'zod';
import { ERROR_CODES } from '@satet/shared';
import { HttpError } from '../lib/http.ts';

type RequestPart = 'body' | 'query' | 'params';

/** Valida y normaliza una parte de la petición con un esquema Zod. */
export function validate(schema: z.ZodType, part: RequestPart = 'body'): RequestHandler {
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
