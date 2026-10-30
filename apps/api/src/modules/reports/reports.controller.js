import { getPool } from '../../db/pool.js';
import { buildXlsx } from '../../lib/xlsx.js';
import { formatFixed } from '../../lib/present.js';
import { sendPdf } from '../../lib/planilla.js';
import { renderManagementPdf } from './reports.pdf.js';

/** Ramos de la especificación, en ese orden. La cifra de cada uno sale de los pagos. */
const BRANCHES = [
	{ taxType: 'MINERO', label: 'Minería' },
	{ taxType: 'UN_POR_MIL', label: '1x1000' },
	{ taxType: 'TIMBRE_FISCAL', label: 'Timbres' }
];

const VERIFIED = `status = 'VERIFICADO' AND verified_at IS NOT NULL`;

/**
 * Recaudación ya registrada: pagos que tesorería dejó en VERIFICADO.
 * El mes es el calendario de America/Caracas de verified_at.
 */
export async function loadRevenueSummary() {
	const pool = getPool();
	const [total, byType, byMonth] = await Promise.all([
		pool.query(
			`SELECT COALESCE(SUM(amount_paid_ved), 0)::text AS total_ved
			 FROM payments
			 WHERE ${VERIFIED}`
		),
		pool.query(
			`SELECT tax_type, SUM(amount_paid_ved)::text AS total_ved
			 FROM payments
			 WHERE ${VERIFIED}
			 GROUP BY tax_type`
		),
		pool.query(
			`SELECT to_char(timezone('America/Caracas', verified_at), 'YYYY-MM') AS month,
			        tax_type,
			        SUM(amount_paid_ved)::text AS total_ved
			 FROM payments
			 WHERE ${VERIFIED}
			 GROUP BY 1, 2
			 ORDER BY 1, 2`
		)
	]);

	const branches = branchTotals(byType.rows);
	/** @type {Map<string, Map<string, string>>} */
	const months = new Map();
	for (const row of byMonth.rows) {
		const bucket = months.get(row.month) ?? new Map();
		bucket.set(row.tax_type, row.total_ved);
		months.set(row.month, bucket);
	}

	return {
		currency: 'VED',
		totalVed: money(total.rows[0].total_ved),
		byBranch: branches,
		months: [...months.entries()].map(([month, amounts]) => {
			const monthBranches = branchTotals(
				[...amounts.entries()].map(([tax_type, total_ved]) => ({ tax_type, total_ved }))
			);
			return {
				month,
				totalVed: sumMoney(monthBranches.map((branch) => branch.totalVed)),
				byBranch: monthBranches
			};
		})
	};
}

/** GET /reports/revenue-summary */
export async function revenueSummary(_req, res) {
	res.status(200).json(await loadRevenueSummary());
}

/** GET /reports/export/excel */
export async function exportExcel(_req, res) {
	const { rows } = await getPool().query(
		`SELECT to_char(p.payment_date, 'YYYY-MM-DD') AS payment_date,
		        t.rif_number, t.company_name, p.tax_type, p.bank_reference_number,
		        p.origin_bank, b.bank_name, b.account_number,
		        p.amount_paid_ved::text AS amount_paid_ved, p.status,
		        p.rejection_reason, p.verified_at, p.related_kind, p.related_id::text AS related_id
		 FROM payments p
		 JOIN taxpayers t ON t.id = p.taxpayer_id
		 JOIN bank_accounts b ON b.id = p.target_bank_account_id
		 ORDER BY p.payment_date, p.created_at`
	);
	const header = [
		'Fecha de pago',
		'RIF',
		'Contribuyente',
		'Ramo',
		'Referencia',
		'Banco de origen',
		'Banco destino',
		'Cuenta destino',
		'Monto VED',
		'Estado',
		'Motivo de rechazo',
		'Verificado en',
		'Obligación',
		'Identificador'
	];
	const body = rows.map((row) => [
		row.payment_date,
		row.rif_number,
		row.company_name,
		row.tax_type,
		row.bank_reference_number,
		row.origin_bank,
		row.bank_name,
		row.account_number,
		money(row.amount_paid_ved),
		row.status,
		row.rejection_reason ?? '',
		iso(row.verified_at) ?? '',
		row.related_kind ?? '',
		row.related_id ?? ''
	]);
	const file = buildXlsx('Conciliacion', [header, ...body]);
	res.status(200);
	res.setHeader(
		'Content-Type',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	);
	res.setHeader('Content-Disposition', 'attachment; filename="conciliacion.xlsx"');
	res.setHeader('Content-Length', String(file.length));
	res.send(file);
}

/** GET /reports/export/pdf */
export async function exportPdf(_req, res) {
	const summary = await loadRevenueSummary();
	const pdf = await renderManagementPdf(summary);
	sendPdf(res, pdf, 'informe-gestion.pdf');
}

/**
 * @param {{ tax_type: string, total_ved: string }[]} rows
 */
function branchTotals(rows) {
	const amounts = new Map(rows.map((row) => [row.tax_type, row.total_ved]));
	return BRANCHES.map((branch) => ({
		taxType: branch.taxType,
		label: branch.label,
		totalVed: money(amounts.get(branch.taxType) ?? '0')
	}));
}

/** @param {string[]} values */
function sumMoney(values) {
	const cents = values.reduce((total, value) => total + toCents(value), 0);
	const sign = cents < 0 ? '-' : '';
	const abs = Math.abs(cents);
	return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

/** @param {string} value */
function toCents(value) {
	const text = formatFixed(value, 2);
	const negative = text.startsWith('-');
	const digits = text.replace('-', '').replace('.', '');
	return (negative ? -1 : 1) * Number(digits);
}

/** @param {string | null | undefined} value */
function money(value) {
	return formatFixed(value ?? '0', 2);
}

/** @param {unknown} value */
function iso(value) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(String(value));
	return date.toISOString();
}
