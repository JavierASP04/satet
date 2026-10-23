import { randomUUID } from 'node:crypto';
import { ERROR_CODES, ROLES } from '@satet/shared';
import { z } from 'zod';
import { getPool } from '../../db/pool.js';
import { withTransaction } from '../../db/tx.js';
import { writeAudit } from '../../lib/audit.js';
import { HttpError } from '../../lib/http.js';
import { formatFixed, toStamp } from '../../lib/present.js';
import { requestMeta } from '../../lib/request-meta.js';
import { findCurrentBcvRate } from '../bcv-rate/bcv-rate.store.js';
import { renderStampPdf } from './stamps.pdf.js';
import { signStampQr } from './stamps.qr.js';

const STAMP_COLUMNS = `
	s.id, s.uuid_code, s.amount_eur::text AS amount_eur,
	s.bcv_rate_applied::text AS bcv_rate_applied,
	s.amount_ved::text AS amount_ved, s.qr_payload, s.status, s.created_at,
	t.company_name, t.rif_number, t.user_id
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

/** POST /stamps/purchase */
export async function purchase(req, res) {
	const amountEur = req.body.amountEur.toFixed(2);
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
				uuid_code, taxpayer_id, amount_eur, bcv_rate_applied, amount_ved, qr_payload, status, created_at
			) VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVO', $7)
			RETURNING id`,
			[uuid, taxpayer.id, amountEur, bcvRate, amountVed, qrPayload, issuedAt]
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
				amount_eur: amountEur,
				bcv_rate: bcvRate,
				amount_ved: amountVed,
				status: 'ACTIVO'
			},
			...requestMeta(req)
		});
		return created;
	});

	const { rows } = await getPool().query(
		`SELECT ${STAMP_COLUMNS}
		 FROM electronic_stamps s
		 JOIN taxpayers t ON t.id = s.taxpayer_id
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
		 FROM electronic_stamps s
		 JOIN taxpayers t ON t.id = s.taxpayer_id
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

	const stamp = toStamp(row);
	const pdf = await renderStampPdf(stamp);
	res.status(200);
	res.setHeader('Content-Type', 'application/pdf');
	res.setHeader('Content-Disposition', `attachment; filename="timbre-${stamp.uuid}.pdf"`);
	res.setHeader('Content-Length', String(pdf.length));
	res.send(pdf);
}
