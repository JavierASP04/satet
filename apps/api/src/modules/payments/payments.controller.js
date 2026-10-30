import { randomUUID } from 'node:crypto';
import {
	ERROR_CODES,
	PAYMENT_STATUS,
	PAYMENT_SUBJECTS,
	PERMISSIONS,
	ROYALTY_PAYMENT_FORMS,
	STAMP_STATUS,
	TAX_TYPES,
	hasPermission
} from '@satet/shared';
import { getPool } from '../../db/pool.js';
import { writeAudit } from '../../lib/audit.js';
import { HttpError } from '../../lib/http.js';
import { requireBankAccount } from '../../lib/payment-fields.js';
import { formatFixed } from '../../lib/present.js';
import { requestMeta } from '../../lib/request-meta.js';
import { readVoucher } from '../../lib/voucher.js';

const ZONE = 'America/Caracas';

const COLUMNS = `
	p.id, p.taxpayer_id, p.tax_type, p.target_bank_account_id, p.bank_reference_number,
	p.origin_bank, to_char(p.payment_date, 'YYYY-MM-DD') AS payment_date,
	p.amount_paid_ved::text AS amount_paid_ved, p.voucher_file_path, p.voucher_media_type,
	p.related_kind, p.related_id, p.status, p.rejection_reason, p.verified_by,
	p.verified_at, p.created_at,
	t.company_name, t.rif_number, u.email,
	b.bank_name, b.account_number,
	n.subject AS notice_subject, n.body AS notice_body, n.created_at AS notice_created_at
`;

const FROM = `
	FROM payments p
	JOIN taxpayers t ON t.id = p.taxpayer_id
	JOIN users u ON u.id = t.user_id
	JOIN bank_accounts b ON b.id = p.target_bank_account_id
	LEFT JOIN LATERAL (
		SELECT subject, body, created_at
		FROM payment_notices
		WHERE payment_id = p.id
		ORDER BY created_at DESC
		LIMIT 1
	) n ON TRUE
`;

/** @param {unknown} value */
function toIso(value) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(String(value));
	return date.toISOString();
}

/** @param {Record<string, any>} row */
function present(row) {
	const fileName = String(row.voucher_file_path).split('/').pop();
	return {
		id: row.id,
		taxpayerId: row.taxpayer_id,
		taxType: row.tax_type,
		bankAccountId: row.target_bank_account_id,
		bankName: row.bank_name,
		accountNumber: row.account_number,
		bankReferenceNumber: row.bank_reference_number,
		originBank: row.origin_bank,
		paymentDate: row.payment_date,
		amountPaidVed: formatFixed(row.amount_paid_ved, 2),
		voucherFileName: fileName,
		relatedKind: row.related_kind,
		relatedId: row.related_id,
		status: row.status,
		rejectionReason: row.rejection_reason,
		verifiedBy: row.verified_by,
		verifiedAt: toIso(row.verified_at),
		createdAt: toIso(row.created_at),
		companyName: row.company_name,
		rifNumber: row.rif_number,
		email: row.email,
		notice: row.notice_subject
			? {
					subject: row.notice_subject,
					body: row.notice_body,
					createdAt: toIso(row.notice_created_at)
				}
			: null
	};
}

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

/** @param {import('express').Request} req */
async function approvedTaxpayer(req) {
	const { rows } = await getPool().query(
		`SELECT t.id, t.is_approved, u.email
		 FROM taxpayers t
		 JOIN users u ON u.id = t.user_id
		 WHERE t.user_id = $1`,
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
			'El expediente debe estar aprobado para registrar pagos.'
		);
	}
	return taxpayer;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} taxpayerId
 * @param {string} kind
 * @param {string} relatedId
 * @param {string} amount
 * @param {string} taxType
 */
async function lockSubject(client, taxpayerId, kind, relatedId, amount, taxType) {
	if (kind === PAYMENT_SUBJECTS.MINING_DECLARATION) {
		if (taxType !== TAX_TYPES.MINERO) {
			throw new HttpError(
				400,
				ERROR_CODES.VALIDATION_ERROR,
				'Esa obligación no es de impuesto minero.'
			);
		}
		return readObligation(
			client,
			`SELECT id, status, (total_ved = $3::numeric) AS amount_ok
			 FROM mining_declarations
			 WHERE id = $1 AND taxpayer_id = $2
			 FOR UPDATE`,
			[relatedId, taxpayerId, amount]
		);
	}
	if (kind === PAYMENT_SUBJECTS.ONE_PER_THOUSAND_FILING) {
		if (taxType !== TAX_TYPES.UN_POR_MIL) {
			throw new HttpError(
				400,
				ERROR_CODES.VALIDATION_ERROR,
				'Esa obligación no es del uno por mil.'
			);
		}
		return readObligation(
			client,
			`SELECT id, status, (total_tax_ved = $3::numeric) AS amount_ok
			 FROM one_per_thousand_filings
			 WHERE id = $1 AND taxpayer_id = $2
			 FOR UPDATE`,
			[relatedId, taxpayerId, amount]
		);
	}
	if (kind === PAYMENT_SUBJECTS.MINING_ROYALTY) {
		if (taxType !== TAX_TYPES.MINERO) {
			throw new HttpError(
				400,
				ERROR_CODES.VALIDATION_ERROR,
				'Esa obligación no es de regalías mineras.'
			);
		}
		const { rows } = await client.query(
			`SELECT id, status, payment_form, (amount_ved = $3::numeric) AS amount_ok
			 FROM mining_royalties
			 WHERE id = $1 AND taxpayer_id = $2
			 FOR UPDATE`,
			[relatedId, taxpayerId, amount]
		);
		const row = rows[0];
		if (!row) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró la obligación.');
		if (row.payment_form === ROYALTY_PAYMENT_FORMS.ESPECIE) {
			throw new HttpError(
				400,
				ERROR_CODES.VALIDATION_ERROR,
				'La regalía en especie no se concilia con una transferencia.'
			);
		}
		if (!row.amount_ok) {
			throw new HttpError(
				400,
				ERROR_CODES.VALIDATION_ERROR,
				'El monto no coincide con la obligación.'
			);
		}
		return row;
	}
	if (kind === PAYMENT_SUBJECTS.ELECTRONIC_STAMP) {
		if (taxType !== TAX_TYPES.TIMBRE_FISCAL) {
			throw new HttpError(
				400,
				ERROR_CODES.VALIDATION_ERROR,
				'Esa obligación no es un timbre fiscal.'
			);
		}
		const { rows } = await client.query(
			`SELECT id, status, (amount_ved = $3::numeric) AS amount_ok
			 FROM electronic_stamps
			 WHERE uuid_code = $1 AND taxpayer_id = $2
			 FOR UPDATE`,
			[relatedId, taxpayerId, amount]
		);
		const row = rows[0];
		if (!row) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró el timbre.');
		if (!row.amount_ok) {
			throw new HttpError(400, ERROR_CODES.VALIDATION_ERROR, 'El monto no coincide con el timbre.');
		}
		if (row.status === STAMP_STATUS.ANULADO) {
			throw new HttpError(409, ERROR_CODES.CONFLICT, 'El timbre ya está anulado.');
		}
		return row;
	}
	throw new HttpError(400, ERROR_CODES.VALIDATION_ERROR, 'Tipo de obligación inválido.');
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} sql
 * @param {unknown[]} params
 */
async function readObligation(client, sql, params) {
	const { rows } = await client.query(sql, params);
	const row = rows[0];
	if (!row) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró la obligación.');
	if (!row.amount_ok) {
		throw new HttpError(
			400,
			ERROR_CODES.VALIDATION_ERROR,
			'El monto no coincide con la obligación.'
		);
	}
	return row;
}

/**
 * @param {import('pg').PoolClient} client
 * @param {string} kind
 * @param {string} relatedId
 * @param {string} userId
 * @param {'VERIFICADO' | 'RECHAZADO'} status
 * @param {string | null} reason
 */
async function applyToSubject(client, kind, relatedId, userId, status, reason) {
	if (kind === PAYMENT_SUBJECTS.MINING_DECLARATION) {
		const updated = await client.query(
			`UPDATE mining_declarations
			 SET status = $2, rejection_reason = $3, resolved_by = $4, resolved_at = CURRENT_TIMESTAMP
			 WHERE id = $1 AND status = 'PENDIENTE'`,
			[relatedId, status, reason, userId]
		);
		return updated.rowCount ?? 0;
	}
	if (kind === PAYMENT_SUBJECTS.ONE_PER_THOUSAND_FILING) {
		const updated = await client.query(
			`UPDATE one_per_thousand_filings
			 SET status = $2, rejection_reason = $3, resolved_by = $4, resolved_at = CURRENT_TIMESTAMP
			 WHERE id = $1 AND status = 'PENDIENTE'`,
			[relatedId, status, reason, userId]
		);
		if ((updated.rowCount ?? 0) > 0) {
			await client.query(
				`UPDATE one_per_thousand_declarations SET status = $2 WHERE filing_id = $1`,
				[relatedId, status]
			);
		}
		return updated.rowCount ?? 0;
	}
	if (kind === PAYMENT_SUBJECTS.MINING_ROYALTY) {
		const updated = await client.query(
			`UPDATE mining_royalties
			 SET status = $2, rejection_reason = $3, resolved_by = $4, resolved_at = CURRENT_TIMESTAMP
			 WHERE id = $1 AND status = 'PENDIENTE'`,
			[relatedId, status, reason, userId]
		);
		return updated.rowCount ?? 0;
	}
	if (kind === PAYMENT_SUBJECTS.ELECTRONIC_STAMP && status === PAYMENT_STATUS.RECHAZADO) {
		const updated = await client.query(
			`UPDATE electronic_stamps
			 SET status = 'ANULADO'
			 WHERE uuid_code = $1 AND status = 'ACTIVO'`,
			[relatedId]
		);
		return updated.rowCount ?? 0;
	}
	return 0;
}

/** @param {import('pg').PoolClient} client @param {string} id */
async function loadPayment(client, id) {
	const { rows } = await client.query(`SELECT ${COLUMNS} ${FROM} WHERE p.id = $1`, [id]);
	return rows[0] ?? null;
}

/** POST /payments/upload */
export async function upload(req, res) {
	const body = req.body;
	const date = calendarDate(body.paymentDate);
	if (!date) {
		throw new HttpError(400, ERROR_CODES.VALIDATION_ERROR, 'La fecha de pago no existe.');
	}
	if (date > todayInCaracas()) {
		throw new HttpError(400, ERROR_CODES.VALIDATION_ERROR, 'La fecha de pago no puede ser futura.');
	}
	const voucher = readVoucher(body.voucher);
	const taxpayer = await approvedTaxpayer(req);
	const amount = body.amountPaidVed.toFixed(2);
	const id = randomUUID();
	const client = await getPool().connect();
	try {
		await client.query('BEGIN');
		const account = await requireBankAccount(client, body.bankAccountId, body.taxType);
		if (body.relatedKind) {
			const subject = await lockSubject(
				client,
				taxpayer.id,
				body.relatedKind,
				body.relatedId,
				amount,
				body.taxType
			);
			if (subject.status === PAYMENT_STATUS.RECHAZADO || subject.status === STAMP_STATUS.ANULADO) {
				throw new HttpError(409, ERROR_CODES.CONFLICT, 'La obligación asociada ya fue rechazada.');
			}
		}
		await client.query(
			`INSERT INTO payments (
				id, taxpayer_id, tax_type, target_bank_account_id, bank_reference_number,
				origin_bank, payment_date, amount_paid_ved, voucher_file_path, voucher_media_type,
				voucher_content, related_kind, related_id
			) VALUES (
				$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
			)`,
			[
				id,
				taxpayer.id,
				body.taxType,
				account.id,
				body.bankReferenceNumber,
				body.originBank,
				date,
				amount,
				`payments/${id}/${voucher.fileName}`,
				voucher.mediaType,
				voucher.content,
				body.relatedKind ?? null,
				body.relatedId ?? null
			]
		);
		const row = await loadPayment(client, id);
		await writeAudit(client, {
			userId: req.user.id,
			action: 'CREATE',
			tableAffected: 'payments',
			recordId: id,
			oldValues: null,
			newValues: {
				taxType: row.tax_type,
				amountPaidVed: row.amount_paid_ved,
				bankReferenceNumber: row.bank_reference_number,
				relatedKind: row.related_kind,
				relatedId: row.related_id,
				status: row.status
			},
			...requestMeta(req)
		});
		await client.query('COMMIT');
		res.status(201).json({ payment: present(row) });
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}

/** GET /payments/mine */
export async function listMine(req, res) {
	const { rows: taxpayers } = await getPool().query('SELECT id FROM taxpayers WHERE user_id = $1', [
		req.user.id
	]);
	if (!taxpayers[0]) {
		res.json({ payments: [] });
		return;
	}
	const { rows } = await getPool().query(
		`SELECT ${COLUMNS} ${FROM} WHERE p.taxpayer_id = $1 ORDER BY p.created_at DESC`,
		[taxpayers[0].id]
	);
	res.json({ payments: rows.map(present) });
}

/** GET /payments/pending */
export async function listPending(req, res) {
	const params = [];
	let where = `WHERE p.status = 'PENDIENTE'`;
	if (req.query.taxType) {
		params.push(req.query.taxType);
		where += ` AND p.tax_type = $${params.length}`;
	}
	const { rows } = await getPool().query(
		`SELECT ${COLUMNS} ${FROM} ${where} ORDER BY p.created_at ASC`,
		params
	);
	res.json({ payments: rows.map(present) });
}

/** GET /payments/:id */
export async function getOne(req, res) {
	const { rows } = await getPool().query(`SELECT ${COLUMNS}, t.user_id ${FROM} WHERE p.id = $1`, [
		req.params.id
	]);
	const row = rows[0];
	if (!row) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró el pago.');
	const owns = row.user_id === req.user.id;
	const conciliates = hasPermission(req.user.role, PERMISSIONS.PAGOS_CONCILIAR);
	if (!owns && !conciliates) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró el pago.');
	}
	res.json({ payment: present(row) });
}

/** GET /payments/:id/voucher */
export async function downloadVoucher(req, res) {
	const { rows } = await getPool().query(
		`SELECT p.voucher_content, p.voucher_media_type, p.voucher_file_path, t.user_id
		 FROM payments p
		 JOIN taxpayers t ON t.id = p.taxpayer_id
		 WHERE p.id = $1`,
		[req.params.id]
	);
	const row = rows[0];
	if (!row) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró el pago.');
	const owns = row.user_id === req.user.id;
	const conciliates = hasPermission(req.user.role, PERMISSIONS.PAGOS_CONCILIAR);
	if (!owns && !conciliates) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró el pago.');
	}
	const fileName = String(row.voucher_file_path).split('/').pop() || 'comprobante';
	res.status(200);
	res.setHeader('Content-Type', row.voucher_media_type);
	res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
	res.setHeader('Content-Length', String(row.voucher_content.length));
	res.send(row.voucher_content);
}

/** @param {import('pg').PoolClient} client @param {string} id */
async function lockPayment(client, id) {
	const { rows } = await client.query(
		`SELECT id, taxpayer_id, tax_type, amount_paid_ved::text AS amount_paid_ved,
		        related_kind, related_id, status, bank_reference_number
		 FROM payments WHERE id = $1 FOR UPDATE`,
		[id]
	);
	const row = rows[0];
	if (!row) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró el pago.');
	if (row.status !== PAYMENT_STATUS.PENDIENTE) {
		throw new HttpError(409, ERROR_CODES.CONFLICT, 'Este pago ya fue conciliado.');
	}
	return row;
}

/** PATCH /payments/:id/verify */
export async function verify(req, res) {
	const client = await getPool().connect();
	try {
		await client.query('BEGIN');
		const current = await lockPayment(client, req.params.id);
		if (current.related_kind) {
			const subject = await lockSubject(
				client,
				current.taxpayer_id,
				current.related_kind,
				current.related_id,
				current.amount_paid_ved,
				current.tax_type
			);
			if (subject.status === PAYMENT_STATUS.RECHAZADO) {
				throw new HttpError(409, ERROR_CODES.CONFLICT, 'La obligación asociada ya fue rechazada.');
			}
			if (subject.status === PAYMENT_STATUS.PENDIENTE) {
				await applyToSubject(
					client,
					current.related_kind,
					current.related_id,
					req.user.id,
					PAYMENT_STATUS.VERIFICADO,
					null
				);
			}
		}
		await client.query(
			`UPDATE payments
			 SET status = 'VERIFICADO', verified_by = $2, verified_at = CURRENT_TIMESTAMP, rejection_reason = NULL
			 WHERE id = $1`,
			[current.id, req.user.id]
		);
		await writeAudit(client, {
			userId: req.user.id,
			action: 'APPROVE',
			tableAffected: 'payments',
			recordId: current.id,
			oldValues: { status: current.status },
			newValues: {
				status: PAYMENT_STATUS.VERIFICADO,
				relatedKind: current.related_kind,
				relatedId: current.related_id
			},
			...requestMeta(req)
		});
		await client.query('COMMIT');
		const row = await loadPayment(getPool(), current.id);
		res.json({ payment: present(row) });
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}

/** PATCH /payments/:id/reject */
export async function reject(req, res) {
	const reason = req.body.rejectionReason;
	const client = await getPool().connect();
	try {
		await client.query('BEGIN');
		const current = await lockPayment(client, req.params.id);
		let subjectTouched = false;
		if (current.related_kind) {
			const subject = await lockSubject(
				client,
				current.taxpayer_id,
				current.related_kind,
				current.related_id,
				current.amount_paid_ved,
				current.tax_type
			);
			if (subject.status === PAYMENT_STATUS.VERIFICADO) {
				throw new HttpError(
					409,
					ERROR_CODES.CONFLICT,
					'La obligación ya fue aprobada y este pago no la revierte.'
				);
			}
			if (subject.status === STAMP_STATUS.CONSUMIDO) {
				throw new HttpError(
					409,
					ERROR_CODES.CONFLICT,
					'El timbre ya fue consumido y no se anula al rechazar el pago.'
				);
			}
			if (
				subject.status === PAYMENT_STATUS.PENDIENTE ||
				(current.related_kind === PAYMENT_SUBJECTS.ELECTRONIC_STAMP &&
					subject.status === STAMP_STATUS.ACTIVO)
			) {
				subjectTouched =
					(await applyToSubject(
						client,
						current.related_kind,
						current.related_id,
						req.user.id,
						PAYMENT_STATUS.RECHAZADO,
						reason
					)) > 0;
			}
		}
		await client.query(
			`UPDATE payments
			 SET status = 'RECHAZADO', rejection_reason = $2, verified_by = $3, verified_at = CURRENT_TIMESTAMP
			 WHERE id = $1`,
			[current.id, reason, req.user.id]
		);
		const owner = await client.query(
			`SELECT u.email
			 FROM taxpayers t
			 JOIN users u ON u.id = t.user_id
			 WHERE t.id = $1`,
			[current.taxpayer_id]
		);
		const email = owner.rows[0].email;
		const subject = `Pago rechazado — referencia ${current.bank_reference_number}`.slice(0, 200);
		const body = [
			`SATET rechazó el pago con referencia ${current.bank_reference_number}.`,
			`Monto: ${current.amount_paid_ved} VED.`,
			`Motivo: ${reason}`,
			'La planilla o el timbre asociado no queda activo.'
		].join('\n');
		await client.query(
			`INSERT INTO payment_notices (payment_id, email, subject, body) VALUES ($1, $2, $3, $4)`,
			[current.id, email, subject, body]
		);
		await writeAudit(client, {
			userId: req.user.id,
			action: 'REJECT',
			tableAffected: 'payments',
			recordId: current.id,
			oldValues: { status: current.status },
			newValues: {
				status: PAYMENT_STATUS.RECHAZADO,
				rejectionReason: reason,
				subjectTouched,
				notice: { email, subject }
			},
			...requestMeta(req)
		});
		await client.query('COMMIT');
		const row = await loadPayment(getPool(), current.id);
		res.json({ payment: present(row), notice: present(row).notice });
	} catch (err) {
		await client.query('ROLLBACK');
		throw err;
	} finally {
		client.release();
	}
}
