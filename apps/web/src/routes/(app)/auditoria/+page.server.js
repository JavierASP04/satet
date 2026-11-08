import { apiFetch, readApiError } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

export const load = async ({ fetch, cookies, url }) => {
	const action = url.searchParams.get('action')?.trim() ?? '';
	const table = url.searchParams.get('table')?.trim() ?? '';
	const limitParam = Number(url.searchParams.get('limit'));
	const limit = Number.isInteger(limitParam) && limitParam >= 1 && limitParam <= 500 ? limitParam : 100;
	const params = new URLSearchParams({ limit: String(limit) });
	if (action) params.set('action', action);
	if (table) params.set('table', table);

	const filters = { action, table, limit };
	try {
		const response = await apiFetch(fetch, `/audit/logs?${params}`, {
			headers: sessionHeaders(cookies)
		});
		if (!response.ok) {
			return {
				logs: [],
				total: 0,
				...filters,
				error:
					response.status >= 500
						? 'No se pudo completar la operación. Revisa que la base de datos esté en marcha.'
						: await readApiError(response, 'No se pudo cargar la auditoría.')
			};
		}
		const body = await response.json();
		return {
			logs: body.logs ?? [],
			total: body.total ?? 0,
			...filters,
			error: null
		};
	} catch {
		return {
			logs: [],
			total: 0,
			...filters,
			error: 'No se pudo contactar la API.'
		};
	}
};
