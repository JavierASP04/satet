import { proxyPdf } from '#lib/server/pdf.js';

export const GET = ({ params, fetch, cookies }) =>
	proxyPdf(
		fetch,
		cookies,
		`/mining/declarations/${params.id}/pdf`,
		'mineria.pdf',
		'No se pudo generar la planilla.',
		`/mineria/${params.id}`
	);
