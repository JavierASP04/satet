import { error } from '@sveltejs/kit';
import { proxyDownload } from '#lib/server/download.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET = ({ params, fetch, cookies }) => {
	if (!UUID.test(params.id)) error(404, 'No se encontró el pago.');
	return proxyDownload(
		fetch,
		cookies,
		`/payments/${params.id}/voucher`,
		'comprobante',
		'No se pudo descargar el comprobante.',
		{ inline: true }
	);
};
