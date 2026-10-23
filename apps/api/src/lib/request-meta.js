/**
 * IP y user-agent para la bitácora. No se confía en X-Forwarded-For: no hay proxy declarado.
 * @param {import('express').Request} req
 */
export function requestMeta(req) {
	const remote = req.ip || req.socket?.remoteAddress || '0.0.0.0';
	const ipAddress = remote.replace(/^::ffff:/, '').slice(0, 45) || '0.0.0.0';
	const header = req.get('user-agent');
	return {
		ipAddress,
		userAgent: header ? header.slice(0, 1000) : null
	};
}
