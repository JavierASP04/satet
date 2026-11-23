import { randomUUID } from 'node:crypto';
import { ERROR_CODES, ROLES, STAMP_STATUS } from '@satet/shared';
import { z } from 'zod';
import { getPool } from '../../db/pool.js';
import { withTransaction } from '../../db/tx.js';
import { writeAudit } from '../../lib/audit.js';
import { HttpError } from '../../lib/http.js';
import { formatFixed, toStamp } from '../../lib/present.js';
import { requestMeta } from '../../lib/request-meta.js';
import { env } from '../../config/env.js';
import { findCurrentBcvRate } from '../bcv-rate/bcv-rate.store.js';
import { renderStampPdf } from './stamps.pdf.js';
import { signStampQr } from './stamps.qr.js';

const STAMP_COLUMNS = `
	s.id, s.uuid_code, s.amount_eur::text AS amount_eur,
	s.bcv_rate_applied::text AS bcv_rate_applied,
	s.amount_ved::text AS amount_ved, s.qr_payload, s.status, s.created_at,
	s.fee_code, f.concept,
	t.company_name, t.rif_number, t.user_id
`;

const STAMP_FROM = `
	FROM electronic_stamps s
	JOIN taxpayers t ON t.id = s.taxpayer_id
	LEFT JOIN fiscal_stamp_fees f ON f.code = s.fee_code
`;

/** @param {import('express').Request} req */
async function approvedTaxpayer(req) {
	const { rows } = await getPool().query(
		`SELECT id, rif_number, company_name, is_approved
		 FROM taxpayers
		 WHERE user_id = $1`,
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
			'El expediente debe estar aprobado para emitir timbres.'
		);
	}
	return taxpayer;
}

/** GET /stamps/fees */
export async function listFees(_req, res) {
	const { rows } = await getPool().query(
		`SELECT code, article, item, concept, times_official_rate::text AS times_official_rate
		 FROM fiscal_stamp_fees
		 ORDER BY sort_order`
	);
	res.status(200).json({
		fees: rows.map((row) => ({
			code: row.code,
			article: row.article,
			item: row.item,
			concept: row.concept,
			timesOfficialRate: formatFixed(row.times_official_rate, 2)
		}))
	});
}

/** POST /stamps/purchase */
export async function purchase(req, res) {
	const fee = await getPool().query(
		`SELECT code, concept, times_official_rate::text AS times_official_rate
		 FROM fiscal_stamp_fees
		 WHERE code = $1`,
		[req.body.feeCode]
	);
	if (!fee.rows[0]) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'Ese concepto no está en el tabulador.');
	}
	const amountEur = formatFixed(fee.rows[0].times_official_rate, 2);
	const taxpayer = await approvedTaxpayer(req);
	const rate = await findCurrentBcvRate();
	if (!rate) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No hay una tasa BCV vigente.');
	}

	const uuid = randomUUID();
	const priced = await getPool().query(
		`SELECT ROUND($1::numeric * $2::numeric, 2)::text AS amount_ved`,
		[amountEur, rate.rate_in_ved]
	);
	const amountVed = formatFixed(priced.rows[0].amount_ved, 2);
	const bcvRate = formatFixed(rate.rate_in_ved, 4);
	const issuedAt = new Date().toISOString();
	const qrPayload = signStampQr({
		uuid,
		rif: taxpayer.rif_number,
		taxpayer: taxpayer.company_name,
		amountEur,
		bcvRate,
		amountVed,
		issuedAt
	});

	const row = await withTransaction(async (client) => {
		const inserted = await client.query(
			`INSERT INTO electronic_stamps (
				uuid_code, taxpayer_id, amount_eur, bcv_rate_applied, amount_ved, qr_payload, fee_code, status, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, 'SOLICITADO', $8)
			RETURNING id`,
			[uuid, taxpayer.id, amountEur, bcvRate, amountVed, qrPayload, fee.rows[0].code, issuedAt]
		);
		const created = inserted.rows[0];
		await writeAudit(client, {
			userId: req.user.id,
			action: 'CREATE',
			tableAffected: 'electronic_stamps',
			recordId: created.id,
			oldValues: null,
			newValues: {
				uuid,
				rif: taxpayer.rif_number,
				taxpayer: taxpayer.company_name,
				fee_code: fee.rows[0].code,
				amount_eur: amountEur,
				bcv_rate: bcvRate,
				amount_ved: amountVed,
				status: 'SOLICITADO'
			},
			...requestMeta(req)
		});
		return created;
	});

	const { rows } = await getPool().query(
		`SELECT ${STAMP_COLUMNS}
		 ${STAMP_FROM}
		 WHERE s.id = $1`,
		[row.id]
	);
	res.status(201).json({ stamp: toStamp(rows[0]) });
}

/** GET /stamps/:uuid/pdf */
export async function downloadPdf(req, res) {
	if (!z.uuid().safeParse(req.params.uuid).success) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró el timbre.');
	}

	const { rows } = await getPool().query(
		`SELECT ${STAMP_COLUMNS}
		 ${STAMP_FROM}
		 WHERE s.uuid_code = $1`,
		[req.params.uuid]
	);
	const row = rows[0];
	if (!row) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró el timbre.');
	}

	const isAdmin = req.user.role === ROLES.ADMIN_SISTEMA;
	if (row.user_id !== req.user.id && !isAdmin) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró el timbre.');
	}
	if (row.status !== STAMP_STATUS.ACTIVO) {
		throw new HttpError(
			409,
			ERROR_CODES.CONFLICT,
			'El timbre se descarga cuando el pago está aprobado.'
		);
	}

	const stamp = toStamp(row);
	const pdf = await renderStampPdf(stamp, publicStampUrl(stamp.uuid));
	res.status(200);
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `attachment; filename="timbre-${stamp.uuid}.pdf"`);
	res.setHeader('Content-Length', String(pdf.length));
	res.send(pdf);
}

/** @param {string} uuid */
function publicStampUrl(uuid) {
	return `${env.WEB_ORIGIN}/timbres/consulta/${uuid}`;
}

const PUBLIC_STATUS = {
	SOLICITADO: 'Pendiente de aprobación',
	ACTIVO: 'Válido',
	CONSUMIDO: 'Consumido',
	ANULADO: 'Anulado',
	RECHAZADO: 'Rechazado'
};

/** GET /stamps/pending */
export async function listPending(_req, res) {
	const { rows } = await getPool().query(
		`SELECT ${STAMP_COLUMNS}
		 ${STAMP_FROM}
		 WHERE s.status = 'SOLICITADO'
		 ORDER BY s.created_at ASC`
	);
	res.json({ stamps: rows.map((row) => toStamp(row)) });
}

/** GET /stamps/public/:uuid */
export async function publicView(req, res) {
	if (!z.uuid().safeParse(req.params.uuid).success) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró el timbre.');
	}
	const { rows } = await getPool().query(
		`SELECT ${STAMP_COLUMNS} ${STAMP_FROM} WHERE s.uuid_code = $1`,
		[req.params.uuid]
	);
	const row = rows[0];
	if (!row) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró el timbre.');
	const stamp = toStamp(row);
	res.status(200).json({
		serial: stamp.uuid,
		issuedAt: stamp.issuedAt,
		expiresAt: null,
		daysRemaining: null,
		validityDays: null,
		validityNote:
			'La vigencia en días no está definida: la reunión dejó abiertos 7 y 15 días, sin elegir uno.',
		concept: stamp.concept ?? null,
		status: stamp.status,
		statusLabel: PUBLIC_STATUS[stamp.status] ?? stamp.status,
		reusable: stamp.status === STAMP_STATUS.ACTIVO,
		rif: stamp.rif,
		taxpayer: stamp.taxpayer,
		amountEur: stamp.amountEur,
		amountVed: stamp.amountVed
	});
}

/** POST /stamps/:uuid/resolve */
export async function resolveStamp(req, res) {
	if (!z.uuid().safeParse(req.params.uuid).success) {
		throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró el timbre.');
	}
	const approved = req.body.decision === 'APROBAR';
	const row = await withTransaction(async (client) => {
		const current = await client.query(
			`SELECT id, status FROM electronic_stamps WHERE uuid_code = $1 FOR UPDATE`,
			[req.params.uuid]
		);
		const stamp = current.rows[0];
		if (!stamp) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró el timbre.');
		if (stamp.status !== STAMP_STATUS.SOLICITADO) {
			throw new HttpError(409, ERROR_CODES.CONFLICT, 'Esta solicitud de timbre ya fue resuelta.');
		}
		if (approved) {
			const paid = await client.query(
				`SELECT id FROM payments
				 WHERE related_kind = 'ELECTRONIC_STAMP' AND related_id = $1 AND status = 'VERIFICADO'`,
				[req.params.uuid]
			);
			if (!paid.rows[0]) {
				throw new HttpError(
					409,
					ERROR_CODES.CONFLICT,
					'El pago del timbre tiene que estar registrado y aprobado.'
				);
			}
		}
		await client.query(
			`UPDATE electronic_stamps
			 SET status = $2, rejection_reason = $3, resolved_by = $4, resolved_at = CURRENT_TIMESTAMP
			 WHERE id = $1`,
			[
				stamp.id,
				approved ? STAMP_STATUS.ACTIVO : STAMP_STATUS.RECHAZADO,
				approved ? null : req.body.rejectionReason,
				req.user.id
			]
		);
		await writeAudit(client, {
			userId: req.user.id,
			action: approved ? 'APPROVE' : 'REJECT',
			tableAffected: 'electronic_stamps',
			recordId: stamp.id,
			oldValues: { status: stamp.status },
			newValues: { status: approved ? STAMP_STATUS.ACTIVO : STAMP_STATUS.RECHAZADO },
			...requestMeta(req)
		});
		return stamp;
	});
	const { rows } = await getPool().query(
		`SELECT ${STAMP_COLUMNS} ${STAMP_FROM} WHERE s.id = $1`,
		[row.id]
	);
	res.status(200).json({ stamp: toStamp(rows[0]) });
}
