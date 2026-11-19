import { ROLES } from '@satet/shared';
import { getPool } from '../../db/pool.js';
import { withTransaction } from '../../db/tx.js';
import { writeAudit } from '../../lib/audit.js';
import { hashPassword } from '../../lib/passwords.js';
import { toUser } from '../../lib/present.js';
import { requestMeta } from '../../lib/request-meta.js';

const USER_COLUMNS = 'id, email, role, is_active, created_at, updated_at';

/** GET /users/verificadores */
export async function listVerifiers(_req, res) {
	const { rows } = await getPool().query(
		`SELECT ${USER_COLUMNS}
		 FROM users
		 WHERE role = $1
		 ORDER BY created_at DESC`,
		[ROLES.VERIFICADOR_SAREN]
	);
	res.json({ users: rows.map((row) => toUser(row)) });
}

/** POST /users/verificadores */
export async function createVerifier(req, res) {
	const passwordHash = await hashPassword(req.body.password);
	const meta = requestMeta(req);

	const user = await withTransaction(async (client) => {
		const { rows } = await client.query(
			`INSERT INTO users (email, password_hash, role)
			 VALUES ($1, $2, $3)
			 RETURNING ${USER_COLUMNS}`,
			[req.body.email, passwordHash, ROLES.VERIFICADOR_SAREN]
		);
		const created = rows[0];
		await writeAudit(client, {
			userId: req.user.id,
			action: 'CREATE',
			tableAffected: 'users',
			recordId: created.id,
			oldValues: null,
			newValues: { email: created.email, role: created.role, is_active: created.is_active },
			...meta
		});
		return created;
	});

	res.status(201).json({ user: toUser(user) });
}
