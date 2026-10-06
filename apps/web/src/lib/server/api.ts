import { API_URL } from '$app/env/private';
import { API_PREFIX } from '@satet/shared';

/** Cliente mínimo para llamar a la API desde load functions y actions del servidor. */
export function apiFetch(fetchFn: typeof fetch, path: string, init?: RequestInit) {
	return fetchFn(`${API_URL}${API_PREFIX}${path}`, {
		...init,
		headers: { 'content-type': 'application/json', ...init?.headers }
	});
}
