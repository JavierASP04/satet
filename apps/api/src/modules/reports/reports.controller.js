import { ERROR_CODES, STAMP_VALIDITY_DAYS } from '@satet/shared';
import { getPool } from '../../db/pool.js';
import { HttpError } from '../../lib/http.js';
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

const GRAINS = new Set(['day', 'week', 'fortnight', 'month', 'year']);

/** @param {import('express').Request['query']} query */
export function reportRange(query) {
	const grain = query.grain ? String(query.grain) : null;
	const from = query.from ? String(query.from) : null;
	const to = query.to ? String(query.to) : null;
	if (grain && !GRAINS.has(grain)) {
		throw new HttpError(
			400,
			ERROR_CODES.VALIDATION_ERROR,
			'El período debe ser día, semana, quincena, mes o año.'
		);
	}
	if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) {
		throw new HttpError(400, ERROR_CODES.VALIDATION_ERROR, 'La fecha del reporte no es válida.');
	}
	return { grain, from, to };
}

/** @param {'day' | 'week' | 'fortnight' | 'month' | 'year' | null} grain */
function bucketExpr(grain) {
	if (grain === 'day') return `to_char(timezone('America/Caracas', verified_at), 'YYYY-MM-DD')`;
	if (grain === 'week') return `to_char(timezone('America/Caracas', verified_at), 'IYYY-"W"IW')`;
	if (grain === 'fortnight') {
		return `to_char(timezone('America/Caracas', verified_at), 'YYYY-MM') || CASE WHEN EXTRACT(DAY FROM timezone('America/Caracas', verified_at)) <= 15 THEN '-1Q' ELSE '-2Q' END`;
	}
	if (grain === 'year') return `to_char(timezone('America/Caracas', verified_at), 'YYYY')`;
	return `to_char(timezone('America/Caracas', verified_at), 'YYYY-MM')`;
}

/**
 * @param {{ grain: string | null, from: string | null, to: string | null }} range
 * @param {unknown[]} params
 */
function rangeClause(range, params) {
	const parts = [];
	if (range.from) {
		params.push(range.from);
		parts.push(`(timezone('America/Caracas', verified_at))::date >= $${params.length}::date`);
	}
	if (range.to) {
		params.push(range.to);
		parts.push(`(timezone('America/Caracas', verified_at))::date <= $${params.length}::date`);
	}
	return parts.length ? ` AND ${parts.join(' AND ')}` : '';
}

/**
 * Recaudación ya registrada: pagos verificados.
 * El mes es el calendario de America/Caracas de verified_at.
 * @param {{ grain?: string | null, from?: string | null, to?: string | null }} [range]
 */
export async function loadRevenueSummary(range = { grain: null, from: null, to: null }) {
	const pool = getPool();
	const totalParams = [];
	const typeParams = [];
	const monthParams = [];
	const bucketParams = [];
	const totalWhere = rangeClause(range, totalParams);
	const typeWhere = rangeClause(range, typeParams);
	const monthWhere = rangeClause(range, monthParams);
	const bucketWhere = rangeClause(range, bucketParams);
	const [total, byType, byMonth, byBucket, stamps] = await Promise.all([
		pool.query(
			`SELECT COALESCE(SUM(amount_paid_ved), 0)::text AS total_ved
			 FROM payments
			 WHERE ${VERIFIED}${totalWhere}`,
			totalParams
		),
		pool.query(
			`SELECT tax_type, SUM(amount_paid_ved)::text AS total_ved
			 FROM payments
			 WHERE ${VERIFIED}${typeWhere}
			 GROUP BY tax_type`,
			typeParams
		),
		pool.query(
			`SELECT to_char(timezone('America/Caracas', verified_at), 'YYYY-MM') AS month,
			        tax_type,
			        SUM(amount_paid_ved)::text AS total_ved
			 FROM payments
			 WHERE ${VERIFIED}${monthWhere}
			 GROUP BY 1, 2
			 ORDER BY 1, 2`,
			monthParams
		),
		pool.query(
			`SELECT ${bucketExpr(range.grain)} AS bucket,
			        tax_type,
			        SUM(amount_paid_ved)::text AS total_ved
			 FROM payments
			 WHERE ${VERIFIED}${bucketWhere}
			 GROUP BY 1, 2
			 ORDER BY 1, 2`,
			bucketParams
		),
		loadStampReport(range)
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
		grain: range.grain ?? 'month',
		from: range.from,
		to: range.to,
		totalVed: money(total.rows[0].total_ved),
		byBranch: branches,
		stamps,
		buckets: bucketList(byBucket.rows),
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
export async function revenueSummary(req, res) {
	res.status(200).json(await loadRevenueSummary(reportRange(req.query)));
}

/** GET /reports/export/excel */
export async function exportExcel(req, res) {
	const range = reportRange(req.query);
	const params = [];
	const filters = [];
	if (range.from) {
		params.push(range.from);
		filters.push(`p.payment_date >= $${params.length}::date`);
	}
	if (range.to) {
		params.push(range.to);
		filters.push(`p.payment_date <= $${params.length}::date`);
	}
	const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
	const { rows } = await getPool().query(
		`SELECT to_char(p.payment_date, 'YYYY-MM-DD') AS payment_date,
		        t.rif_number, t.company_name, p.tax_type, p.bank_reference_number,
		        p.origin_bank, b.bank_name, b.account_number,
		        p.amount_paid_ved::text AS amount_paid_ved, p.status,
		        p.rejection_reason, p.verified_at, p.related_kind, p.related_id::text AS related_id
		 FROM payments p
		 JOIN taxpayers t ON t.id = p.taxpayer_id
		 JOIN bank_accounts b ON b.id = p.target_bank_account_id
		 ${where}
		 ORDER BY p.payment_date, p.created_at`,
		params
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
export async function exportPdf(req, res) {
	const summary = await loadRevenueSummary(reportRange(req.query));
	const pdf = await renderManagementPdf(summary);
	sendPdf(res, pdf, 'informe-gestion.pdf');
}

/**
 * @param {{ grain: string | null, from: string | null, to: string | null }} range
 */
async function loadStampReport(range) {
	const params = [];
	const parts = [`status IN ('ACTIVO', 'CONSUMIDO')`];
	if (range.from) {
		params.push(range.from);
		parts.push(`(timezone('America/Caracas', created_at))::date >= $${params.length}::date`);
	}
	if (range.to) {
		params.push(range.to);
		parts.push(`(timezone('America/Caracas', created_at))::date <= $${params.length}::date`);
	}
	const payParams = [];
	const payParts = [`tax_type = 'TIMBRE_FISCAL'`, VERIFIED];
	if (range.from) {
		payParams.push(range.from);
		payParts.push(
			`(timezone('America/Caracas', verified_at))::date >= $${payParams.length}::date`
		);
	}
	if (range.to) {
		payParams.push(range.to);
		payParts.push(`(timezone('America/Caracas', verified_at))::date <= $${payParams.length}::date`);
	}
	const [sold, collected] = await Promise.all([
		getPool().query(
			`SELECT COUNT(*)::int AS sold, COUNT(DISTINCT taxpayer_id)::int AS users
			 FROM electronic_stamps
			 WHERE ${parts.join(' AND ')}`,
			params
		),
		getPool().query(
			`SELECT COALESCE(SUM(amount_paid_ved), 0)::text AS total_ved
			 FROM payments
			 WHERE ${payParts.join(' AND ')}`,
			payParams
		)
	]);
	return {
		usersServed: sold.rows[0].users,
		stampsSold: sold.rows[0].sold,
		amountCollectedVed: money(collected.rows[0].total_ved),
		validityDays: STAMP_VALIDITY_DAYS
	};
}

/** @param {{ bucket: string, tax_type: string, total_ved: string }[]} rows */
function bucketList(rows) {
	/** @type {Map<string, Map<string, string>>} */
	const groups = new Map();
	for (const row of rows) {
		const bucket = groups.get(row.bucket) ?? new Map();
		bucket.set(row.tax_type, row.total_ved);
		groups.set(row.bucket, bucket);
	}
	return [...groups.entries()].map(([label, amounts]) => {
		const byBranch = branchTotals(
			[...amounts.entries()].map(([tax_type, total_ved]) => ({ tax_type, total_ved }))
		);
		return {
			label,
			totalVed: sumMoney(byBranch.map((branch) => branch.totalVed)),
			byBranch
		};
	});
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
