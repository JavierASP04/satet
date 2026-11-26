import { error } from '@sveltejs/kit';
import { proxyPdf } from '#lib/server/pdf.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET = ({ params, fetch, cookies }) => {
	if (!UUID.test(params.uuid)) error(404, 'No se encontró el timbre.');
	return proxyPdf(
		fetch,
		cookies,
		`/stamps/${params.uuid}/pdf`,
		`timbre-${params.uuid}.pdf`,
		'No se pudo descargar el timbre.'
	);
};
