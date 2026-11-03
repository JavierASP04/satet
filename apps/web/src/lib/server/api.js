import { API_URL } from '$app/env/private';
import { API_PREFIX } from '@satet/shared';

/** Cliente mínimo para llamar a la API desde load functions y actions del servidor. */
export function apiFetch(fetchFn, path, init) {
	return fetchFn(`${API_URL}${API_PREFIX}${path}`, {
		...init,
		credentials: 'omit',
		headers: { 'content-type': 'application/json', ...init?.headers }
	});
}

/** @param {unknown} details */
function firstFieldMessage(details) {
	const properties = details && typeof details === 'object' ? details.properties : null;
	if (!properties || typeof properties !== 'object') return null;
	for (const node of Object.values(properties)) {
		if (node && Array.isArray(node.errors) && node.errors.length > 0) return node.errors[0];
	}
	return null;
}

/** @param {Response} response @param {string} fallback */
export async function readApiError(response, fallback) {
	try {
		const body = await response.json();
		return firstFieldMessage(body?.error?.details) || body?.error?.message || fallback;
	} catch {
		return fallback;
	}
}

/** @param {Response} response @param {string} fallback */
export function serviceMessage(response, fallback) {
	if (response.status >= 500) {
		return 'El servicio de cuentas no está disponible. Revisa que la base de datos esté en marcha.';
	}
	return fallback;
}
