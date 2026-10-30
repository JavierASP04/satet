import { MINING_ACTIVITIES } from '@satet/shared';
import { z } from 'zod';
import { moneyPaymentSchema } from '../../lib/payment-fields.js';

const activities = /** @type {[string, ...string[]]} */ (Object.values(MINING_ACTIVITIES));

const lineSchema = z.object({
	activityType: z.enum(activities),
	materialType: z.string().trim().min(1, 'Indica el material.').max(100),
	volumeCubicMeters: z.number().positive('El volumen debe ser mayor que cero.').max(9999999999.99),
	commercialValuePerUnit: z
		.number()
		.positive('El valor comercial debe ser mayor que cero.')
		.max(9999999999.99)
});

export const createDeclarationSchema = z
	.object({
		periodYear: z.number().int().min(2000).max(2100),
		periodMonth: z.number().int().min(1).max(12),
		lines: z.array(lineSchema).min(1, 'Agrega al menos un material.').max(30).optional(),
		activityType: z.enum(activities).optional(),
		materialType: z.string().trim().min(1).max(100).optional(),
		volumeCubicMeters: z.number().positive().max(9999999999.99).optional(),
		commercialValuePerUnit: z.number().positive().max(9999999999.99).optional(),
		...moneyPaymentSchema
	})
	.superRefine((body, ctx) => {
		const single =
			body.activityType &&
			body.materialType &&
			body.volumeCubicMeters != null &&
			body.commercialValuePerUnit != null;
		if ((!body.lines || body.lines.length === 0) && !single) {
			ctx.addIssue({
				code: 'custom',
				message: 'Indica al menos un material.',
				path: ['lines']
			});
		}
	});

export const resolveSchema = z
	.object({
		decision: z.enum(['APROBAR', 'RECHAZAR']),
		rejectionReason: z.string().trim().min(1).max(500).optional()
	})
	.superRefine((body, ctx) => {
		if (body.decision === 'RECHAZAR' && !body.rejectionReason) {
			ctx.addIssue({
				code: 'custom',
				message: 'Indica el motivo del rechazo.',
				path: ['rejectionReason']
			});
		}
	});

export const declarationIdParamsSchema = z.object({
	id: z.uuid('Identificador inválido.')
});
