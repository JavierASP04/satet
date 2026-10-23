import { apiFetch, readApiError } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

/** @param {typeof fetch} fetch @param {import('@sveltejs/kit').Cookies} cookies */
export async function loadCurrentRate(fetch, cookies) {
	const response = await apiFetch(fetch, '/bcv-rate/current', {
		headers: sessionHeaders(cookies)
	});
	if (response.status === 404) return { rate: null, error: null };
	if (!response.ok) {
		const fallback = 'No se pudo consultar la tasa BCV.';
		return {
			rate: null,
			error:
				response.status >= 500
					? 'No se pudo completar la operación. Revisa que la base de datos esté en marcha.'
					: await readApiError(response, fallback)
		};
	}
	const body = await response.json();
	return { rate: body.rate ?? null, error: null };
}
