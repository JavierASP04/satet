import { renderPlanilla } from '../../lib/planilla.js';

const MONTHS = [
	'Enero',
	'Febrero',
	'Marzo',
	'Abril',
	'Mayo',
	'Junio',
	'Julio',
	'Agosto',
	'Septiembre',
	'Octubre',
	'Noviembre',
	'Diciembre'
];

/**
 * Informe de gestión con las mismas cifras del resumen.
 * La meta proyectada no está en la especificación: el texto lo dice y no imprime una cifra.
 * @param {{
 *   currency: string,
 *   totalVed: string,
 *   byBranch: { label: string, totalVed: string }[],
 *   months: { month: string, totalVed: string, byBranch: { label: string, totalVed: string }[] }[]
 * }} summary
 */
export function renderManagementPdf(summary) {
	const money = (value) => ved(value, summary.currency);
	return renderPlanilla({
		title: 'Informe de gestión',
		intro:
			'Recaudación de los pagos verificados, en bolívares. La especificación no define la meta proyectada. Este informe no la compara.',
		facts: [],
		tables: [
			{
				title: 'Por ramo',
				widths: [1.6, 1],
				align: ['left', 'right'],
				head: ['Ramo', 'Recaudado'],
				rows: summary.byBranch.map((branch) => [branch.label, money(branch.totalVed)])
			},
			{
				title: 'Por mes',
				widths: [1.4, 1, 1, 1, 1.15],
				align: ['left', 'right', 'right', 'right', 'right'],
				head: ['Mes', ...summary.byBranch.map((branch) => branch.label), 'Total'],
				rows: summary.months.map((month) => [
					monthLabel(month.month),
					...month.byBranch.map((branch) => money(branch.totalVed)),
					money(month.totalVed)
				]),
				empty: 'Sin pagos verificados.'
			}
		],
		totalLabel: 'Total acumulado',
		total: money(summary.totalVed)
	});
}

/** @param {string} value @param {string} currency */
function ved(value, currency) {
	const amount = Number(value);
	if (!Number.isFinite(amount)) return `${value} ${currency}`;
	const sign = amount < 0 ? '-' : '';
	const [whole, fraction] = Math.abs(amount).toFixed(2).split('.');
	return `${sign}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${fraction} ${currency}`;
}

/** @param {string} value */
function monthLabel(value) {
	const [year, month] = String(value).split('-').map(Number);
	if (!year || !month) return value;
	return `${MONTHS[month - 1] ?? value} ${year}`;
}
