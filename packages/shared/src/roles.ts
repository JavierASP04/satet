/** Espejo del enum `user_role` de `database/schema.sql`. */
export const ROLES = {
	CONTRIBUYENTE: 'CONTRIBUYENTE',
	ANALISTA_RECAUDACION: 'ANALISTA_RECAUDACION',
	ANALISTA_TESORERIA: 'ANALISTA_TESORERIA',
	VERIFICADOR_SAREN: 'VERIFICADOR_SAREN',
	ADMIN_SISTEMA: 'ADMIN_SISTEMA'
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
	CONTRIBUYENTE: 'Contribuyente',
	ANALISTA_RECAUDACION: 'Analista de Recaudación',
	ANALISTA_TESORERIA: 'Analista de Tesorería',
	VERIFICADOR_SAREN: 'Verificador SAREN',
	ADMIN_SISTEMA: 'Administrador del Sistema'
};
