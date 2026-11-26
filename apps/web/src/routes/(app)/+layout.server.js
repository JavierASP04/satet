import { redirect } from '@sveltejs/kit';
import { apiFetch } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

export const load = async ({ locals, fetch, cookies }) => {
	if (!locals.user) redirect(303, '/login');
	let alerts = [];
	try {
		const response = await apiFetch(fetch, '/taxpayers/alerts', {
			headers: sessionHeaders(cookies)
		});
		if (response.ok) alerts = (await response.json()).alerts ?? [];
	} catch {
		alerts = [];
	}
	return { user: locals.user, taxpayer: locals.taxpayer, alerts };
};
