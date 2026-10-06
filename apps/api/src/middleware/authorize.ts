import type { RequestHandler } from 'express';
import type { Permission } from '@satet/shared';

/**
 * Declara los permisos RBAC requeridos por una ruta.
 * Pendiente (Módulo 01): responder 403 si `req.user.role` no tiene alguno de `permissions`.
 */
export function authorize(...permissions: Permission[]): RequestHandler {
	void permissions;
	return (_req, _res, next) => {
		next();
	};
}
