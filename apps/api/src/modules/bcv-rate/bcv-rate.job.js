import { BCV_RATE_CRON } from '@satet/shared';

/**
 * Pendiente (Módulo 04): tarea diaria (`BCV_RATE_CRON`, 18:00) que consulta la tasa
 * oficial EUR/VED del BCV y la guarda en `bcv_rates`. Se encolará con Redis.
 */
export const bcvRateJob = {
	schedule: BCV_RATE_CRON,
	async run() {
		throw new Error('bcvRateJob: aún no implementado.');
	}
};
