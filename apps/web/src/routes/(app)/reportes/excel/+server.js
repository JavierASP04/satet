import { proxyDownload } from '#lib/server/download.js';

export const GET = ({ fetch, cookies, url }) =>
	proxyDownload(
		fetch,
		cookies,
		`/reports/export/excel${url.search}`,
		'conciliacion.xlsx',
		'No se pudo descargar la conciliación.'
	);
