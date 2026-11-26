import { apiFetch, readApiError } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

export const load = async ({ fetch, cookies, url }) => {
	const params = new URLSearchParams();
	for (const key of ['grain', 'from', 'to']) {
		const value = url.searchParams.get(key);
		if (value) params.set(key, value);
	}
	const query = params.toString();
	try {
		const response = await apiFetch(
			fetch,
			`/reports/revenue-summary${query ? `?${query}` : ''}`,
			{
			headers: sessionHeaders(cookies)
		});
		if (!response.ok) {
			return {
				summary: null,
				query: query ? `?${query}` : '',
				error:
					response.status >= 500
						? 'No se pudo completar la operación. Revisa que la base de datos esté en marcha.'
						: await readApiError(response, 'No se pudo cargar el reporte.')
			};
		}
		const summary = await response.json();
		return { summary, query: query ? `?${query}` : '', error: null };
	} catch {
		return { summary: null, query: '', error: 'No se pudo contactar la API.' };
	}
};
