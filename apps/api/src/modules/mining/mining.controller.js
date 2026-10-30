import {
	ERROR_CODES,
	MINING_TAX_RATES,
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
import { toMiningDeclaration } from '../../lib/present.js';
import { requestMeta } from '../../lib/request-meta.js';
import { readVoucher } from '../../lib/voucher.js';

const ZONE = 'America/Caracas';

const HEADER = `
	d.id, d.taxpayer_id, d.period_year, d.period_month, d.total_ved::text AS total_ved,
	d.is_extemporaneous, d.bank_reference_number, d.declaration_date, d.status, d.rejection_reason
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
	const onTime = today.day <= 10 && periodYear === expected.year && periodMonth === expected.month;
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
function linesFromBody(req) {
	if (Array.isArray(req.body.lines) && req.body.lines.length > 0) return req.body.lines;
	return [
		{
			activityType: req.body.activityType,
			materialType: req.body.materialType,
			volumeCubicMeters: req.body.volumeCubicMeters,
			commercialValuePerUnit: req.body.commercialValuePerUnit
		}
	];
}

/** @param {import('pg').Pool | import('pg').PoolClient} db @param {string[]} ids */
async function linesByDeclaration(db, ids) {
	if (ids.length === 0) return new Map();
	const { rows } = await db.query(
		`SELECT declaration_id, line_order, activity_type, material_type,
		        volume_cubic_meters::text AS volume_cubic_meters,
		        commercial_value_per_unit::text AS commercial_value_per_unit,
		        applied_tax_rate::text AS applied_tax_rate,
		        subtotal_ved::text AS subtotal_ved
		 FROM mining_declaration_lines
		 WHERE declaration_id = ANY($1::uuid[])
		 ORDER BY line_order ASC`,
		[ids]
	);
	const grouped = new Map();
	for (const row of rows) {
		const list = grouped.get(row.declaration_id) ?? [];
		list.push(row);
		grouped.set(row.declaration_id, list);
	}
	return grouped;
}

/** @param {Record<string, any>} row @param {Map<string, any[]>} grouped @param {boolean} [includeTaxpayer] */
function present(row, grouped, includeTaxpayer = false) {
	return toMiningDeclaration({ ...row, lines: grouped.get(row.id) ?? [] }, includeTaxpayer);
}

/** @param {import('express').Request} req */
async function taxpayerForUser(req) {
	const { rows } = await getPool().query(
		'SELECT id, is_approved, company_name, rif_number FROM taxpayers WHERE user_id = $1',
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
	const lines = linesFromBody(req);
	const late = isExtemporaneous(body.periodYear, body.periodMonth);
	const voucher = readVoucher(body.voucher);
	const taxpayer = await approvedTaxpayer(req);
	const client = await getPool().connect();
	try {
		await client.query('BEGIN');
		const account = await requireBankAccount(client, body.bankAccountId, TAX_TYPES.MINERO);
		const priced = await client.query(
			`SELECT activity, material, volume, price, rate,
			        ROUND(volume * price * rate / 100, 2)::text AS subtotal
			 FROM unnest($1::text[], $2::text[], $3::numeric[], $4::numeric[], $5::numeric[])
			      AS t(activity, material, volume, price, rate)`,
			[
				lines.map((line) => line.activityType),
				lines.map((line) => line.materialType),
				lines.map((line) => line.volumeCubicMeters),
				lines.map((line) => line.commercialValuePerUnit),
				lines.map((line) => {
					const rate = MINING_TAX_RATES[line.activityType];
					if (rate == null) {
						throw new HttpError(
							400,
							ERROR_CODES.VALIDATION_ERROR,
							'La actividad no tiene alícuota.'
						);
					}
					return rate;
				})
			]
		);

		const inserted = await client.query(
			`INSERT INTO mining_declarations (
				taxpayer_id, period_year, period_month, total_ved, is_extemporaneous,
				bank_reference_number, bank_account_id, voucher_file_name, voucher_media_type, voucher_content,
				status
			) VALUES ($1, $2, $3, 0, $4, $5, $6, $7, $8, $9, 'PENDIENTE')
			RETURNING id`,
			[
				taxpayer.id,
				body.periodYear,
				body.periodMonth,
				late,
				body.bankReferenceNumber,
				account.id,
				voucher.fileName,
				voucher.mediaType,
				voucher.content
			]
		);
		const declarationId = inserted.rows[0].id;
		for (let index = 0; index < priced.rows.length; index += 1) {
			const line = priced.rows[index];
			await client.query(
				`INSERT INTO mining_declaration_lines (
					declaration_id, line_order, activity_type, material_type,
					volume_cubic_meters, commercial_value_per_unit, applied_tax_rate, subtotal_ved
				) VALUES ($1, $2, $3::mining_activity, $4, $5, $6, $7, $8)`,
				[
					declarationId,
					index + 1,
					line.activity,
					line.material,
					line.volume,
					line.price,
					line.rate,
					line.subtotal
				]
			);
		}
		const totaled = await client.query(
			`UPDATE mining_declarations
			 SET total_ved = (
				SELECT COALESCE(SUM(subtotal_ved), 0) FROM mining_declaration_lines WHERE declaration_id = $1
			 )
			 WHERE id = $1
			 RETURNING ${HEADER.replaceAll('d.', '')}`,
			[declarationId]
		);
		const row = totaled.rows[0];
		const grouped = await linesByDeclaration(client, [declarationId]);
		const presented = present(row, grouped);
		await writeAudit(client, {
			userId: req.user.id,
			action: 'CREATE',
			tableAffected: 'mining_declarations',
			recordId: declarationId,
			oldValues: null,
			newValues: {
				period: `${body.periodYear}-${body.periodMonth}`,
				totalVed: presented.totalVed,
				isExtemporaneous: presented.isExtemporaneous,
				lines: presented.lines,
				bankReferenceNumber: body.bankReferenceNumber
			},
			...requestMeta(req)
		});
		await client.query('COMMIT');
		res.status(201).json({ declaration: presented });
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}

/** @param {import('pg').Pool | import('pg').PoolClient} db @param {string} sql @param {unknown[]} params @param {boolean} [includeTaxpayer] */
async function listWithLines(db, sql, params, includeTaxpayer = false) {
	const { rows } = await db.query(sql, params);
	const grouped = await linesByDeclaration(
		db,
		rows.map((row) => row.id)
	);
	return rows.map((row) => present(row, grouped, includeTaxpayer));
}

/** GET /mining/declarations/my */
export async function listMyDeclarations(req, res) {
	const taxpayer = await taxpayerForUser(req);
	if (!taxpayer) {
		res.json({ declarations: [] });
		return;
	}
	const declarations = await listWithLines(
		getPool(),
		`SELECT ${HEADER}
		 FROM mining_declarations d
		 WHERE d.taxpayer_id = $1
		 ORDER BY d.period_year DESC, d.period_month DESC, d.declaration_date DESC`,
		[taxpayer.id]
	);
	res.json({ declarations });
}

/** GET /mining/declarations/pending */
export async function listPending(_req, res) {
	const declarations = await listWithLines(
		getPool(),
		`SELECT ${HEADER}, t.company_name, t.rif_number
		 FROM mining_declarations d
		 JOIN taxpayers t ON t.id = d.taxpayer_id
		 WHERE d.status = 'PENDIENTE'
		 ORDER BY d.declaration_date ASC`,
		[],
		true
	);
	res.json({ declarations });
}

/** GET /mining/declarations/:id */
export async function getDeclaration(req, res) {
	if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró la declaración.');
	}
	const { rows } = await getPool().query(
		`SELECT ${HEADER}, t.company_name, t.rif_number, t.user_id
		 FROM mining_declarations d
		 JOIN taxpayers t ON t.id = d.taxpayer_id
		 WHERE d.id = $1`,
		[req.params.id]
	);
	const row = rows[0];
	if (!row) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró la declaración.');
	const owns = row.user_id === req.user.id;
	const supervises = hasPermission(req.user.role, PERMISSIONS.DECLARACIONES_SUPERVISAR);
	const resolves = hasPermission(req.user.role, PERMISSIONS.DECLARACIONES_RESOLVER);
	if (!owns && !supervises && !resolves) {
		throw new HttpError(403, ERROR_CODES.FORBIDDEN, 'No tiene permiso para ver esta declaración.');
	}
	const grouped = await linesByDeclaration(getPool(), [row.id]);
	res.json({ declaration: present(row, grouped, true) });
}

/** GET /mining/extemporaneous */
export async function listExtemporaneous(_req, res) {
	const declarations = await listWithLines(
		getPool(),
		`SELECT ${HEADER}, t.company_name, t.rif_number
		 FROM mining_declarations d
		 JOIN taxpayers t ON t.id = d.taxpayer_id
		 WHERE d.is_extemporaneous = TRUE
		 ORDER BY d.declaration_date DESC`,
		[],
		true
	);
	res.json({ declarations });
}

/** POST /mining/declarations/:id/resolve */
export async function resolveDeclaration(req, res) {
	const client = await getPool().connect();
	try {
		await client.query('BEGIN');
		const { rows } = await client.query(
			`SELECT ${HEADER} FROM mining_declarations d WHERE d.id = $1 FOR UPDATE`,
			[req.params.id]
		);
		const row = rows[0];
		if (!row) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró la declaración.');
		if (row.status !== PAYMENT_STATUS.PENDIENTE) {
			throw new HttpError(409, ERROR_CODES.CONFLICT, 'Esta declaración ya fue resuelta.');
		}
		const approved = req.body.decision === 'APROBAR';
		const updated = await client.query(
			`UPDATE mining_declarations
			 SET status = $2, rejection_reason = $3, resolved_by = $4, resolved_at = CURRENT_TIMESTAMP
			 WHERE id = $1
			 RETURNING ${HEADER.replaceAll('d.', '')}`,
			[
				row.id,
				approved ? PAYMENT_STATUS.VERIFICADO : PAYMENT_STATUS.RECHAZADO,
				approved ? null : req.body.rejectionReason,
				req.user.id
			]
		);
		const next = updated.rows[0];
		await writeAudit(client, {
			userId: req.user.id,
			action: approved ? 'APPROVE' : 'REJECT',
			tableAffected: 'mining_declarations',
			recordId: row.id,
			oldValues: { status: row.status },
			newValues: { status: next.status, rejectionReason: next.rejection_reason },
			...requestMeta(req)
		});
		await client.query('COMMIT');
		const grouped = await linesByDeclaration(getPool(), [row.id]);
		res.json({ declaration: present(next, grouped) });
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}

/** GET /mining/declarations/:id/pdf */
export async function downloadPdf(req, res) {
	const { rows } = await getPool().query(
		`SELECT ${HEADER}, t.company_name, t.rif_number, t.user_id, b.bank_name, b.account_number
		 FROM mining_declarations d
		 JOIN taxpayers t ON t.id = d.taxpayer_id
		 JOIN bank_accounts b ON b.id = d.bank_account_id
		 WHERE d.id = $1`,
		[req.params.id]
	);
	const row = rows[0];
	if (!row) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró la declaración.');
	const owns = row.user_id === req.user.id;
	const resolves = hasPermission(req.user.role, PERMISSIONS.DECLARACIONES_RESOLVER);
	if (!owns && !resolves) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró la declaración.');
	}
	if (row.status !== PAYMENT_STATUS.VERIFICADO) {
		throw new HttpError(
			409,
			ERROR_CODES.CONFLICT,
			'La planilla se imprime cuando el administrador aprueba la declaración.'
		);
	}
	const grouped = await linesByDeclaration(getPool(), [row.id]);
	const declaration = present(row, grouped, true);
	const pdf = await renderPlanilla({
		title: 'Planilla de impuesto minero',
		intro: 'Recibo de la declaración aprobada.',
		late: declaration.isExtemporaneous,
		facts: [
			['Contribuyente', declaration.companyName],
			['RIF', declaration.rifNumber],
			['Período', `${declaration.periodMonth}/${declaration.periodYear}`],
			['Referencia bancaria', declaration.bankReferenceNumber],
			['Cuenta', `${row.bank_name} ${row.account_number}`],
			['Estado', 'Aprobada']
		],
		lines: {
			head: ['Actividad', 'Material', 'Volumen', 'Valor', 'Alícuota', 'Subtotal'],
			rows: declaration.lines.map((line) => [
				line.activityType,
				line.materialType,
				String(line.volumeCubicMeters),
				String(line.commercialValuePerUnit),
				`${line.appliedTaxRate}%`,
				`${line.subtotalVed} VED`
			])
		},
		totalLabel: 'Total',
		total: `${declaration.totalVed} VED`
	});
	sendPdf(res, pdf, `mineria-${declaration.id}.pdf`);
}
