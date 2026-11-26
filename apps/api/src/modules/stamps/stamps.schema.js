import { z } from 'zod';

/** Código de una fila del tabulador. El monto no se escribe a mano. */
export const stampUuidParamsSchema = z.object({
	uuid: z.uuid('No se encontró el timbre.')
});

export const resolveStampSchema = z
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

export const purchaseSchema = z.object({
	feeCode: z
		.string()
		.trim()
		.min(1, 'Indica el concepto del tabulador.')
		.max(40, 'El código del concepto es demasiado largo.')
});
