import { proxyDownload } from '#lib/server/download.js';

export const GET = ({ fetch, cookies }) =>
	proxyDownload(
		fetch,
		cookies,
		'/reports/export/excel',
		'conciliacion.xlsx',
		'No se pudo descargar la conciliación.'
	);
