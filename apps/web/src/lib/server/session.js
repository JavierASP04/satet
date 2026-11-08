import { DEFAULT_SESSION_COOKIE } from '@satet/shared';

/** @param {URL} url @param {number} [maxAge] */
export function sessionCookieOptions(url, maxAge = 60 * 60 * 8) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		maxAge
	};
}

/** @param {import('@sveltejs/kit').Cookies} cookies */
export function sessionHeaders(cookies) {
	const token = cookies.get(DEFAULT_SESSION_COOKIE);
	if (!token) return {};
	return { cookie: `${DEFAULT_SESSION_COOKIE}=${token}` };
}

/**
 * Copia al navegador la cookie httpOnly que emitió la API.
 * @param {import('@sveltejs/kit').Cookies} cookies
 * @param {Response} response
 * @param {URL} url
 */
export function adoptSessionCookie(cookies, response, url) {
	const lines = response.headers.getSetCookie?.() ?? [];
	for (const line of lines) {
		const [pair, ...attrs] = line.split(';');
		const eq = pair.indexOf('=');
		if (eq === -1) continue;
		if (pair.slice(0, eq).trim() !== DEFAULT_SESSION_COOKIE) continue;

		const value = decodeURIComponent(pair.slice(eq + 1).trim());
		let maxAge = 60 * 60 * 8;
		for (const attr of attrs) {
			const [rawKey, rawValue] = attr.split('=');
			if (rawKey.trim().toLowerCase() === 'max-age' && rawValue) {
				const parsed = Number(rawValue);
				if (Number.isFinite(parsed)) maxAge = parsed;
			}
		}
		cookies.set(DEFAULT_SESSION_COOKIE, value, sessionCookieOptions(url, maxAge));
		return true;
	}
	return false;
}

/** @param {import('@sveltejs/kit').Cookies} cookies @param {URL} url */
export function clearSessionCookie(cookies, url) {
	cookies.delete(DEFAULT_SESSION_COOKIE, {
		path: '/',
		secure: url.protocol === 'https:'
	});
}
