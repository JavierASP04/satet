import { ERROR_CODES } from '@satet/shared';
import { HttpError } from '../../lib/http.js';
import { findCurrentBcvRate } from './bcv-rate.store.js';

/** @param {string} value */
function formatRate(value) {
	const [whole, frac = ''] = String(value).split('.');
	return `${whole}.${frac.padEnd(4, '0').slice(0, 4)}`;
}

/** @param {Record<string, any>} row */
export function toBcvRate(row) {
	const createdAt = row.created_at instanceof Date ? row.created_at : new Date(row.created_at);
	return {
		id: row.id,
		currency: row.currency,
		rateInVed: formatRate(row.rate_in_ved),
		effectiveDate: row.effective_date,
		createdAt: createdAt.toISOString()
	};
}

export async function getCurrent(_req, res) {
	const row = await findCurrentBcvRate();
	if (!row) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No hay una tasa BCV vigente.');
	}
	res.json({ rate: toBcvRate(row) });
}
