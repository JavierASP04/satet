import { ERROR_CODES } from '@satet/shared';
import { HttpError } from './http.js';

/**
 * Traduce una violación de unicidad de PostgreSQL al error de conflicto de la API.
 * @param {unknown} err
 * @returns {HttpError | null}
 */
export function conflictFromDb(err) {
	if (!err || typeof err !== 'object' || !('code' in err) || err.code !== '23505') return null;

	const constraint = 'constraint' in err ? err.constraint : undefined;
	if (constraint === 'users_email_key') {
		return new HttpError(409, ERROR_CODES.CONFLICT, 'Ya existe un usuario con ese correo.', {
			field: 'email'
		});
	}
	if (constraint === 'taxpayers_rif_number_key') {
		return new HttpError(409, ERROR_CODES.CONFLICT, 'Ya existe un contribuyente con ese RIF.', {
			field: 'rifNumber'
		});
	}
	if (constraint === 'taxpayers_user_id_key') {
		return new HttpError(409, ERROR_CODES.CONFLICT, 'Ese usuario ya tiene un expediente.', {
			field: 'userId'
		});
	}

	return new HttpError(
		409,
		ERROR_CODES.CONFLICT,
		'El registro entra en conflicto con uno existente.'
	);
}
