import { apiFetch, readApiError } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

export const load = async ({ fetch, cookies }) => {
	try {
		const response = await apiFetch(fetch, '/reports/revenue-summary', {
			headers: sessionHeaders(cookies)
		});
		if (!response.ok) {
			return {
				summary: null,
				error:
					response.status >= 500
						? 'No se pudo completar la operación. Revisa que la base de datos esté en marcha.'
						: await readApiError(response, 'No se pudo cargar el reporte.')
			};
		}
		const summary = await response.json();
		return { summary, error: null };
	} catch {
		return { summary: null, error: 'No se pudo contactar la API.' };
	}
};
