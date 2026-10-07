import { ROLES } from './roles.js';

/** Acciones de la matriz RBAC (especificación, sección 4). */
export const PERMISSIONS = Object.freeze({
	PERFIL_GESTIONAR: 'perfil:gestionar',
	CONTRIBUYENTES_APROBAR: 'contribuyentes:aprobar',
	DECLARACIONES_CREAR: 'declaraciones:crear',
	/** No figura en la matriz; cubre los endpoints marcados "(Recaudación)" / "(Analista)". */
	DECLARACIONES_SUPERVISAR: 'declaraciones:supervisar',
	TIMBRES_COMPRAR: 'timbres:comprar',
	PAGOS_REGISTRAR: 'pagos:registrar',
	PAGOS_CONCILIAR: 'pagos:conciliar',
	TIMBRES_CONSUMIR: 'timbres:consumir',
	DASHBOARD_POA: 'dashboard:poa',
	AUDITORIA_CONSULTAR: 'auditoria:consultar'
});

const P = PERMISSIONS;

export const ROLE_PERMISSIONS = Object.freeze({
	[ROLES.CONTRIBUYENTE]: Object.freeze([
		P.PERFIL_GESTIONAR,
		P.DECLARACIONES_CREAR,
		P.TIMBRES_COMPRAR,
		P.PAGOS_REGISTRAR
	]),
	[ROLES.ANALISTA_RECAUDACION]: Object.freeze([
		P.PERFIL_GESTIONAR,
		P.CONTRIBUYENTES_APROBAR,
		P.DECLARACIONES_SUPERVISAR,
		P.DASHBOARD_POA
	]),
	[ROLES.ANALISTA_TESORERIA]: Object.freeze([P.PERFIL_GESTIONAR, P.PAGOS_CONCILIAR, P.DASHBOARD_POA]),
	[ROLES.VERIFICADOR_SAREN]: Object.freeze([P.PERFIL_GESTIONAR, P.TIMBRES_CONSUMIR]),
	[ROLES.ADMIN_SISTEMA]: Object.freeze(Object.values(PERMISSIONS))
});

/**
 * Indica si el rol tiene el permiso según la matriz RBAC.
 * @param {string} role
 * @param {string} permission
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
	return ROLE_PERMISSIONS[role].includes(permission);
}
