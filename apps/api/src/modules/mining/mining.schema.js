import { MINING_ACTIVITIES } from '@satet/shared';
import { z } from 'zod';

const activities = /** @type {[string, ...string[]]} */ (Object.values(MINING_ACTIVITIES));

export const createDeclarationSchema = z.object({
	periodYear: z.number().int().min(2000).max(2100),
	periodMonth: z.number().int().min(1).max(12),
	activityType: z.enum(activities),
	materialType: z.string().trim().min(1, 'Indica el material.').max(100),
	volumeCubicMeters: z
		.number()
		.positive('El volumen debe ser mayor que cero.')
		.max(9999999999.99),
	commercialValuePerUnit: z
		.number()
		.positive('El valor comercial debe ser mayor que cero.')
		.max(9999999999.99)
});
