import { apiFetch, readApiError } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

export const load = async ({ fetch, cookies, url }) => {
	const officeName = url.searchParams.get('officeName')?.trim() ?? '';
	const limitParam = Number(url.searchParams.get('limit'));
	const limit = Number.isInteger(limitParam) && limitParam >= 1 && limitParam <= 500 ? limitParam : 100;
	const params = new URLSearchParams({ limit: String(limit) });
	if (officeName) params.set('officeName', officeName);

	try {
		const response = await apiFetch(fetch, `/saren/history?${params}`, {
			headers: sessionHeaders(cookies)
		});
		if (!response.ok) {
			return {
				verifications: [],
				officeName,
				limit,
				error: await readApiError(response, 'No se pudo cargar el historial.')
			};
		}
		const body = await response.json();
		return {
			verifications: body.verifications ?? [],
			officeName,
			limit,
			error: null
		};
	} catch {
		return {
			verifications: [],
			officeName,
			limit,
			error: 'No se pudo contactar la API.'
		};
	}
};
