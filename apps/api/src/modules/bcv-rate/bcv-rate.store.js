import { BCV_RATE_TIME_ZONE, CURRENCY } from '@satet/shared';
import { getPool } from '../../db/pool.js';
import { writeAudit } from '../../lib/audit.js';
import { bcvQuoteSchema, isoDateSchema } from './bcv-rate.schema.js';

const RATE_COLUMNS = `id, currency, rate_in_ved::text AS rate_in_ved,
  to_char(effective_date, 'YYYY-MM-DD') AS effective_date, created_at`;

const CRON_META = {
	ipAddress: '127.0.0.1',
	userAgent: 'satet-bcv-cron'
};

function assertCalendarDate(iso) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	if (!match) throw new Error('Fecha efectiva inválida.');
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const utc = new Date(Date.UTC(year, month - 1, day));
	if (
		utc.getUTCFullYear() !== year ||
		utc.getUTCMonth() !== month - 1 ||
		utc.getUTCDate() !== day
	) {
		throw new Error('Fecha efectiva inválida.');
	}
}

/**
 * Inserta la tasa del día. Si `effective_date` ya existe, no pisa la fila ni escribe otra auditoría.
 * @param {import('pg').PoolClient} client
 * @param {{ currency: string, rateInVed: string, effectiveDate: string }} input
 */
export async function saveDailyBcvRate(client, input) {
	const quote = bcvQuoteSchema.parse({
		currency: input.currency,
		rateInVed: input.rateInVed
	});
	const effectiveDate = isoDateSchema.parse(input.effectiveDate);
	assertCalendarDate(effectiveDate);

	const inserted = await client.query(
		`INSERT INTO bcv_rates (currency, rate_in_ved, effective_date)
     VALUES ($1, $2, $3)
     ON CONFLICT (effective_date) DO NOTHING
     RETURNING ${RATE_COLUMNS}`,
		[quote.currency, quote.rateInVed, effectiveDate]
	);

	if (inserted.rows[0]) {
		const row = inserted.rows[0];
		await writeAudit(client, {
			userId: null,
			action: 'CREATE',
			tableAffected: 'bcv_rates',
			recordId: row.id,
			oldValues: null,
			newValues: {
				currency: row.currency,
				rate_in_ved: row.rate_in_ved,
				effective_date: row.effective_date
			},
			...CRON_META
		});
		return { inserted: true, row };
	}

	const existing = await client.query(
		`SELECT ${RATE_COLUMNS} FROM bcv_rates WHERE effective_date = $1`,
		[effectiveDate]
	);
	if (!existing.rows[0]) throw new Error('No se pudo leer la tasa BCV ya registrada.');
	return { inserted: false, row: existing.rows[0] };
}

/**
 * Tasa EUR vigente: la de mayor `effective_date` que no sea posterior a hoy en America/Caracas.
 * La usan el endpoint y, más adelante, el módulo de timbres.
 * @param {import('pg').Pool | import('pg').PoolClient} [db]
 */
export async function findCurrentBcvRate(db = getPool()) {
	const { rows } = await db.query(
		`SELECT ${RATE_COLUMNS}
     FROM bcv_rates
     WHERE currency = $1
       AND effective_date <= (CURRENT_TIMESTAMP AT TIME ZONE $2)::date
     ORDER BY effective_date DESC
     LIMIT 1`,
		[CURRENCY.EUR, BCV_RATE_TIME_ZONE]
	);
	return rows[0] ?? null;
}
