import { error, redirect } from '@sveltejs/kit';
import { apiFetch, readApiError } from './api.js';
import { sessionHeaders } from './session.js';

/**
 * Descarga un PDF de la API con la sesión del navegador.
 * Si `backTo` está definido y el PDF no sale, vuelve a esa pantalla con el aviso.
 * @param {typeof fetch} fetch
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @param {string} path
 * @param {string} fallbackName
 * @param {string} [fallbackMessage]
 * @param {string} [backTo]
 */
export async function proxyPdf(
	fetch,
	cookies,
	path,
	fallbackName,
	fallbackMessage = 'No se pudo generar la planilla.',
	backTo
) {
	const response = await apiFetch(fetch, path, { headers: sessionHeaders(cookies) });
	if (!response.ok) {
		const message =
			response.status >= 500
				? 'No se pudo generar la planilla.'
				: await readApiError(response, fallbackMessage);
		if (backTo) {
			const target = new URL(backTo, 'http://satet.local');
			target.searchParams.set('aviso', message);
			if (response.status === 409) target.searchParams.set('tono', 'warn');
			redirect(303, `${target.pathname}${target.search}`);
		}
		error(response.status, message);
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
