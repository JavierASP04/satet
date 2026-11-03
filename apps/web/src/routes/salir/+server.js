import { redirect } from '@sveltejs/kit';
import { apiFetch } from '#lib/server/api.js';
import { clearSessionCookie, sessionHeaders } from '#lib/server/session.js';

export const POST = async ({ cookies, fetch, url }) => {
	const headers = sessionHeaders(cookies);
	if (headers.cookie) {
		await apiFetch(fetch, '/auth/logout', { method: 'POST', headers, body: '{}' }).catch(() => {});
	}
	clearSessionCookie(cookies, url);
	redirect(303, '/login');
};
