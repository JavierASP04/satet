import { ERROR_CODES, hasPermission } from '@satet/shared';
import { HttpError } from '../lib/http.js';

/**
 * Exige que el usuario autenticado tenga todos los permisos indicados.
 * @param {...string} permissions
 */
export function authorize(...permissions) {
	return (req, _res, next) => {
		if (!req.user) {
			next(new HttpError(401, ERROR_CODES.UNAUTHORIZED, 'No autenticado.'));
			return;
		}

		const allowed = permissions.every((permission) => hasPermission(req.user.role, permission));
		if (!allowed) {
			next(new HttpError(403, ERROR_CODES.FORBIDDEN, 'No tiene permiso para esta operación.'));
			return;
		}

		next();
	};
}
