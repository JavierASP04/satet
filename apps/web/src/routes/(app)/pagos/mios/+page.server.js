import { apiFetch, readApiError } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

export const load = async ({ fetch, cookies, url }) => {
	try {
		const response = await apiFetch(fetch, '/payments/mine', {
			headers: sessionHeaders(cookies)
		});
		if (!response.ok) {
			return {
				payments: [],
				registered: false,
				error: await readApiError(response, 'No se pudieron cargar tus pagos.')
			};
		}
		const body = await response.json();
		return {
			payments: body.payments ?? [],
			registered: url.searchParams.get('registrado') === '1',
			error: null
		};
	} catch {
		return { payments: [], registered: false, error: 'No se pudo contactar la API.' };
	}
};
