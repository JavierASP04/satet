import { proxyDownload } from '#lib/server/download.js';

export const GET = ({ fetch, cookies, url }) =>
	proxyDownload(
		fetch,
		cookies,
		`/reports/export/pdf${url.search}`,
		'informe-gestion.pdf',
		'No se pudo descargar el informe.'
	);
