import { PERMISSIONS } from '@satet/shared';

const P = PERMISSIONS;

export const NAVIGATION = [
	{
		module: '07',
		label: 'Inicio',
		items: [{ label: 'Panel', href: '/panel' }]
	},
	{
		module: '01',
		label: 'Contribuyentes',
		items: [
			{ label: 'Mi perfil', href: '/perfil', permission: P.PERFIL_GESTIONAR },
			{
				label: 'Solicitudes pendientes',
				href: '/contribuyentes/pendientes',
				permission: P.CONTRIBUYENTES_APROBAR
			}
		]
	},
	{
		module: '02',
		label: 'Impuesto minero',
		items: [
			{ label: 'Mis declaraciones', href: '/mineria', permission: P.DECLARACIONES_CREAR },
			{ label: 'Nueva declaración', href: '/mineria/nueva', permission: P.DECLARACIONES_CREAR },
			{
				label: 'Extemporáneas',
				href: '/mineria/extemporaneas',
				permission: P.DECLARACIONES_SUPERVISAR
			}
		]
	},
	{
		module: '03',
		label: 'Impuesto 1 x 1000',
		items: [
			{ label: 'Retenciones', href: '/uno-por-mil' },
			{ label: 'Cargar órdenes', href: '/uno-por-mil/cargar', permission: P.DECLARACIONES_CREAR }
		]
	},
	{
		module: '04',
		label: 'Timbres fiscales',
		items: [
			{ label: 'Mis timbres', href: '/timbres', permission: P.TIMBRES_COMPRAR },
			{ label: 'Comprar timbre', href: '/timbres/comprar', permission: P.TIMBRES_COMPRAR }
		]
	},
	{
		module: '05',
		label: 'Pagos',
		items: [
			{ label: 'Registrar pago', href: '/pagos/registrar', permission: P.PAGOS_REGISTRAR },
			{ label: 'Conciliación', href: '/pagos/conciliacion', permission: P.PAGOS_CONCILIAR }
		]
	},
	{
		module: '06',
		label: 'SAREN',
		items: [
			{ label: 'Verificar timbre', href: '/saren/verificar', permission: P.TIMBRES_CONSUMIR },
			{ label: 'Historial', href: '/saren/historial', permission: P.TIMBRES_CONSUMIR }
		]
	},
	{
		module: '07',
		label: 'Gestión',
		items: [
			{ label: 'Dashboard POA', href: '/reportes', permission: P.DASHBOARD_POA },
			{ label: 'Auditoría', href: '/auditoria', permission: P.AUDITORIA_CONSULTAR }
		]
	}
];
