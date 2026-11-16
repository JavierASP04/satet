import { error } from '@sveltejs/kit';
import { DEFAULT_SESSION_COOKIE } from '@satet/shared';
import { apiFetch } from '#lib/server/api.js';
import { clearSessionCookie } from '#lib/server/session.js';

/** @param {typeof fetch} fetch @param {string} token */
function profile(fetch, token) {
	return apiFetch(fetch, '/taxpayers/profile', {
		headers: { cookie: `${DEFAULT_SESSION_COOKIE}=${token}` }
	});
}

export const handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.taxpayer = null;

	const token = event.cookies.get(DEFAULT_SESSION_COOKIE);
	if (!token) return resolve(event);

	let response;
	try {
		response = await profile(event.fetch, token);
	} catch {
		try {
			await new Promise((resolve) => setTimeout(resolve, 400));
			response = await profile(event.fetch, token);
		} catch {
			error(503, 'No se pudo contactar la API. Vuelve a intentar en un momento.');
		}
	}

	if (response.ok) {
		const body = await response.json();
		event.locals.user = body.user ?? null;
		event.locals.taxpayer = body.taxpayer ?? null;
	} else if (response.status === 401) {
		clearSessionCookie(event.cookies, event.url);
	}

	return resolve(event);
};
