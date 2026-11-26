import { ROLES } from './roles.js';

/** Acciones de la matriz RBAC (especificación, sección 4). */
export const PERMISSIONS = Object.freeze({
	PERFIL_GESTIONAR: 'perfil:gestionar',
	CONTRIBUYENTES_APROBAR: 'contribuyentes:aprobar',
	DECLARACIONES_CREAR: 'declaraciones:crear',
	/** No figura en la matriz; cubre los endpoints marcados "(Recaudación)" / "(Analista)". */
	DECLARACIONES_SUPERVISAR: 'declaraciones:supervisar',
	/** Aprobar o rechazar declaraciones, cargas y regalías. Solo el administrador. */
	DECLARACIONES_RESOLVER: 'declaraciones:resolver',
	/** Alta de cuentas institucionales. Solo el administrador. */
	CUENTAS_GESTIONAR: 'cuentas:gestionar',
	TIMBRES_COMPRAR: 'timbres:comprar',
	/** Aprobar o rechazar la solicitud de timbre. Recaudación y administrador. */
	TIMBRES_RESOLVER: 'timbres:resolver',
	PAGOS_REGISTRAR: 'pagos:registrar',
	PAGOS_CONCILIAR: 'pagos:conciliar',
	DASHBOARD_POA: 'dashboard:poa',
	AUDITORIA_CONSULTAR: 'auditoria:consultar',
	/** Alta de cuentas de personal. Solo el administrador del sistema. */
	USUARIOS_CREAR: 'usuarios:crear'
});

const P = PERMISSIONS;

export const ROLE_PERMISSIONS = Object.freeze({
	[ROLES.CONTRIBUYENTE]: Object.freeze([
		P.PERFIL_GESTIONAR,
		P.DECLARACIONES_CREAR,
		P.TIMBRES_COMPRAR,
		P.PAGOS_REGISTRAR
	]),
	[ROLES.PERSONA_NATURAL]: Object.freeze([
		P.PERFIL_GESTIONAR,
		P.TIMBRES_COMPRAR,
		P.PAGOS_REGISTRAR
	]),
	[ROLES.ANALISTA_RECAUDACION]: Object.freeze([
		P.PERFIL_GESTIONAR,
		P.PAGOS_CONCILIAR,
		P.CUENTAS_GESTIONAR,
		P.TIMBRES_RESOLVER,
		P.DASHBOARD_POA
	]),
	[ROLES.FISCALIZACION]: Object.freeze([
		P.PERFIL_GESTIONAR,
		P.CONTRIBUYENTES_APROBAR,
		P.DECLARACIONES_SUPERVISAR,
		P.DECLARACIONES_RESOLVER
	]),
	[ROLES.ADMIN_SISTEMA]: Object.freeze(Object.values(PERMISSIONS))
});

/**
 * Indica si el rol tiene el permiso según la matriz RBAC.
 * @param {string} role
 * @param {string} permission
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
	const granted = ROLE_PERMISSIONS[role];
	return Array.isArray(granted) && granted.includes(permission);
}
