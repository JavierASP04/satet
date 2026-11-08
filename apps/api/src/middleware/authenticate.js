import { ERROR_CODES } from '@satet/shared';
import { getPool } from '../db/pool.js';
import { HttpError } from '../lib/http.js';
import { readSessionToken, verifySessionToken } from '../modules/auth/session.js';

const UNAUTHENTICATED = () => new HttpError(401, ERROR_CODES.UNAUTHORIZED, 'No autenticado.');

/**
 * Exige la cookie de sesión, verifica el JWT y carga el usuario vigente.
 * Un usuario inactivo o inexistente se trata como no autenticado.
 */
export async function authenticate(req, _res, next) {
	try {
		const token = readSessionToken(req);
		if (!token) {
			next(UNAUTHENTICATED());
			return;
		}

		let userId;
		try {
			const payload = verifySessionToken(token);
			userId = typeof payload.sub === 'string' ? payload.sub : null;
		} catch {
			next(UNAUTHENTICATED());
			return;
		}

		if (!userId) {
			next(UNAUTHENTICATED());
			return;
		}

		const { rows } = await getPool().query(
			'SELECT id, email, role, is_active FROM users WHERE id = $1',
			[userId]
		);
		const user = rows[0];
		if (!user || !user.is_active) {
			next(UNAUTHENTICATED());
			return;
		}

		req.user = {
			id: user.id,
			email: user.email,
			role: user.role,
			isActive: user.is_active
		};
		next();
	} catch (err) {
		next(err);
	}
}
