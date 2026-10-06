import type { RequestHandler } from 'express';

/**
 * Pendiente (Módulo 01): verificar el JWT de la cookie de sesión y poblar `req.user`.
 * Mientras tanto deja pasar todas las peticiones; los controladores responden 501.
 */
export const authenticate: RequestHandler = (_req, _res, next) => {
	next();
};
