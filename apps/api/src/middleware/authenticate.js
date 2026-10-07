/**
 * Pendiente (Módulo 01): verificar el JWT de la cookie de sesión y poblar `req.user`.
 * Mientras tanto deja pasar todas las peticiones; los controladores responden 501.
 */
export function authenticate(_req, _res, next) {
	next();
}
