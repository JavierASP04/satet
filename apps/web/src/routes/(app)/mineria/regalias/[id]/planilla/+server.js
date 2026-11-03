import { proxyPdf } from '#lib/server/pdf.js';

export const GET = ({ params, fetch, cookies }) =>
	proxyPdf(fetch, cookies, `/royalties/${params.id}/pdf`, 'regalias.pdf');
