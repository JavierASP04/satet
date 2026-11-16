import { apiFetch, readApiError } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

export const load = async ({ fetch, cookies }) => {
	try {
		const response = await apiFetch(fetch, '/stamps/issued', {
			headers: sessionHeaders(cookies)
		});
		if (!response.ok) {
			return {
				stamps: [],
				error: await readApiError(response, 'No se pudo cargar los timbres emitidos.')
			};
		}
		const body = await response.json();
		return { stamps: body.stamps ?? [], error: null };
	} catch {
		return { stamps: [], error: 'No se pudo contactar la API.' };
	}
};
