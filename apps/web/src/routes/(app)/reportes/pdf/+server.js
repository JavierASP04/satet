import { proxyDownload } from '#lib/server/download.js';

export const GET = ({ fetch, cookies }) =>
	proxyDownload(
		fetch,
		cookies,
		'/reports/export/pdf',
		'informe-gestion.pdf',
		'No se pudo descargar el informe.'
	);
