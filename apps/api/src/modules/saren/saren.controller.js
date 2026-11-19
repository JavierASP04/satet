import { ERROR_CODES, STAMP_STATUS, STAMP_VERIFICATION_CODES } from '@satet/shared';
import { getPool } from '../../db/pool.js';
import { withTransaction } from '../../db/tx.js';
import { writeAudit } from '../../lib/audit.js';
import { HttpError } from '../../lib/http.js';
import { formatFixed } from '../../lib/present.js';
import { requestMeta } from '../../lib/request-meta.js';
import { verifyStampQr } from '../stamps/stamps.qr.js';

const NOT_FOUND_MESSAGE = 'El timbre fiscal no existe en los registros oficiales.';
const ANNULLED_MESSAGE = 'Este timbre fiscal fue anulado previamente.';
const CONSUMED_MESSAGE = 'Timbre fiscal VÁLIDO. Ha sido marcado como CONSUMIDO en este momento.';

const STAMP_ROW = `
	s.id, s.uuid_code, s.amount_eur::text AS amount_eur,
	s.bcv_rate_applied::text AS bcv_rate_applied,
	s.amount_ved::text AS amount_ved, s.qr_payload, s.status,
	s.consumed_at, s.consumed_by_saren_user, s.saren_office_name, s.created_at
`;

/** @param {unknown} value */
function iso(value) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(String(value));
	return date.toISOString();
}

/**
 * @param {Record<string, unknown>} left
 * @param {Record<string, unknown>} right
 */
function samePayload(left, right) {
	return (
		left.uuid === right.uuid &&
		left.rif === right.rif &&
		left.taxpayer === right.taxpayer &&
		left.issued_at === right.issued_at &&
		formatFixed(left.amount_eur, 2) === formatFixed(right.amount_eur, 2) &&
		formatFixed(left.bcv_rate, 4) === formatFixed(right.bcv_rate, 4) &&
		formatFixed(left.amount_ved, 2) === formatFixed(right.amount_ved, 2)
	);
}

/**
 * El nombre y el RIF viven en el expediente y pueden cambiar después de emitir.
 * La fila del timbre conserva los montos; si no coinciden con el QR guardado, no se consume.
 * @param {Record<string, any>} row
 * @param {Record<string, unknown>} payload
 */
function rowMatchesPayload(row, payload) {
	return (
		row.uuid_code === payload.uuid &&
		formatFixed(row.amount_eur, 2) === formatFixed(payload.amount_eur, 2) &&
		formatFixed(row.bcv_rate_applied, 4) === formatFixed(payload.bcv_rate, 4) &&
		formatFixed(row.amount_ved, 2) === formatFixed(payload.amount_ved, 2)
	);
}

/**
 * @param {Record<string, any>} row
 * @param {Record<string, unknown>} payload
 */
function presentStamp(row, payload) {
	return {
		uuid: row.uuid_code,
		rif: payload.rif,
		taxpayer: payload.taxpayer,
		amountEur: formatFixed(row.amount_eur, 2),
		bcvRate: formatFixed(row.bcv_rate_applied, 4),
		amountVed: formatFixed(row.amount_ved, 2),
		issuedAt: payload.issued_at,
		status: row.status,
		consumedAt: iso(row.consumed_at),
		officeName: row.saren_office_name,
		consumedBy: row.consumed_by_saren_user
	};
}

/**
 * @param {import('pg').PoolClient} client
 * @param {import('express').Request} req
 * @param {string} recordId
 * @param {string} action
 * @param {unknown} oldValues
 * @param {unknown} newValues
 */
async function audit(client, req, recordId, action, oldValues, newValues) {
	await writeAudit(client, {
		userId: req.user.id,
		action,
		tableAffected: 'electronic_stamps',
		recordId,
		oldValues,
		newValues,
		...requestMeta(req)
	});
}

/**
 * @param {import('pg').PoolClient} client
 * @param {import('express').Request} req
 * @param {Record<string, any>} stamp
 */
async function alreadyUsed(client, req, stamp) {
	const consumedAt = iso(stamp.consumed_at);
	const officeName = stamp.saren_office_name ?? '';
	await audit(
		client,
		req,
		stamp.id,
		'REJECT',
		{ status: STAMP_STATUS.CONSUMIDO, consumedAt, officeName },
		{ code: STAMP_VERIFICATION_CODES.ALREADY_USED, attemptedOffice: req.body.officeName }
	);
	return {
		success: false,
		code: STAMP_VERIFICATION_CODES.ALREADY_USED,
		message: `ALERTA DE REUTILIZACIÓN: Este timbre ya fue consumido el ${consumedAt} en la oficina ${officeName}.`
	};
}

/**
 * @param {import('pg').PoolClient} client
 * @param {import('express').Request} req
 * @param {Record<string, any>} stamp
 */
async function annulled(client, req, stamp) {
	await audit(
		client,
		req,
		stamp.id,
		'REJECT',
		{ status: STAMP_STATUS.ANULADO },
		{ code: STAMP_VERIFICATION_CODES.ANNULLED, attemptedOffice: req.body.officeName }
	);
	return {
		success: false,
		code: STAMP_VERIFICATION_CODES.ANNULLED,
		message: ANNULLED_MESSAGE
	};
}

/** POST /saren/verify-stamp */
export async function verifyStamp(req, res) {
	const body = req.body;
	let uuid = body.uuid ?? null;
	/** @type {Record<string, unknown> | null} */
	let submitted = null;
	if (body.qrPayload) {
		submitted = verifyStampQr(body.qrPayload);
		if (!submitted) {
			throw new HttpError(400, ERROR_CODES.VALIDATION_ERROR, 'El código QR no es íntegro.');
		}
		if (uuid && uuid !== submitted.uuid) {
			throw new HttpError(
				400,
				ERROR_CODES.VALIDATION_ERROR,
				'El serial no coincide con el código QR.'
			);
		}
		uuid = submitted.uuid;
	}

	const result = await withTransaction(async (client) => {
		const { rows } = await client.query(
			`SELECT ${STAMP_ROW}
			 FROM electronic_stamps s
			 WHERE s.uuid_code = $1
			 FOR UPDATE`,
			[uuid]
		);
		const stamp = rows[0];
		if (!stamp) {
			return {
				success: false,
				code: STAMP_VERIFICATION_CODES.NOT_FOUND,
				message: NOT_FOUND_MESSAGE
			};
		}

		const stored = verifyStampQr(stamp.qr_payload);
		if (!stored) {
			throw new HttpError(
				500,
				ERROR_CODES.INTERNAL_ERROR,
				'El timbre guardado no se puede verificar.'
			);
		}
		if (submitted && (!samePayload(submitted, stored) || !rowMatchesPayload(stamp, submitted))) {
			throw new HttpError(
				400,
				ERROR_CODES.VALIDATION_ERROR,
				'El código QR no corresponde al timbre registrado.'
			);
		}
		if (!rowMatchesPayload(stamp, stored)) {
			throw new HttpError(
				500,
				ERROR_CODES.INTERNAL_ERROR,
				'El timbre guardado no se puede verificar.'
			);
		}

		if (stamp.status === STAMP_STATUS.CONSUMIDO) return alreadyUsed(client, req, stamp);
		if (stamp.status === STAMP_STATUS.ANULADO) return annulled(client, req, stamp);
		if (stamp.status !== STAMP_STATUS.ACTIVO) {
			throw new HttpError(
				500,
				ERROR_CODES.INTERNAL_ERROR,
				'El timbre guardado no se puede verificar.'
			);
		}

		const updated = await client.query(
			`UPDATE electronic_stamps
			 SET status = 'CONSUMIDO',
			     consumed_at = CURRENT_TIMESTAMP,
			     consumed_by_saren_user = $2,
			     saren_office_name = $3
			 WHERE id = $1 AND status = 'ACTIVO'
			 RETURNING consumed_at`,
			[stamp.id, req.user.id, body.officeName]
		);
		if (!updated.rows[0]) {
			const again = await client.query(
				`SELECT ${STAMP_ROW} FROM electronic_stamps s WHERE s.id = $1`,
				[stamp.id]
			);
			const current = again.rows[0];
			if (current?.status === STAMP_STATUS.CONSUMIDO) return alreadyUsed(client, req, current);
			if (current?.status === STAMP_STATUS.ANULADO) return annulled(client, req, current);
			throw new HttpError(
				500,
				ERROR_CODES.INTERNAL_ERROR,
				'El timbre guardado no se puede verificar.'
			);
		}

		stamp.status = STAMP_STATUS.CONSUMIDO;
		stamp.consumed_at = updated.rows[0].consumed_at;
		stamp.consumed_by_saren_user = req.user.id;
		stamp.saren_office_name = body.officeName;
		const consumedAt = iso(stamp.consumed_at);
		await audit(
			client,
			req,
			stamp.id,
			'CONSUME',
			{ status: STAMP_STATUS.ACTIVO },
			{ status: STAMP_STATUS.CONSUMIDO, consumedAt, officeName: body.officeName }
		);
		return {
			success: true,
			code: STAMP_VERIFICATION_CODES.VALIDATED_AND_CONSUMED,
			message: CONSUMED_MESSAGE,
			data: presentStamp(stamp, stored)
		};
	});

	res.status(200).json(result);
}

/** GET /saren/history */
export async function history(req, res) {
	const officeName = req.query.officeName ?? null;
	const limit = req.query.limit ?? 100;
	const { rows } = await getPool().query(
		`SELECT ${STAMP_ROW}, u.email AS consumed_by_email
		 FROM electronic_stamps s
		 LEFT JOIN users u ON u.id = s.consumed_by_saren_user
		 WHERE s.status = 'CONSUMIDO'
		   AND ($1::varchar IS NULL OR s.saren_office_name = $1)
		 ORDER BY s.consumed_at DESC
		 LIMIT $2`,
		[officeName, limit]
	);

	res.status(200).json({
		verifications: rows.map((row) => {
			const stored = verifyStampQr(row.qr_payload);
			const presented = stored
				? presentStamp(row, stored)
				: {
						uuid: row.uuid_code,
						rif: null,
						taxpayer: null,
						amountEur: formatFixed(row.amount_eur, 2),
						bcvRate: formatFixed(row.bcv_rate_applied, 4),
						amountVed: formatFixed(row.amount_ved, 2),
						issuedAt: iso(row.created_at),
						status: row.status,
						consumedAt: iso(row.consumed_at),
						officeName: row.saren_office_name,
						consumedBy: row.consumed_by_saren_user
					};
			return { ...presented, consumedByEmail: row.consumed_by_email ?? null };
		})
	});
}
