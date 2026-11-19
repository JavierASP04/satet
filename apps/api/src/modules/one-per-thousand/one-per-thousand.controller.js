import {
	ERROR_CODES,
	ONE_PER_THOUSAND_DIVISOR,
	PAYMENT_STATUS,
	PERMISSIONS,
	TAX_TYPES,
	hasPermission
} from '@satet/shared';
import { getPool } from '../../db/pool.js';
import { writeAudit } from '../../lib/audit.js';
import { HttpError } from '../../lib/http.js';
import { requireBankAccount } from '../../lib/payment-fields.js';
import { renderPlanilla, sendPdf } from '../../lib/planilla.js';
import { toOnePerThousand } from '../../lib/present.js';
import { requestMeta } from '../../lib/request-meta.js';
import { readVoucher } from '../../lib/voucher.js';

const ZONE = 'America/Caracas';

const COLUMNS = `
	d.id, d.filing_id, d.taxpayer_id, d.payment_order_number, d.entity_name,
	d.executed_amount_ved, d.tax_amount_ved,
	to_char(d.execution_date, 'YYYY-MM-DD') AS execution_date,
	f.status, f.total_tax_ved::text AS total_tax_ved, d.created_at
`;

/** @param {string} iso */
function calendarDate(iso) {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const utc = new Date(Date.UTC(year, month - 1, day));
	if (
		utc.getUTCFullYear() !== year ||
		utc.getUTCMonth() !== month - 1 ||
		utc.getUTCDate() !== day
	) {
		return null;
	}
	return iso;
}

function todayInCaracas() {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date());
}

/** @param {{ executionDate: string }[]} orders */
function assertDates(orders) {
	const today = todayInCaracas();
	for (const order of orders) {
		const date = calendarDate(order.executionDate);
		if (!date) {
			throw new HttpError(400, ERROR_CODES.VALIDATION_ERROR, 'La fecha de ejecución no existe.');
		}
		if (date > today) {
			throw new HttpError(
				400,
				ERROR_CODES.VALIDATION_ERROR,
				'La fecha de ejecución no puede ser posterior a hoy.'
			);
		}
	}
}

/** @param {import('express').Request} req */
async function taxpayerForUser(req) {
	const { rows } = await getPool().query(
		'SELECT id, is_approved FROM taxpayers WHERE user_id = $1',
		[req.user.id]
	);
	return rows[0] ?? null;
}

/** @param {import('express').Request} req */
async function approvedTaxpayer(req) {
	const taxpayer = await taxpayerForUser(req);
	if (!taxpayer) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No hay un expediente asociado a esta cuenta.');
	}
	if (!taxpayer.is_approved) {
		throw new HttpError(
			403,
			ERROR_CODES.FORBIDDEN,
			'El expediente debe estar aprobado para registrar retenciones.'
		);
	}
	return taxpayer;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} taxpayerId
 * @param {{ paymentOrderNumber: string, entityName: string, executedAmountVed: number, executionDate: string }[]} orders
 * @param {import('express').Request} req
 */
async function insertOrders(client, taxpayerId, filingId, orders, req) {
	const numbers = orders.map((order) => order.paymentOrderNumber);
	const seen = new Set();
	for (const number of numbers) {
		if (seen.has(number)) {
			throw new HttpError(
				400,
				ERROR_CODES.VALIDATION_ERROR,
				`La orden ${number} está repetida en la carga.`
			);
		}
		seen.add(number);
	}

	const existing = await client.query(
		`SELECT payment_order_number
		 FROM one_per_thousand_declarations
		 WHERE taxpayer_id = $1 AND payment_order_number = ANY($2::varchar[])`,
		[taxpayerId, numbers]
	);
	if (existing.rows.length > 0) {
		const list = existing.rows.map((row) => row.payment_order_number).join(', ');
		throw new HttpError(409, ERROR_CODES.CONFLICT, `Ya está registrada la orden ${list}.`);
	}

	const created = [];
	for (const order of orders) {
		const { rows } = await client.query(
			`INSERT INTO one_per_thousand_declarations (
				filing_id, taxpayer_id, payment_order_number, entity_name,
				executed_amount_ved, tax_amount_ved, execution_date, status
			) VALUES (
				$1, $2, $3, $4, $5, ROUND($5::numeric / $6, 2), $7, 'PENDIENTE'
			)
			RETURNING id, filing_id, taxpayer_id, payment_order_number, entity_name,
				executed_amount_ved, tax_amount_ved,
				to_char(execution_date, 'YYYY-MM-DD') AS execution_date,
				status, created_at`,
			[
				filingId,
				taxpayerId,
				order.paymentOrderNumber,
				order.entityName,
				order.executedAmountVed,
				ONE_PER_THOUSAND_DIVISOR,
				order.executionDate
			]
		);
		const row = rows[0];
		await writeAudit(client, {
			userId: req.user.id,
			action: 'CREATE',
			tableAffected: 'one_per_thousand_declarations',
			recordId: row.id,
			oldValues: null,
			newValues: toOnePerThousand(row),
			...requestMeta(req)
		});
		created.push(row);
	}
	return created;
}

/** @param {import('express').Request} req @param {{ paymentOrderNumber: string, entityName: string, executedAmountVed: number, executionDate: string }[]} orders */
async function createOrders(req, orders) {
	assertDates(orders);
	const voucher = readVoucher(req.body.voucher);
	const taxpayer = await approvedTaxpayer(req);
	const client = await getPool().connect();
	try {
		await client.query('BEGIN');
		const account = await requireBankAccount(client, req.body.bankAccountId, TAX_TYPES.UN_POR_MIL);
		const filing = await client.query(
			`INSERT INTO one_per_thousand_filings (
				taxpayer_id, bank_reference_number, bank_account_id,
				voucher_file_name, voucher_media_type, voucher_content
			) VALUES ($1, $2, $3, $4, $5, $6)
			RETURNING id`,
			[
				taxpayer.id,
				req.body.bankReferenceNumber,
				account.id,
				voucher.fileName,
				voucher.mediaType,
				voucher.content
			]
		);
		const filingId = filing.rows[0].id;
		const created = await insertOrders(client, taxpayer.id, filingId, orders, req);
		const totaled = await client.query(
			`UPDATE one_per_thousand_filings
			 SET total_tax_ved = (
				SELECT COALESCE(SUM(tax_amount_ved), 0)
				FROM one_per_thousand_declarations WHERE filing_id = $1
			 )
			 WHERE id = $1
			 RETURNING total_tax_ved::text AS total_tax_ved`,
			[filingId]
		);
		await client.query('COMMIT');
		return {
			filingId,
			totalTaxVed: totaled.rows[0].total_tax_ved,
			declarations: created.map((row) =>
				toOnePerThousand({ ...row, total_tax_ved: totaled.rows[0].total_tax_ved })
			)
		};
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}

/** POST /one-per-thousand/single */
export async function createSingle(req, res) {
	const created = await createOrders(req, [req.body]);
	res.status(201).json({
		filingId: created.filingId,
		totalTaxVed: created.totalTaxVed,
		declaration: created.declarations[0]
	});
}

/** POST /one-per-thousand/batch */
export async function createBatch(req, res) {
	const created = await createOrders(req, req.body.orders);
	res.status(201).json({
		filingId: created.filingId,
		totalTaxVed: created.totalTaxVed,
		declarations: created.declarations
	});
}

/** GET /one-per-thousand/list */
export async function list(req, res) {
	const supervises = hasPermission(req.user.role, PERMISSIONS.DECLARACIONES_SUPERVISAR);
	const creates = hasPermission(req.user.role, PERMISSIONS.DECLARACIONES_CREAR);
	if (!supervises && !creates) {
		throw new HttpError(403, ERROR_CODES.FORBIDDEN, 'No tiene permiso para ver estas retenciones.');
	}

	if (supervises) {
		const { rows } = await getPool().query(
			`SELECT ${COLUMNS}, t.company_name, t.rif_number
			 FROM one_per_thousand_declarations d
			 JOIN one_per_thousand_filings f ON f.id = d.filing_id
			 JOIN taxpayers t ON t.id = d.taxpayer_id
			 ORDER BY d.execution_date DESC, d.created_at DESC`
		);
		res.json({
			scope: 'all',
			declarations: rows.map((row) => toOnePerThousand(row, true))
		});
		return;
	}

	const taxpayer = await taxpayerForUser(req);
	if (!taxpayer) {
		res.json({ scope: 'own', declarations: [] });
		return;
	}

	const { rows } = await getPool().query(
		`SELECT ${COLUMNS}
		 FROM one_per_thousand_declarations d
		 JOIN one_per_thousand_filings f ON f.id = d.filing_id
		 WHERE d.taxpayer_id = $1
		 ORDER BY d.execution_date DESC, d.created_at DESC`,
		[taxpayer.id]
	);
	res.json({ scope: 'own', declarations: rows.map((row) => toOnePerThousand(row)) });
}

/** POST /one-per-thousand/filings/:id/resolve */
export async function resolveFiling(req, res) {
	const client = await getPool().connect();
	try {
		await client.query('BEGIN');
		const current = await client.query(
			`SELECT id, status FROM one_per_thousand_filings WHERE id = $1 FOR UPDATE`,
			[req.params.id]
		);
		const row = current.rows[0];
		if (!row) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró la carga.');
		if (row.status !== PAYMENT_STATUS.PENDIENTE) {
			throw new HttpError(409, ERROR_CODES.CONFLICT, 'Esta carga ya fue resuelta.');
		}
		const approved = req.body.decision === 'APROBAR';
		const status = approved ? PAYMENT_STATUS.VERIFICADO : PAYMENT_STATUS.RECHAZADO;
		await client.query(
			`UPDATE one_per_thousand_filings
			 SET status = $2, rejection_reason = $3, resolved_by = $4, resolved_at = CURRENT_TIMESTAMP
			 WHERE id = $1`,
			[row.id, status, approved ? null : req.body.rejectionReason, req.user.id]
		);
		await client.query(
			`UPDATE one_per_thousand_declarations SET status = $2 WHERE filing_id = $1`,
			[row.id, status]
		);
		await writeAudit(client, {
			userId: req.user.id,
			action: approved ? 'APPROVE' : 'REJECT',
			tableAffected: 'one_per_thousand_filings',
			recordId: row.id,
			oldValues: { status: row.status },
			newValues: { status, rejectionReason: approved ? null : req.body.rejectionReason },
			...requestMeta(req)
		});
		await client.query('COMMIT');
		res.json({ filingId: row.id, status });
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}

/** GET /one-per-thousand/filings/:id/pdf */
export async function downloadPdf(req, res) {
	const { rows } = await getPool().query(
		`SELECT f.id, f.status, f.total_tax_ved::text AS total_tax_ved, f.bank_reference_number,
		        t.company_name, t.rif_number, t.user_id, b.bank_name, b.account_number
		 FROM one_per_thousand_filings f
		 JOIN taxpayers t ON t.id = f.taxpayer_id
		 JOIN bank_accounts b ON b.id = f.bank_account_id
		 WHERE f.id = $1`,
		[req.params.id]
	);
	const filing = rows[0];
	if (!filing) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró la carga.');
	const owns = filing.user_id === req.user.id;
	const resolves = hasPermission(req.user.role, PERMISSIONS.DECLARACIONES_RESOLVER);
	if (!owns && !resolves) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró la carga.');
	}
	if (filing.status !== PAYMENT_STATUS.VERIFICADO) {
		throw new HttpError(
			409,
			ERROR_CODES.CONFLICT,
			'La planilla se imprime cuando el administrador aprueba la carga.'
		);
	}
	const orders = await getPool().query(
		`SELECT payment_order_number, entity_name, executed_amount_ved::text AS executed_amount_ved,
		        tax_amount_ved::text AS tax_amount_ved,
		        to_char(execution_date, 'YYYY-MM-DD') AS execution_date
		 FROM one_per_thousand_declarations
		 WHERE filing_id = $1
		 ORDER BY execution_date, created_at`,
		[filing.id]
	);
	const pdf = await renderPlanilla({
		title: 'Planilla del impuesto 1 x 1000',
		intro: 'Recibo de la carga aprobada. El impuesto es el monto ejecutado dividido entre mil.',
		facts: [
			['Contribuyente', filing.company_name],
			['RIF', filing.rif_number],
			['Referencia bancaria', filing.bank_reference_number],
			['Cuenta', `${filing.bank_name} ${filing.account_number}`],
			['Estado', 'Aprobada']
		],
		lines: {
			head: ['Orden', 'Ente', 'Ejecutado', 'Impuesto', 'Fecha'],
			rows: orders.rows.map((order) => [
				order.payment_order_number,
				order.entity_name,
				`${order.executed_amount_ved} VED`,
				`${order.tax_amount_ved} VED`,
				order.execution_date
			])
		},
		totalLabel: 'Impuesto total',
		total: `${filing.total_tax_ved} VED`
	});
	sendPdf(res, pdf, `uno-por-mil-${filing.id}.pdf`);
}
