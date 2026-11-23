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
		if (!approved) {
			if (row.is_approved) {
				throw new HttpError(
					409,
					ERROR_CODES.CONFLICT,
					'El expediente ya fue aprobado y no se elimina desde aquí.'
				);
			}
			await writeAudit(client, {
				userId: req.user.id,
				action: 'REJECT',
				tableAffected: 'taxpayers',
				recordId: row.id,
				oldValues: taxpayerSnapshot(row),
				newValues: null,
				...meta
			});
			await client.query('DELETE FROM taxpayers WHERE id = $1', [row.id]);
			await client.query(
				`UPDATE users
				 SET email = $1, password_hash = $2, is_active = FALSE, updated_at = CURRENT_TIMESTAMP
				 WHERE id = $3`,
				[`rechazado-${row.user_id}@cuentas.satet.invalid`, 'rechazado', row.user_id]
			);
			return null;
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

	if (!taxpayer) {
		res.json({ deleted: true });
		return;
	}
	res.json({ taxpayer: toTaxpayer(taxpayer) });
}

/** GET /taxpayers/alerts */
export async function listAlerts(req, res) {
	const { rows: taxpayers } = await getPool().query(
		'SELECT id, is_approved FROM taxpayers WHERE user_id = $1',
		[req.user.id]
	);
	const taxpayer = taxpayers[0];
	if (!taxpayer) {
		res.json({ alerts: [] });
		return;
	}
	const [mining, filings, royalties, payments] = await Promise.all([
		getPool().query(
			`SELECT period_year, period_month, status, is_extemporaneous
			 FROM mining_declarations
			 WHERE taxpayer_id = $1 AND status <> 'VERIFICADO'
			 ORDER BY period_year, period_month`,
			[taxpayer.id]
		),
		getPool().query(
			`SELECT id, status FROM one_per_thousand_filings
			 WHERE taxpayer_id = $1 AND status = 'PENDIENTE'`,
			[taxpayer.id]
		),
		getPool().query(
			`SELECT period_year, status, payment_form
			 FROM mining_royalties
			 WHERE taxpayer_id = $1 AND status = 'PENDIENTE'
			 ORDER BY period_year`,
			[taxpayer.id]
		),
		getPool().query(
			`SELECT id, tax_type FROM payments
			 WHERE taxpayer_id = $1 AND status = 'PENDIENTE'`,
			[taxpayer.id]
		)
	]);
	/** @type {{ kind: string, message: string }[]} */
	const alerts = [];
	if (!taxpayer.is_approved) {
		alerts.push({
			kind: 'EXPEDIENTE',
			message: 'Tu expediente está pendiente de aprobación. Los módulos de tributos siguen bloqueados.'
		});
	}
	for (const row of mining.rows) {
		const period = `${row.period_month}/${row.period_year}`;
		alerts.push({
			kind: row.is_extemporaneous ? 'VENCIDO' : 'PENDIENTE',
			message:
				row.status === 'RECHAZADO'
					? `La declaración minera de ${period} fue rechazada y sigue sin pagar.`
					: row.is_extemporaneous
						? `La declaración minera de ${period} está fuera de tiempo y sin verificar.`
						: `La declaración minera de ${period} está pendiente de verificación.`
		});
	}
	if (filings.rows.length > 0) {
		alerts.push({
			kind: 'PENDIENTE',
			message: `Tienes ${filings.rows.length} carga${filings.rows.length === 1 ? '' : 's'} de 1 por mil pendiente${filings.rows.length === 1 ? '' : 's'} de verificación.`
		});
	}
	for (const row of royalties.rows) {
		alerts.push({
			kind: 'PENDIENTE',
			message: row.payment_form
				? `La regalía de ${row.period_year} espera el pago o su verificación.`
				: `La regalía de ${row.period_year} espera que el administrador indique la forma de pago.`
		});
	}
	if (payments.rows.length > 0) {
		alerts.push({
			kind: 'PENDIENTE',
			message: `Tienes ${payments.rows.length} pago${payments.rows.length === 1 ? '' : 's'} pendiente${payments.rows.length === 1 ? '' : 's'} de conciliación.`
		});
	}
	res.json({ alerts });
}
