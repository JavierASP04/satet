import { z } from 'zod';

const orderSchema = z.object({
	paymentOrderNumber: z.string().trim().min(1, 'Indica el número de orden.').max(100),
	entityName: z.string().trim().min(1, 'Indica el ente o banco.').max(255),
	executedAmountVed: z
		.number()
		.positive('El monto ejecutado debe ser mayor que cero.')
		.max(9999999999999.99),
	executionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida.')
});

export const singleOrderSchema = orderSchema;

export const batchOrdersSchema = z.object({
	orders: z
		.array(orderSchema)
		.min(1, 'Agrega al menos una orden.')
		.max(100, 'La carga acepta hasta 100 órdenes.')
});
