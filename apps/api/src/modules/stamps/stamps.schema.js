import { z } from 'zod';

/** Monto del timbre en euros. Cabe en NUMERIC(10,2) y admite hasta dos decimales. */
export const purchaseSchema = z.object({
	amountEur: z
		.number()
		.positive('El monto en euros debe ser mayor que cero.')
		.max(99_999_999.99, 'El monto en euros excede el máximo permitido.')
		.refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6, {
			message: 'El monto en euros admite hasta dos decimales.'
		})
});
