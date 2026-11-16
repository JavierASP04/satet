import { apiFetch, readApiError } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

export const load = async ({ fetch, cookies, url }) => {
	const officeName = url.searchParams.get('officeName')?.trim() ?? '';
	const verifierId = url.searchParams.get('verifierId')?.trim() ?? '';
	const limitParam = Number(url.searchParams.get('limit'));
	const limit = Number.isInteger(limitParam) && limitParam >= 1 && limitParam <= 500 ? limitParam : 100;
	const params = new URLSearchParams({ limit: String(limit) });
	if (officeName) params.set('officeName', officeName);
	if (verifierId) params.set('verifierId', verifierId);
	const headers = sessionHeaders(cookies);

	const [historyResult, verifiersResult] = await Promise.all([
		apiFetch(fetch, `/saren/history?${params}`, { headers }).then(
			async (response) => ({ response, error: null }),
			() => ({ response: null, error: 'No se pudo contactar la API.' })
		),
		apiFetch(fetch, '/saren/verifiers', { headers }).then(
			async (response) => ({ response, error: null }),
			() => ({ response: null, error: 'No se pudo contactar la API.' })
		)
	]);

	let verifications = [];
	let error = historyResult.error;
	if (historyResult.response && !historyResult.response.ok) {
		error = await readApiError(historyResult.response, 'No se pudo cargar el historial.');
	} else if (historyResult.response) {
		const body = await historyResult.response.json();
		verifications = body.verifications ?? [];
	}

	let verifiers = [];
	let verifiersError = verifiersResult.error;
	if (verifiersResult.response && !verifiersResult.response.ok) {
		verifiersError = await readApiError(verifiersResult.response, 'No se pudo cargar los verificadores.');
	} else if (verifiersResult.response) {
		const body = await verifiersResult.response.json();
		verifiers = body.verifiers ?? [];
	}

	return { verifications, verifiers, officeName, verifierId, limit, error, verifiersError };
};
