import { ROYALTY_PAYMENT_FORMS } from '@satet/shared';
import { z } from 'zod';
import { moneyPaymentSchema } from '../../lib/payment-fields.js';

const forms = /** @type {[string, ...string[]]} */ (Object.values(ROYALTY_PAYMENT_FORMS));

export const createRoyaltySchema = z.object({
	periodYear: z.number().int().min(2000).max(2100),
	extractedSquareMeters: z
		.number()
		.positive('Indica los metros cuadrados extraídos.')
		.max(999999999999.99)
});

export const instructRoyaltySchema = z.object({
	paymentForm: z.enum(forms)
});

export const payRoyaltySchema = z.object({
	bankReferenceNumber: moneyPaymentSchema.bankReferenceNumber,
	bankAccountId: z.uuid('Selecciona la cuenta institucional.'),
	voucher: moneyPaymentSchema.voucher
});

export const royaltyIdParamsSchema = z.object({
	id: z.uuid('Identificador inválido.')
});

export const resolveRoyaltySchema = z
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
