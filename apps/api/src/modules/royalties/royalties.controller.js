import {
	ERROR_CODES,
	PAYMENT_STATUS,
	PERMISSIONS,
	ROYALTY_PAYMENT_FORMS,
	ROYALTY_TAX_RATE,
	TAX_TYPES,
	hasPermission
} from '@satet/shared';
import { getPool } from '../../db/pool.js';
import { writeAudit } from '../../lib/audit.js';
import { conflictFromDb } from '../../lib/db-errors.js';
import { HttpError } from '../../lib/http.js';
import { requireBankAccount } from '../../lib/payment-fields.js';
import { renderPlanilla, sendPdf } from '../../lib/planilla.js';
import { requestMeta } from '../../lib/request-meta.js';
import { readVoucher } from '../../lib/voucher.js';

const COLUMNS = `
	r.id, r.taxpayer_id, r.period_year,
	r.volume_cubic_meters::text AS volume_cubic_meters,
	r.commercial_value_per_unit::text AS commercial_value_per_unit,
	r.applied_rate::text AS applied_rate,
	r.amount_ved::text AS amount_ved,
	r.payment_form, r.bank_reference_number, r.status, r.rejection_reason, r.created_at
`;

/** @param {Record<string, any>} row @param {boolean} [includeTaxpayer] */
function present(row, includeTaxpayer = false) {
	const royalty = {
		id: row.id,
		taxpayerId: row.taxpayer_id,
		periodYear: row.period_year,
		volumeCubicMeters: row.volume_cubic_meters,
		commercialValuePerUnit: row.commercial_value_per_unit,
		appliedRate: row.applied_rate,
		amountVed: row.amount_ved,
		paymentForm: row.payment_form,
		bankReferenceNumber: row.bank_reference_number,
		status: row.status,
		rejectionReason: row.rejection_reason,
		createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at
	};
	if (includeTaxpayer) {
		royalty.companyName = row.company_name;
		royalty.rifNumber = row.rif_number;
	}
	return royalty;
}

/** @param {import('express').Request} req */
async function approvedTaxpayer(req) {
	const { rows } = await getPool().query(
		'SELECT id, is_approved, company_name, rif_number FROM taxpayers WHERE user_id = $1',
		[req.user.id]
	);
	const taxpayer = rows[0];
	if (!taxpayer) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No hay un expediente asociado a esta cuenta.');
	}
	if (!taxpayer.is_approved) {
		throw new HttpError(
			403,
			ERROR_CODES.FORBIDDEN,
			'El expediente debe estar aprobado para declarar regalías.'
		);
	}
	return taxpayer;
}

/** POST /royalties */
export async function createRoyalty(req, res) {
	const body = req.body;
	const inKind = body.paymentForm === ROYALTY_PAYMENT_FORMS.ESPECIE;
	const voucher = inKind ? null : readVoucher(body.voucher);
	const taxpayer = await approvedTaxpayer(req);
	const today = new Date();
	const yearNow = Number(
		new Intl.DateTimeFormat('en-US', { timeZone: 'America/Caracas', year: 'numeric' }).format(today)
	);
	if (body.periodYear > yearNow) {
		throw new HttpError(400, ERROR_CODES.VALIDATION_ERROR, 'El año no puede ser futuro.');
	}

	const client = await getPool().connect();
	try {
		await client.query('BEGIN');
		const volume = await client.query(
			`SELECT COALESCE(SUM(l.volume_cubic_meters), 0)::text AS volume
			 FROM mining_declaration_lines l
			 JOIN mining_declarations d ON d.id = l.declaration_id
			 WHERE d.taxpayer_id = $1 AND d.period_year = $2 AND d.status <> 'RECHAZADO'`,
			[taxpayer.id, body.periodYear]
		);
		if (Number(volume.rows[0].volume) <= 0) {
			throw new HttpError(
				400,
				ERROR_CODES.VALIDATION_ERROR,
				'No hay producción minera declarada en ese año.'
			);
		}
		const account = inKind
			? null
			: await requireBankAccount(client, body.bankAccountId, TAX_TYPES.MINERO);
		const inserted = await client.query(
			`INSERT INTO mining_royalties (
				taxpayer_id, period_year, volume_cubic_meters, commercial_value_per_unit,
				applied_rate, amount_ved, payment_form, bank_reference_number, bank_account_id,
				voucher_file_name, voucher_media_type, voucher_content
			) VALUES (
				$1, $2, $3, $4, $5,
				ROUND($3::numeric * $4::numeric * $5::numeric / 100, 2),
				$6, $7, $8, $9, $10, $11
			)
			RETURNING id`,
			[
				taxpayer.id,
				body.periodYear,
				volume.rows[0].volume,
				body.commercialValuePerUnit,
				ROYALTY_TAX_RATE,
				body.paymentForm,
				inKind ? null : body.bankReferenceNumber,
				account?.id ?? null,
				voucher?.fileName ?? null,
				voucher?.mediaType ?? null,
				voucher?.content ?? null
			]
		);
		const loaded = await client.query(
			`SELECT ${COLUMNS}, t.company_name, t.rif_number
			 FROM mining_royalties r
			 JOIN taxpayers t ON t.id = r.taxpayer_id
			 WHERE r.id = $1`,
			[inserted.rows[0].id]
		);
		const row = loaded.rows[0];
		await writeAudit(client, {
			userId: req.user.id,
			action: 'CREATE',
			tableAffected: 'mining_royalties',
			recordId: row.id,
			oldValues: null,
			newValues: present(row),
			...requestMeta(req)
		});
		await client.query('COMMIT');
		res.status(201).json({ royalty: present(row, true) });
	} catch (err) {
		await client.query('ROLLBACK');
		const conflict = conflictFromDb(err);
		if (
			conflict &&
			err &&
			typeof err === 'object' &&
			'constraint' in err &&
			err.constraint === 'mining_royalties_taxpayer_id_period_year_key'
		) {
			throw new HttpError(409, ERROR_CODES.CONFLICT, 'Ya hay una regalía declarada para ese año.');
		}
		throw conflict ?? err;
	} finally {
		client.release();
	}
}

/** GET /royalties/my */
export async function listMine(req, res) {
	const { rows: taxpayers } = await getPool().query('SELECT id FROM taxpayers WHERE user_id = $1', [
		req.user.id
	]);
	if (!taxpayers[0]) {
		res.json({ royalties: [] });
		return;
	}
	const { rows } = await getPool().query(
		`SELECT ${COLUMNS} FROM mining_royalties r WHERE r.taxpayer_id = $1 ORDER BY r.period_year DESC`,
		[taxpayers[0].id]
	);
	res.json({ royalties: rows.map((row) => present(row)) });
}

/** GET /royalties/pending */
export async function listPending(_req, res) {
	const { rows } = await getPool().query(
		`SELECT ${COLUMNS}, t.company_name, t.rif_number
		 FROM mining_royalties r
		 JOIN taxpayers t ON t.id = r.taxpayer_id
		 WHERE r.status = 'PENDIENTE'
		 ORDER BY r.created_at ASC`
	);
	res.json({ royalties: rows.map((row) => present(row, true)) });
}

/** POST /royalties/:id/resolve */
export async function resolveRoyalty(req, res) {
	const client = await getPool().connect();
	try {
		await client.query('BEGIN');
		const current = await client.query(
			`SELECT ${COLUMNS} FROM mining_royalties r WHERE r.id = $1 FOR UPDATE`,
			[req.params.id]
		);
		const row = current.rows[0];
		if (!row) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró la regalía.');
		if (row.status !== PAYMENT_STATUS.PENDIENTE) {
			throw new HttpError(409, ERROR_CODES.CONFLICT, 'Esta regalía ya fue resuelta.');
		}
		const approved = req.body.decision === 'APROBAR';
		const updated = await client.query(
			`UPDATE mining_royalties
			 SET status = $2, rejection_reason = $3, resolved_by = $4, resolved_at = CURRENT_TIMESTAMP
			 WHERE id = $1
			 RETURNING id`,
			[
				row.id,
				approved ? PAYMENT_STATUS.VERIFICADO : PAYMENT_STATUS.RECHAZADO,
				approved ? null : req.body.rejectionReason,
				req.user.id
			]
		);
		await writeAudit(client, {
			userId: req.user.id,
			action: approved ? 'APPROVE' : 'REJECT',
			tableAffected: 'mining_royalties',
			recordId: row.id,
			oldValues: { status: row.status },
			newValues: { status: approved ? PAYMENT_STATUS.VERIFICADO : PAYMENT_STATUS.RECHAZADO },
			...requestMeta(req)
		});
		await client.query('COMMIT');
		const loaded = await getPool().query(
			`SELECT ${COLUMNS} FROM mining_royalties r WHERE r.id = $1`,
			[updated.rows[0].id]
		);
		res.json({ royalty: present(loaded.rows[0]) });
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}

/** GET /royalties/:id/pdf */
export async function downloadPdf(req, res) {
	const { rows } = await getPool().query(
		`SELECT ${COLUMNS}, t.company_name, t.rif_number, t.user_id, b.bank_name, b.account_number
		 FROM mining_royalties r
		 JOIN taxpayers t ON t.id = r.taxpayer_id
		 LEFT JOIN bank_accounts b ON b.id = r.bank_account_id
		 WHERE r.id = $1`,
		[req.params.id]
	);
	const row = rows[0];
	if (!row) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró la regalía.');
	const owns = row.user_id === req.user.id;
	const resolves = hasPermission(req.user.role, PERMISSIONS.DECLARACIONES_RESOLVER);
	if (!owns && !resolves) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró la regalía.');
	}
	if (row.status !== PAYMENT_STATUS.VERIFICADO) {
		throw new HttpError(
			409,
			ERROR_CODES.CONFLICT,
			'La planilla se imprime cuando el administrador aprueba la regalía.'
		);
	}
	const royalty = present(row, true);
	const pdf = await renderPlanilla({
		title: 'Planilla de regalías mineras',
		intro: 'Siete por ciento del volumen declarado en el año, al valor comercial indicado.',
		facts: [
			['Contribuyente', royalty.companyName],
			['RIF', royalty.rifNumber],
			['Año', String(royalty.periodYear)],
			['Volumen declarado', `${royalty.volumeCubicMeters} m3`],
			['Valor comercial', `${royalty.commercialValuePerUnit} VED`],
			['Forma de pago', royalty.paymentForm],
			['Referencia', royalty.bankReferenceNumber ?? 'Pago en especie'],
			['Cuenta', row.bank_name ? `${row.bank_name} ${row.account_number}` : 'No aplica']
		],
		totalLabel: 'Regalía',
		total: `${royalty.amountVed} VED`
	});
	sendPdf(res, pdf, `regalias-${royalty.id}.pdf`);
}
