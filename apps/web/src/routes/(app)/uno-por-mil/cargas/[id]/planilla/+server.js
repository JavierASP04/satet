import { proxyPdf } from '#lib/server/pdf.js';

export const GET = ({ params, fetch, cookies }) =>
	proxyPdf(fetch, cookies, `/one-per-thousand/filings/${params.id}/pdf`, 'uno-por-mil.pdf');
