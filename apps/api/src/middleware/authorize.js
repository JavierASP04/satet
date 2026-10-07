/**
 * Declara los permisos RBAC requeridos por una ruta.
 * Pendiente (Módulo 01): responder 403 si `req.user.role` no tiene alguno de `permissions`.
 * @param {...string} permissions
 */
export function authorize(...permissions) {
	void permissions;
	return (_req, _res, next) => {
		next();
	};
}
