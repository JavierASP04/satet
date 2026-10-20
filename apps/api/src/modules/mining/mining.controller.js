import {
	DECLARATION_DEADLINE_DAY,
	ERROR_CODES,
	MINING_TAX_RATES,
	PERMISSIONS,
	hasPermission
} from '@satet/shared';
import { getPool } from '../../db/pool.js';
import { writeAudit } from '../../lib/audit.js';
import { HttpError } from '../../lib/http.js';
import { toMiningDeclaration } from '../../lib/present.js';
import { requestMeta } from '../../lib/request-meta.js';

const ZONE = 'America/Caracas';

const COLUMNS = `
	d.id, d.taxpayer_id, d.period_year, d.period_month, d.activity_type, d.material_type,
	d.volume_cubic_meters, d.commercial_value_per_unit, d.applied_tax_rate, d.subtotal_ved,
	d.is_extemporaneous, d.declaration_date, d.status
`;

/** @param {Date} [now] */
function caracasDate(now = new Date()) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: ZONE,
		year: 'numeric',
		month: 'numeric',
		day: 'numeric'
	}).formatToParts(now);
	const read = (type) => Number(parts.find((part) => part.type === type)?.value);
	return { year: read('year'), month: read('month'), day: read('day') };
}

/** @param {Date} [now] */
function previousPeriod(now = new Date()) {
	const { year, month } = caracasDate(now);
	if (month === 1) return { year: year - 1, month: 12 };
	return { year, month: month - 1 };
}

/**
 * En término solo el mes anterior, presentado hasta el día 10 en Caracas.
 * @param {number} periodYear
 * @param {number} periodMonth
 */
function isExtemporaneous(periodYear, periodMonth) {
	const today = caracasDate();
	const expected = previousPeriod();
	const onTime =
		today.day <= DECLARATION_DEADLINE_DAY &&
		periodYear === expected.year &&
		periodMonth === expected.month;
	return !onTime;
}

/** @param {number} periodYear @param {number} periodMonth */
function assertPeriod(periodYear, periodMonth) {
	const today = caracasDate();
	if (periodYear > today.year || (periodYear === today.year && periodMonth > today.month)) {
		throw new HttpError(
			400,
			ERROR_CODES.VALIDATION_ERROR,
			'El período no puede ser posterior al mes en curso.'
		);
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
			'El expediente debe estar aprobado para presentar declaraciones.'
		);
	}
	return taxpayer;
}

/** POST /mining/declarations */
export async function createDeclaration(req, res) {
	const body = req.body;
	assertPeriod(body.periodYear, body.periodMonth);
	const rate = MINING_TAX_RATES[body.activityType];
	if (rate == null) {
		throw new HttpError(400, ERROR_CODES.VALIDATION_ERROR, 'La actividad no tiene alícuota.');
	}
	const taxpayer = await approvedTaxpayer(req);
	const late = isExtemporaneous(body.periodYear, body.periodMonth);
	const client = await getPool().connect();
	try {
		await client.query('BEGIN');
		const { rows } = await client.query(
			`INSERT INTO mining_declarations (
				taxpayer_id, period_year, period_month, activity_type, material_type,
				volume_cubic_meters, commercial_value_per_unit, applied_tax_rate, subtotal_ved,
				is_extemporaneous, status
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8,
				ROUND($6::numeric * $7::numeric * $8::numeric / 100, 2),
				$9, 'PENDIENTE'
			)
			RETURNING id, taxpayer_id, period_year, period_month, activity_type, material_type,
				volume_cubic_meters, commercial_value_per_unit, applied_tax_rate, subtotal_ved,
				is_extemporaneous, declaration_date, status`,
			[
				taxpayer.id,
				body.periodYear,
				body.periodMonth,
				body.activityType,
				body.materialType,
				body.volumeCubicMeters,
				body.commercialValuePerUnit,
				rate,
				late
			]
		);
		const row = rows[0];
		await writeAudit(client, {
			userId: req.user.id,
			action: 'CREATE',
			tableAffected: 'mining_declarations',
			recordId: row.id,
			oldValues: null,
			newValues: toMiningDeclaration(row),
			...requestMeta(req)
		});
		await client.query('COMMIT');
		res.status(201).json({ declaration: toMiningDeclaration(row) });
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}

/** GET /mining/declarations/my */
export async function listMyDeclarations(req, res) {
	const taxpayer = await taxpayerForUser(req);
	if (!taxpayer) {
		res.json({ declarations: [] });
		return;
	}
	const { rows } = await getPool().query(
		`SELECT ${COLUMNS}
		 FROM mining_declarations d
		 WHERE d.taxpayer_id = $1
		 ORDER BY d.period_year DESC, d.period_month DESC, d.declaration_date DESC`,
		[taxpayer.id]
	);
	res.json({ declarations: rows.map((row) => toMiningDeclaration(row)) });
}

/** GET /mining/declarations/:id */
export async function getDeclaration(req, res) {
	if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró la declaración.');
	}
	const { rows } = await getPool().query(
		`SELECT ${COLUMNS}, t.company_name, t.rif_number, t.user_id
		 FROM mining_declarations d
		 JOIN taxpayers t ON t.id = d.taxpayer_id
		 WHERE d.id = $1`,
		[req.params.id]
	);
	const row = rows[0];
	if (!row) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró la declaración.');
	}
	const owns = row.user_id === req.user.id;
	const supervises = hasPermission(req.user.role, PERMISSIONS.DECLARACIONES_SUPERVISAR);
	if (!owns && !supervises) {
		throw new HttpError(403, ERROR_CODES.FORBIDDEN, 'No tiene permiso para ver esta declaración.');
	}
	res.json({ declaration: toMiningDeclaration(row, true) });
}

/** GET /mining/extemporaneous */
export async function listExtemporaneous(_req, res) {
	const { rows } = await getPool().query(
		`SELECT ${COLUMNS}, t.company_name, t.rif_number
		 FROM mining_declarations d
		 JOIN taxpayers t ON t.id = d.taxpayer_id
		 WHERE d.is_extemporaneous = TRUE
		 ORDER BY d.declaration_date DESC`
	);
	res.json({ declarations: rows.map((row) => toMiningDeclaration(row, true)) });
}
