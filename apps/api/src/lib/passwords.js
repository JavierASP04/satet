import bcrypt from 'bcryptjs';
import { BCRYPT_COST } from '@satet/shared';

/**
 * Hash bcrypt real de costo 12. Sirve para igualar el tiempo de `compare`
 * cuando el correo no existe y así no revelar qué cuentas están registradas.
 */
const DUMMY_PASSWORD_HASH = '$2b$12$I7MnSZkBXu8NLILf2TyXFuRt5.eSEtv6krc8NrYc6CtA7ZEPbAp5y';

/** @param {string} password */
export function hashPassword(password) {
	return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * @param {string} password
 * @param {string | null | undefined} passwordHash
 */
export async function verifyPassword(password, passwordHash) {
	const matches = await bcrypt.compare(password, passwordHash ?? DUMMY_PASSWORD_HASH);
	return Boolean(passwordHash) && matches;
}
