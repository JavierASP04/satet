import { fail } from '@sveltejs/kit';
import { apiFetch, readApiError } from '#lib/server/api.js';
import { text } from '#lib/server/payment.js';
import { sessionHeaders } from '#lib/server/session.js';

export const load = async ({ params, fetch, cookies }) => {
	const response = await apiFetch(fetch, `/mining/declarations/${params.id}`, {
		headers: sessionHeaders(cookies)
	});
	if (!response.ok) {
		const fallback = 'No se pudo cargar la declaración.';
		return {
			declaration: null,
			error:
				response.status >= 500
					? 'No se pudo completar la operación. Revisa que la base de datos esté en marcha.'
					: await readApiError(response, fallback)
		};
	}
	const body = await response.json();
	return { declaration: body.declaration ?? null, error: null };
};

export const actions = {
	resolve: async ({ params, request, fetch, cookies }) => {
		const data = await request.formData();
		const decision = text(data, 'decision');
		const rejectionReason = text(data, 'rejectionReason');
		const response = await apiFetch(fetch, `/mining/declarations/${params.id}/resolve`, {
			method: 'POST',
			headers: sessionHeaders(cookies),
			body: JSON.stringify({
				decision,
				...(decision === 'RECHAZAR' ? { rejectionReason } : {})
			})
		});
		if (!response.ok) {
			return fail(response.status, {
				message: await readApiError(response, 'No se pudo resolver la declaración.')
			});
		}
		return {
			ok: true,
			message: decision === 'APROBAR' ? 'Declaración aprobada.' : 'Declaración rechazada.'
		};
	}
};
