import { ROYALTY_PAYMENT_FORMS } from '@satet/shared';
import { z } from 'zod';
import { moneyPaymentSchema } from '../../lib/payment-fields.js';

const forms = /** @type {[string, ...string[]]} */ (Object.values(ROYALTY_PAYMENT_FORMS));

export const createRoyaltySchema = z
	.object({
		periodYear: z.number().int().min(2000).max(2100),
		commercialValuePerUnit: z
			.number()
			.positive('El valor comercial debe ser mayor que cero.')
			.max(9999999999.99),
		paymentForm: z.enum(forms),
		bankReferenceNumber: moneyPaymentSchema.bankReferenceNumber.optional(),
		bankAccountId: z.uuid().optional(),
		voucher: moneyPaymentSchema.voucher.optional()
	})
	.superRefine((body, ctx) => {
		if (body.paymentForm === ROYALTY_PAYMENT_FORMS.ESPECIE) return;
		if (!body.bankReferenceNumber) {
			ctx.addIssue({
				code: 'custom',
				message: 'Indica el número de referencia bancaria.',
				path: ['bankReferenceNumber']
			});
		}
		if (!body.bankAccountId) {
			ctx.addIssue({
				code: 'custom',
				message: 'Selecciona la cuenta institucional.',
				path: ['bankAccountId']
			});
		}
		if (!body.voucher) {
			ctx.addIssue({
				code: 'custom',
				message: 'Adjunta el comprobante de pago.',
				path: ['voucher']
			});
		}
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
