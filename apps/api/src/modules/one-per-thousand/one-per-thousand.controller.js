import { ERROR_CODES, ONE_PER_THOUSAND_DIVISOR, PERMISSIONS, hasPermission } from '@satet/shared';
import { getPool } from '../../db/pool.js';
import { writeAudit } from '../../lib/audit.js';
import { HttpError } from '../../lib/http.js';
import { toOnePerThousand } from '../../lib/present.js';
import { requestMeta } from '../../lib/request-meta.js';

const ZONE = 'America/Caracas';

const COLUMNS = `
	d.id, d.taxpayer_id, d.payment_order_number, d.entity_name,
	d.executed_amount_ved, d.tax_amount_ved,
	to_char(d.execution_date, 'YYYY-MM-DD') AS execution_date,
	d.status, d.created_at
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
async function insertOrders(client, taxpayerId, orders, req) {
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
				taxpayer_id, payment_order_number, entity_name,
				executed_amount_ved, tax_amount_ved, execution_date, status
			) VALUES (
				$1, $2, $3, $4, ROUND($4::numeric / $5, 2), $6, 'PENDIENTE'
			)
			RETURNING id, taxpayer_id, payment_order_number, entity_name,
				executed_amount_ved, tax_amount_ved,
				to_char(execution_date, 'YYYY-MM-DD') AS execution_date,
				status, created_at`,
			[
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
	const taxpayer = await approvedTaxpayer(req);
	const client = await getPool().connect();
	try {
		await client.query('BEGIN');
		const created = await insertOrders(client, taxpayer.id, orders, req);
		await client.query('COMMIT');
		return created;
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
	res.status(201).json({ declaration: toOnePerThousand(created[0]) });
}

/** POST /one-per-thousand/batch */
export async function createBatch(req, res) {
	const created = await createOrders(req, req.body.orders);
	res.status(201).json({ declarations: created.map((row) => toOnePerThousand(row)) });
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
		 WHERE d.taxpayer_id = $1
		 ORDER BY d.execution_date DESC, d.created_at DESC`,
		[taxpayer.id]
	);
	res.json({ scope: 'own', declarations: rows.map((row) => toOnePerThousand(row)) });
}
