import { z } from 'zod';

export const auditQuerySchema = z.object({
	action: z.string().trim().min(1).max(100).optional(),
	table: z.string().trim().min(1).max(100).optional(),
	limit: z.coerce.number().int().min(1).max(500).optional()
});
