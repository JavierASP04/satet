export interface SatetModule {
	/** Número de módulo según la especificación técnica. */
	code: string;
	name: string;
	description: string;
}

export const MODULES = [
	{
		code: '01',
		name: 'Contribuyentes y autenticación',
		description: 'Autoregistro, expedientes, aprobación por Recaudación y RBAC.'
	},
	{
		code: '02',
		name: 'Impuesto minero',
		description: 'Declaración jurada mensual de extracción, procesamiento y subproductos.'
	},
	{
		code: '03',
		name: 'Impuesto 1 x 1000',
		description: 'Retenciones sobre órdenes de pago de entes públicos y bancos.'
	},
	{
		code: '04',
		name: 'Timbres fiscales y tasa BCV',
		description: 'Timbres electrónicos en PDF con QR firmado y tasa oficial EUR/VED.'
	},
	{
		code: '05',
		name: 'Pagos y conciliación',
		description: 'Registro de váuchers y validación por Tesorería.'
	},
	{
		code: '06',
		name: 'Verificación SAREN',
		description: 'Validación y consumo único de timbres por funcionarios del SAREN.'
	},
	{
		code: '07',
		name: 'Reportes, auditoría y POA',
		description: 'Dashboard POA, exportaciones y bitácora de auditoría.'
	}
] as const satisfies readonly SatetModule[];

export type ModuleCode = (typeof MODULES)[number]['code'];
