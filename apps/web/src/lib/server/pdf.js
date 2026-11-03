import { error } from '@sveltejs/kit';
import { apiFetch, readApiError } from './api.js';
import { sessionHeaders } from './session.js';

/**
 * Descarga un PDF de la API con la sesión del navegador.
 * @param {typeof fetch} fetch
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @param {string} path
 * @param {string} fallbackName
 */
export async function proxyPdf(fetch, cookies, path, fallbackName) {
	const response = await apiFetch(fetch, path, { headers: sessionHeaders(cookies) });
	if (!response.ok) {
		error(response.status, await readApiError(response, 'No se pudo generar la planilla.'));
	}
	const disposition =
		response.headers.get('content-disposition') || `attachment; filename="${fallbackName}"`;
	return new Response(await response.arrayBuffer(), {
		headers: {
			'content-type': 'application/pdf',
			'content-disposition': disposition
		}
	});
}
