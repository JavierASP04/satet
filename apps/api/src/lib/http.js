import { ERROR_CODES } from '@satet/shared';

export class HttpError extends Error {
	/**
	 * @param {number} status
	 * @param {string} code
	 * @param {string} message
	 * @param {unknown} [details]
	 */
	constructor(status, code, message, details) {
		super(message);
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

/**
 * @param {string} code
 * @param {string} message
 * @param {unknown} [details]
 */
export function errorBody(code, message, details) {
	return { error: { code, message, ...(details === undefined ? {} : { details }) } };
}

/**
 * Controlador stub que responde 501 hasta que el módulo se implemente.
 * @param {string} operation
 */
export function notImplemented(operation) {
	return (_req, res) => {
		res
			.status(501)
			.json(errorBody(ERROR_CODES.NOT_IMPLEMENTED, `${operation}: aún no implementado.`));
	};
}
