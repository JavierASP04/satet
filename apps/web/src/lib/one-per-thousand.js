export const STATUS_LABELS = {
	PENDIENTE: 'Pendiente',
	VERIFICADO: 'Verificado',
	RECHAZADO: 'Rechazado'
};

/** @param {number} value */
export function formatVed(value) {
	return `${new Intl.NumberFormat('es-VE', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(value)} VED`;
}

/** `YYYY-MM-DD` sin corrimiento de zona. */
export function formatCalendarDate(iso) {
	if (!iso) return '—';
	const [year, month, day] = String(iso).split('-').map(Number);
	if (!year || !month || !day) return String(iso);
	const text = new Intl.DateTimeFormat('es-VE', { dateStyle: 'medium' }).format(
		new Date(year, month - 1, day)
	);
	return text.charAt(0).toUpperCase() + text.slice(1);
}

export function todayInCaracas() {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'America/Caracas',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date());
}

/** Impuesto = monto ejecutado / 1000, en céntimos. */
export function taxFromExecuted(amount) {
	const value = Number(amount);
	if (!(value > 0)) return null;
	const cents = Math.round(value * 100);
	return Math.round(cents / 1000) / 100;
}
