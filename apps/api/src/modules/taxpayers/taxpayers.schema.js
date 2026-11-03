import { z } from 'zod';

export const taxpayerIdParamsSchema = z.object({
	id: z.uuid('Identificador inválido.')
});

export const approveSchema = z.object({
	approved: z.boolean()
});
