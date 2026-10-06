import { ROLES, type Role } from './roles.ts';

/** Acciones de la matriz RBAC (especificación, sección 4). */
export const PERMISSIONS = {
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
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const P = PERMISSIONS;

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
	[ROLES.CONTRIBUYENTE]: [
		P.PERFIL_GESTIONAR,
		P.DECLARACIONES_CREAR,
		P.TIMBRES_COMPRAR,
		P.PAGOS_REGISTRAR
	],
	[ROLES.ANALISTA_RECAUDACION]: [
		P.PERFIL_GESTIONAR,
		P.CONTRIBUYENTES_APROBAR,
		P.DECLARACIONES_SUPERVISAR,
		P.DASHBOARD_POA
	],
	[ROLES.ANALISTA_TESORERIA]: [P.PERFIL_GESTIONAR, P.PAGOS_CONCILIAR, P.DASHBOARD_POA],
	[ROLES.VERIFICADOR_SAREN]: [P.PERFIL_GESTIONAR, P.TIMBRES_CONSUMIR],
	[ROLES.ADMIN_SISTEMA]: Object.values(PERMISSIONS)
};

export function hasPermission(role: Role, permission: Permission): boolean {
	return ROLE_PERMISSIONS[role].includes(permission);
}
