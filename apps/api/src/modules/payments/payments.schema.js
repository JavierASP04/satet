import { PAYMENT_SUBJECTS, TAX_TYPES } from '@satet/shared';
import { z } from 'zod';
import { moneyPaymentSchema } from '../../lib/payment-fields.js';

const taxTypes = /** @type {[string, ...string[]]} */ (Object.values(TAX_TYPES));
const subjects = /** @type {[string, ...string[]]} */ (Object.values(PAYMENT_SUBJECTS));

const money = z
	.number()
	.positive('El monto pagado debe ser mayor que cero.')
	.max(9999999999999.99, 'El monto excede el máximo permitido.')
	.refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
		message: 'El monto admite hasta dos decimales.'
	});

export const uploadSchema = z
	.object({
		taxType: z.enum(taxTypes),
		originBank: z.string().trim().min(2, 'Indica el banco de origen.').max(100),
		paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida.'),
		amountPaidVed: money,
		relatedKind: z.enum(subjects).optional(),
		relatedId: z.uuid('Identificador de la obligación inválido.').optional(),
		...moneyPaymentSchema
	})
	.superRefine((body, ctx) => {
		const linked = Boolean(body.relatedKind) || Boolean(body.relatedId);
		if (linked && (!body.relatedKind || !body.relatedId)) {
			ctx.addIssue({
				code: 'custom',
				message: 'Indica el tipo y el identificador de la obligación.',
				path: ['relatedId']
			});
		}
	});

export const rejectSchema = z.object({
	rejectionReason: z.string().trim().min(1, 'Indica el motivo del rechazo.').max(500)
});

export const paymentIdParamsSchema = z.object({
	id: z.uuid('Identificador inválido.')
});

export const pendingQuerySchema = z.object({
	taxType: z.enum(taxTypes).optional()
});
