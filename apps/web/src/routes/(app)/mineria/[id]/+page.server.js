import { apiFetch, readApiError } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

export const load = async ({ params, fetch, cookies }) => {
	const response = await apiFetch(fetch, `/mining/declarations/${params.id}`, {
		headers: sessionHeaders(cookies)
	});
	if (!response.ok) {
		const fallback = 'No se pudo cargar la declaración.';
		return {
			declaration: null,
			error:
				response.status >= 500
					? 'No se pudo completar la operación. Revisa que la base de datos esté en marcha.'
					: await readApiError(response, fallback)
		};
	}
	const body = await response.json();
	return { declaration: body.declaration ?? null, error: null };
};
