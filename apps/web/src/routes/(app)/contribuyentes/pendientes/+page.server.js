import { fail } from '@sveltejs/kit';
import { apiFetch, readApiError } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

export const load = async ({ fetch, cookies }) => {
	const response = await apiFetch(fetch, '/taxpayers/pending', {
		headers: sessionHeaders(cookies)
	});
	if (!response.ok) {
		return {
			taxpayers: [],
			error: await readApiError(response, 'No se pudo cargar las solicitudes.')
		};
	}
	const body = await response.json();
	return { taxpayers: body.taxpayers ?? [], error: null };
};

export const actions = {
	approve: async ({ request, fetch, cookies }) => {
		const id = String((await request.formData()).get('id') ?? '');
		const response = await apiFetch(fetch, `/taxpayers/${id}/approve`, {
			method: 'PATCH',
			headers: sessionHeaders(cookies),
			body: JSON.stringify({ approved: true })
		});
		if (!response.ok) {
			return fail(response.status, {
				message: await readApiError(response, 'No se pudo aprobar el expediente.')
			});
		}
		return { ok: true, message: 'Expediente aprobado.' };
	}
};
