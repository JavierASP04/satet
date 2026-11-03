import { z } from 'zod';

/** Código de una fila del tabulador. El monto no se escribe a mano. */
export const purchaseSchema = z.object({
	feeCode: z
		.string()
		.trim()
		.min(1, 'Indica el concepto del tabulador.')
		.max(40, 'El código del concepto es demasiado largo.')
});
