import { BCV_RATE_CRON, BCV_RATE_TIME_ZONE } from '@satet/shared';
import { withTransaction } from '../../db/tx.js';
import { fetchOfficialBcvEuroRate } from './bcv-rate.source.js';
import { saveDailyBcvRate } from './bcv-rate.store.js';
import {
	formatDateInTimeZone,
	msUntilNextDaily,
	parseDailyCron,
	shouldCatchUp
} from './bcv-rate.time.js';

/**
 * Consulta la tasa EUR/VED y la guarda con la fecha calendario de America/Caracas.
 * Una segunda ejecución el mismo día no inserta otra fila.
 * @param {{
 *   fetchRate?: () => Promise<{ currency: string, rateInVed: string }>,
 *   now?: () => Date,
 *   timeZone?: string,
 *   log?: (message: string) => void
 * }} [options]
 */
export async function runBcvRateJob(options = {}) {
	const fetchRate = options.fetchRate ?? fetchOfficialBcvEuroRate;
	const now = options.now ?? (() => new Date());
	const timeZone = options.timeZone ?? BCV_RATE_TIME_ZONE;
	const log = options.log ?? ((message) => console.log(message));

	const quote = await fetchRate();
	const effectiveDate = formatDateInTimeZone(now(), timeZone);
	const stored = await withTransaction((client) =>
		saveDailyBcvRate(client, {
			currency: quote.currency,
			rateInVed: quote.rateInVed,
			effectiveDate
		})
	);

	const state = stored.inserted ? 'registrada' : 'sin cambios (ya existía)';
	log(`[api] Tasa BCV ${stored.row.effective_date} ${stored.row.rate_in_ved} EUR/VED ${state}.`);
	return stored;
}

/**
 * Programa `BCV_RATE_CRON` (18:00) en America/Caracas.
 * Si el proceso arranca cuando esa hora de hoy ya pasó, ejecuta la tarea una vez.
 * No repone días anteriores.
 * @param {{
 *   run?: () => Promise<unknown>,
 *   now?: () => Date,
 *   schedule?: string,
 *   timeZone?: string,
 *   onError?: (err: unknown) => void
 * }} [options]
 * @returns {() => void}
 */
export function startBcvRateScheduler(options = {}) {
	const run = options.run ?? (() => runBcvRateJob());
	const now = options.now ?? (() => new Date());
	const timeZone = options.timeZone ?? BCV_RATE_TIME_ZONE;
	const { hour, minute } = parseDailyCron(options.schedule ?? BCV_RATE_CRON);
	const onError =
		options.onError ?? ((err) => console.error('[api] Falló la tarea de tasa BCV:', err));

	let timer;
	let stopped = false;

	const arm = () => {
		if (stopped) return;
		const delay = msUntilNextDaily(now(), hour, minute, timeZone);
		timer = setTimeout(async () => {
			try {
				await run();
			} catch (err) {
				onError(err);
			}
			arm();
		}, delay);
		timer.unref?.();
	};

	if (shouldCatchUp(now(), hour, minute, timeZone)) {
		Promise.resolve()
			.then(() => run())
			.catch(onError);
	}

	arm();

	return function stopBcvRateScheduler() {
		stopped = true;
		clearTimeout(timer);
	};
}
