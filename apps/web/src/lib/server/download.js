import { error } from '@sveltejs/kit';
import { apiFetch, readApiError } from './api.js';
import { sessionHeaders } from './session.js';

/**
 * Descarga un archivo de la API con el tipo que ella declara.
 * @param {typeof fetch} fetch
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @param {string} path
 * @param {string} fallbackName
 * @param {string} fallbackMessage
 * @param {{ inline?: boolean }} [options]
 */
export async function proxyDownload(fetch, cookies, path, fallbackName, fallbackMessage, options = {}) {
	const response = await apiFetch(fetch, path, { headers: sessionHeaders(cookies) });
	if (!response.ok) {
		error(response.status, await readApiError(response, fallbackMessage));
	}
	let disposition =
		response.headers.get('content-disposition') || `attachment; filename="${fallbackName}"`;
	if (options.inline) {
		disposition = disposition.replace(/^\s*attachment/i, 'inline');
	}
	const type = response.headers.get('content-type') || 'application/octet-stream';
	return new Response(await response.arrayBuffer(), {
		headers: {
			'content-type': type,
			'content-disposition': disposition,
			'cache-control': 'no-store'
		}
	});
}
