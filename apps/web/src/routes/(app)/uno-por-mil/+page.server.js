import { fail } from '@sveltejs/kit';
import { apiFetch, readApiError } from '#lib/server/api.js';
import { text } from '#lib/server/payment.js';
import { sessionHeaders } from '#lib/server/session.js';

export const load = async ({ fetch, cookies }) => {
	const response = await apiFetch(fetch, '/one-per-thousand/list', {
		headers: sessionHeaders(cookies)
	});
	if (!response.ok) {
		const fallback = 'No se pudieron cargar las retenciones.';
		return {
			declarations: [],
			scope: 'own',
			error:
				response.status >= 500
					? 'No se pudo completar la operación. Revisa que la base de datos esté en marcha.'
					: await readApiError(response, fallback)
		};
	}
	const body = await response.json();
	return {
		declarations: body.declarations ?? [],
		scope: body.scope === 'all' ? 'all' : 'own',
		error: null
	};
};

export const actions = {
	resolve: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const filingId = text(data, 'filingId');
		const decision = text(data, 'decision');
		const response = await apiFetch(fetch, `/one-per-thousand/filings/${filingId}/resolve`, {
			method: 'POST',
			headers: sessionHeaders(cookies),
			body: JSON.stringify({ decision })
		});
		if (!response.ok) {
			return fail(response.status, {
				message: await readApiError(response, 'No se pudo resolver la carga.')
			});
		}
		return { ok: true, message: 'Carga aprobada. Ya se puede imprimir la planilla.' };
	}
};
