import { z } from 'zod';
import { CURRENCY } from '@satet/shared';

/** `NUMERIC(12,4)`: hasta 8 enteros y exactamente 4 decimales, mayor que cero. */
export const bcvRateValueSchema = z
	.string()
	.regex(/^\d{1,8}\.\d{4}$/)
	.refine(
		(value) => {
			const [whole, frac] = value.split('.');
			return whole.replace(/^0+/, '') !== '' || frac !== '0000';
		},
		{ error: 'La tasa BCV debe ser mayor que cero.' }
	);

export const bcvQuoteSchema = z.object({
	currency: z.literal(CURRENCY.EUR),
	rateInVed: bcvRateValueSchema
});

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
