/** Tasa `41.2500` como `41,2500`, sin redondear el cuarto decimal. */
export function formatRate(value) {
	const [whole, frac = ''] = String(value ?? '').split('.');
	const digits = frac.padEnd(4, '0').slice(0, 4);
	const grouped = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 }).format(Number(whole || 0));
	return `${grouped},${digits}`;
}

/** `YYYY-MM-DD` en calendario local, sin corrimiento por zona horaria. */
export function formatCalendarDate(iso) {
	if (!iso) return '—';
	const [year, month, day] = String(iso).split('-').map(Number);
	if (!year || !month || !day) return String(iso);
	const text = new Intl.DateTimeFormat('es-VE', { dateStyle: 'long' }).format(new Date(year, month - 1, day));
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/** @param {string | null | undefined} value */
export function formatRegisteredAt(value) {
	if (!value) return '—';
	return new Intl.DateTimeFormat('es-VE', {
		dateStyle: 'medium',
		timeStyle: 'short',
		timeZone: 'America/Caracas'
	}).format(new Date(value));
}

/**
 * Bolívares de un timbre: euros × tasa, con la tasa en 4 decimales y el resultado en céntimos.
 * @param {string | number} euros
 * @param {string} rateInVed
 */
export function vedFromEuros(euros, rateInVed) {
	const amount = Number(euros);
	if (!(amount > 0) || !rateInVed) return null;
	const [whole, frac = ''] = String(rateInVed).split('.');
	const rateScaled = Number(whole) * 10000 + Number(frac.padEnd(4, '0').slice(0, 4));
	if (!Number.isFinite(rateScaled) || rateScaled <= 0) return null;
	const cents = Math.round(amount * 100);
	if (!Number.isFinite(cents) || cents <= 0) return null;
	return Math.round((cents * rateScaled) / 10000) / 100;
}

/** @param {number} value */
export function formatVed(value) {
	return `${new Intl.NumberFormat('es-VE', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(value)} VED`;
}

/** @param {string | number} value */
export function formatEur(value) {
	const amount = Number(value);
	if (!(amount > 0)) return '—';
	return `${new Intl.NumberFormat('es-VE', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(amount)} EUR`;
}
