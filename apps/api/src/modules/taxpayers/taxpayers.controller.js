import { ERROR_CODES } from '@satet/shared';
import { getPool } from '../../db/pool.js';
import { withTransaction } from '../../db/tx.js';
import { writeAudit } from '../../lib/audit.js';
import { HttpError } from '../../lib/http.js';
import { taxpayerSnapshot, toTaxpayer, toUser } from '../../lib/present.js';
import { requestMeta } from '../../lib/request-meta.js';

const USER_COLUMNS = 'id, email, role, is_active, created_at, updated_at';

async function loadUser(userId) {
	const { rows } = await getPool().query(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [
		userId
	]);
	return rows[0] ?? null;
}

export async function getProfile(req, res) {
	const user = await loadUser(req.user.id);
	if (!user || !user.is_active) {
		throw new HttpError(401, ERROR_CODES.UNAUTHORIZED, 'No autenticado.');
	}

	const taxpayerResult = await getPool().query('SELECT * FROM taxpayers WHERE user_id = $1', [
		user.id
	]);
	res.json({
		user: toUser(user),
		taxpayer: taxpayerResult.rows[0] ? toTaxpayer(taxpayerResult.rows[0]) : null
	});
}

export async function updateProfile(req, res) {
	const meta = requestMeta(req);
	const body = req.body;

	const taxpayer = await withTransaction(async (client) => {
		const current = await client.query('SELECT * FROM taxpayers WHERE user_id = $1 FOR UPDATE', [
			req.user.id
		]);
		const row = current.rows[0];
		if (!row) {
			throw new HttpError(
				404,
				ERROR_CODES.NOT_FOUND,
				'El usuario no tiene expediente de contribuyente.'
			);
		}
		if (row.is_approved) {
			throw new HttpError(
				403,
				ERROR_CODES.FORBIDDEN,
				'El expediente ya fue aprobado y no puede modificarse.'
			);
		}

		const updated = await client.query(
			`UPDATE taxpayers SET
         doc_type = $1,
         rif_number = $2,
         company_name = $3,
         commercial_denomination = $4,
         fiscal_address = $5,
         phone_number = $6,
         legal_representative_name = $7,
         legal_representative_dna = $8,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND is_approved = FALSE
       RETURNING *`,
			[
				body.docType,
				body.rifNumber,
				body.companyName,
				body.commercialDenomination,
				body.fiscalAddress,
				body.phoneNumber,
				body.legalRepresentativeName,
				body.legalRepresentativeDna,
				row.id
			]
		);
		const next = updated.rows[0];
		if (!next) {
			throw new HttpError(
				403,
				ERROR_CODES.FORBIDDEN,
				'El expediente ya fue aprobado y no puede modificarse.'
			);
		}

		await writeAudit(client, {
			userId: req.user.id,
			action: 'UPDATE',
			tableAffected: 'taxpayers',
			recordId: next.id,
			oldValues: taxpayerSnapshot(row),
			newValues: taxpayerSnapshot(next),
			...meta
		});
		return next;
	});

	res.json({ taxpayer: toTaxpayer(taxpayer) });
}

export async function listPending(_req, res) {
	const { rows } = await getPool().query(
		`SELECT t.*, u.email
     FROM taxpayers t
     JOIN users u ON u.id = t.user_id
     WHERE t.is_approved = FALSE
     ORDER BY t.created_at ASC`
	);

	res.json({
		taxpayers: rows.map((row) => ({ ...toTaxpayer(row), email: row.email }))
	});
}

export async function approve(req, res) {
	const meta = requestMeta(req);
	const approved = req.body.approved;

	const taxpayer = await withTransaction(async (client) => {
		const current = await client.query('SELECT * FROM taxpayers WHERE id = $1 FOR UPDATE', [
			req.params.id
		]);
		const row = current.rows[0];
		if (!row) {
			throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'Expediente de contribuyente no encontrado.');
		}
		if (row.is_approved === approved) return row;

		const updated = await client.query(
			`UPDATE taxpayers
       SET is_approved = $1, approved_by = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
			[approved, approved ? req.user.id : null, row.id]
		);
		const next = updated.rows[0];
		await writeAudit(client, {
			userId: req.user.id,
			action: approved ? 'APPROVE' : 'REJECT',
			tableAffected: 'taxpayers',
			recordId: next.id,
			oldValues: taxpayerSnapshot(row),
			newValues: taxpayerSnapshot(next),
			...meta
		});
		return next;
	});

	res.json({ taxpayer: toTaxpayer(taxpayer) });
}
