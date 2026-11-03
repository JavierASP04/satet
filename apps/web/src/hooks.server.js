import { DEFAULT_SESSION_COOKIE } from '@satet/shared';
import { apiFetch } from '#lib/server/api.js';
import { clearSessionCookie } from '#lib/server/session.js';

export const handle = async ({ event, resolve }) => {
	event.locals.user = null;
	event.locals.taxpayer = null;

	const token = event.cookies.get(DEFAULT_SESSION_COOKIE);
	if (!token) return resolve(event);

	try {
		const response = await apiFetch(event.fetch, '/taxpayers/profile', {
			headers: { cookie: `${DEFAULT_SESSION_COOKIE}=${token}` }
		});
		if (response.ok) {
			const body = await response.json();
			event.locals.user = body.user ?? null;
			event.locals.taxpayer = body.taxpayer ?? null;
		} else if (response.status === 401) {
			clearSessionCookie(event.cookies, event.url);
		}
	} catch {
		event.locals.user = null;
	}

	return resolve(event);
};
