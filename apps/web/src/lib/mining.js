import { DECLARATION_DEADLINE_DAY, MINING_ACTIVITIES, MINING_TAX_RATES } from '@satet/shared';

export const ACTIVITY_OPTIONS = [
	{ value: MINING_ACTIVITIES.EXTRACCION, label: 'Extracción' },
	{ value: MINING_ACTIVITIES.PROCESAMIENTO, label: 'Procesamiento' },
	{ value: MINING_ACTIVITIES.SUBPRODUCTO, label: 'Subproducto' }
];

/** @type {Record<string, string>} */
export const ACTIVITY_LABELS = Object.fromEntries(ACTIVITY_OPTIONS.map((option) => [option.value, option.label]));

/** @type {Record<string, string>} */
export const STATUS_LABELS = {
	PENDIENTE: 'Pendiente',
	VERIFICADO: 'Verificado',
	RECHAZADO: 'Rechazado'
};

/** @param {number} month */
export function monthName(month) {
	const name = new Intl.DateTimeFormat('es-VE', { month: 'long' }).format(new Date(2026, month - 1, 1));
	return name.charAt(0).toUpperCase() + name.slice(1);
}

/** @param {number} year @param {number} month */
export function periodLabel(year, month) {
	return `${monthName(month)} ${year}`;
}

/** @param {number} value */
export function money(value) {
	return `${new Intl.NumberFormat('es-VE', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(value)} VED`;
}

/** @param {number} value */
export function volume(value) {
	return `${new Intl.NumberFormat('es-VE', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(value)} m³`;
}

/** @param {string | null | undefined} value */
export function when(value) {
	if (!value) return '—';
	return new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

/** Fecha civil en Caracas. */
export function caracasDate(now = new Date()) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: 'America/Caracas',
		year: 'numeric',
		month: 'numeric',
		day: 'numeric'
	}).formatToParts(now);
	const read = (type) => Number(parts.find((part) => part.type === type)?.value);
	return { year: read('year'), month: read('month'), day: read('day') };
}

/** Período que corresponde declarar: el mes anterior en Caracas. */
export function previousPeriod(now = new Date()) {
	const { year, month } = caracasDate(now);
	if (month === 1) return { year: year - 1, month: 12 };
	return { year, month: month - 1 };
}

/**
 * Misma regla que la API: en término solo el mes anterior, presentado hasta el día 10.
 * @param {number} periodYear
 * @param {number} periodMonth
 * @param {Date} [now]
 */
export function isExtemporaneousSelection(periodYear, periodMonth, now = new Date()) {
	const today = caracasDate(now);
	const expected = previousPeriod(now);
	const onTime =
		today.day <= DECLARATION_DEADLINE_DAY &&
		periodYear === expected.year &&
		periodMonth === expected.month;
	return !onTime;
}

/** @param {string} activity */
export function rateFor(activity) {
	return MINING_TAX_RATES[activity] ?? null;
}
