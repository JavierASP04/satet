import { z } from 'zod';

export const verifyStampSchema = z
	.object({
		officeName: z
			.string()
			.trim()
			.min(2, 'Indica la oficina del SAREN.')
			.max(255, 'El nombre de la oficina es demasiado largo.'),
		uuid: z.uuid('El serial del timbre no es válido.').optional(),
		qrPayload: z
			.string()
			.trim()
			.min(2, 'El código QR está vacío.')
			.max(4000, 'El código QR excede el tamaño permitido.')
			.optional()
	})
	.superRefine((body, ctx) => {
		if (!body.uuid && !body.qrPayload) {
			ctx.addIssue({
				code: 'custom',
				message: 'Indica el serial del timbre o el contenido del código QR.',
				path: ['uuid']
			});
		}
	});

export const historyQuerySchema = z.object({
	officeName: z.string().trim().min(1).max(255).optional(),
	limit: z.coerce.number().int().min(1).max(500).optional()
});
