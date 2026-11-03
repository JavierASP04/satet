import { fail } from '@sveltejs/kit';
import { apiFetch, readApiError } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

export const load = async ({ fetch, cookies }) => {
	const response = await apiFetch(fetch, '/users/verificadores', {
		headers: sessionHeaders(cookies)
	});
	if (!response.ok) {
		return {
			users: [],
			error: await readApiError(response, 'No se pudieron cargar los verificadores.')
		};
	}
	const body = await response.json();
	return { users: body.users ?? [], error: null };
};

export const actions = {
	default: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');
		const response = await apiFetch(fetch, '/users/verificadores', {
			method: 'POST',
			headers: sessionHeaders(cookies),
			body: JSON.stringify({ email, password })
		});
		if (!response.ok) {
			return fail(response.status, {
				email,
				message: await readApiError(response, 'No se pudo crear la cuenta.')
			});
		}
		const body = await response.json();
		return { ok: true, message: `Cuenta creada para ${body.user?.email ?? email}.` };
	}
};
