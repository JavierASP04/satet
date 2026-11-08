import { fail, redirect } from '@sveltejs/kit';
import { apiFetch, readApiError, serviceMessage } from '#lib/server/api.js';
import { adoptSessionCookie } from '#lib/server/session.js';

export const load = ({ url }) => {
	return { registered: url.searchParams.get('registrado') === '1' };
};

export const actions = {
	default: async ({ request, cookies, fetch, url }) => {
		const data = await request.formData();
		const email = String(data.get('email') ?? '').trim();
		const password = String(data.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { email, message: 'Indica el correo y la contraseña.' });
		}

		let response;
		try {
			response = await apiFetch(fetch, '/auth/login', {
				method: 'POST',
				body: JSON.stringify({ email, password })
			});
		} catch {
			return fail(503, {
				email,
				message: 'No se pudo contactar la API.'
			});
		}

		if (!response.ok) {
			const fallback = 'No se pudo iniciar sesión.';
			return fail(response.status, {
				email,
				message:
					response.status >= 500 ? serviceMessage(response, fallback) : await readApiError(response, fallback)
			});
		}

		if (!adoptSessionCookie(cookies, response, url)) {
			return fail(502, { email, message: 'La API no entregó la sesión.' });
		}

		redirect(303, '/panel');
	}
};
