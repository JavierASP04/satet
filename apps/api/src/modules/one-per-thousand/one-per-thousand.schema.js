import { z } from 'zod';
import { moneyPaymentSchema } from '../../lib/payment-fields.js';

const orderSchema = z.object({
	paymentOrderNumber: z.string().trim().min(1, 'Indica el número de orden.').max(100),
	entityName: z.string().trim().min(1, 'Indica el ente o banco.').max(255),
	executedAmountVed: z
		.number()
		.positive('El monto ejecutado debe ser mayor que cero.')
		.max(9999999999999.99),
	executionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida.')
});

export const singleOrderSchema = orderSchema.extend(moneyPaymentSchema);

export const batchOrdersSchema = z.object({
	orders: z
		.array(orderSchema)
		.min(1, 'Agrega al menos una orden.')
		.max(100, 'La carga acepta hasta 100 órdenes.'),
	...moneyPaymentSchema
});

export const filingIdParamsSchema = z.object({
	id: z.uuid('Identificador inválido.')
});

export const resolveFilingSchema = z
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
