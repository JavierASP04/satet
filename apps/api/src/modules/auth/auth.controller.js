import { ERROR_CODES, ROLES } from '@satet/shared';
import { getPool } from '../../db/pool.js';
import { withTransaction } from '../../db/tx.js';
import { writeAudit } from '../../lib/audit.js';
import { HttpError } from '../../lib/http.js';
import { hashPassword, verifyPassword } from '../../lib/passwords.js';
import { taxpayerSnapshot, toTaxpayer, toUser } from '../../lib/present.js';
import { requestMeta } from '../../lib/request-meta.js';
import { clearSessionCookie, setSessionCookie, signSessionToken } from './session.js';

const USER_COLUMNS = 'id, email, role, is_active, created_at, updated_at';

const INSERT_TAXPAYER = `INSERT INTO taxpayers (
  user_id, doc_type, rif_number, company_name, commercial_denomination,
  fiscal_address, phone_number, legal_representative_name, legal_representative_dna
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
RETURNING *`;

/** @param {Record<string, any>} body */
function taxpayerParams(userId, body) {
	return [
		userId,
		body.docType,
		body.rifNumber,
		body.companyName,
		body.commercialDenomination,
		body.fiscalAddress,
		body.phoneNumber,
		body.legalRepresentativeName,
		body.legalRepresentativeDna
	];
}

export async function register(req, res) {
	const passwordHash = await hashPassword(req.body.password);
	const meta = requestMeta(req);

	const created = await withTransaction(async (client) => {
		const userResult = await client.query(
			`INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING ${USER_COLUMNS}`,
			[req.body.email, passwordHash, ROLES.CONTRIBUYENTE]
		);
		const user = userResult.rows[0];
		const taxpayerResult = await client.query(INSERT_TAXPAYER, taxpayerParams(user.id, req.body));
		const taxpayer = taxpayerResult.rows[0];

		await writeAudit(client, {
			userId: user.id,
			action: 'CREATE',
			tableAffected: 'users',
			recordId: user.id,
			oldValues: null,
			newValues: { email: user.email, role: user.role, is_active: user.is_active },
			...meta
		});
		await writeAudit(client, {
			userId: user.id,
			action: 'CREATE',
			tableAffected: 'taxpayers',
			recordId: taxpayer.id,
			oldValues: null,
			newValues: taxpayerSnapshot(taxpayer),
			...meta
		});

		return { user, taxpayer };
	});

	res.status(201).json({
		user: toUser(created.user),
		taxpayer: toTaxpayer(created.taxpayer)
	});
}

export async function login(req, res) {
	const { rows } = await getPool().query(
		`SELECT id, email, password_hash, role, is_active, created_at, updated_at
     FROM users WHERE email = $1`,
		[req.body.email]
	);
	const user = rows[0] ?? null;
	const passwordOk = await verifyPassword(req.body.password, user?.password_hash);
	if (!user || !passwordOk || !user.is_active) {
		throw new HttpError(401, ERROR_CODES.UNAUTHORIZED, 'Credenciales inválidas.');
	}

	const taxpayerResult = await getPool().query('SELECT * FROM taxpayers WHERE user_id = $1', [
		user.id
	]);
	setSessionCookie(res, signSessionToken(user.id));
	res.json({
		user: toUser(user),
		taxpayer: taxpayerResult.rows[0] ? toTaxpayer(taxpayerResult.rows[0]) : null
	});
}

export function logout(_req, res) {
	clearSessionCookie(res);
	res.status(204).end();
}
