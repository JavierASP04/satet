import { fail } from '@sveltejs/kit';
import { apiFetch, readApiError } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

export const load = async ({ fetch, cookies }) => {
	const response = await apiFetch(fetch, '/stamps/pending', {
		headers: sessionHeaders(cookies)
	});
	if (!response.ok) {
		return {
			stamps: [],
			error: await readApiError(response, 'No se pudieron cargar las solicitudes.')
		};
	}
	const body = await response.json();
	return { stamps: body.stamps ?? [], error: null };
};

export const actions = {
	default: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const uuid = String(data.get('uuid') ?? '');
		const decision = String(data.get('decision') ?? '');
		const rejectionReason = String(data.get('rejectionReason') ?? '').trim();
		const response = await apiFetch(fetch, `/stamps/${uuid}/resolve`, {
			method: 'POST',
			headers: sessionHeaders(cookies),
			body: JSON.stringify({
				decision,
				...(decision === 'RECHAZAR' ? { rejectionReason } : {})
			})
		});
		if (!response.ok) {
			return fail(response.status, {
				message: await readApiError(response, 'No se pudo resolver la solicitud.')
			});
		}
		return {
			ok: true,
			message: decision === 'APROBAR' ? 'Timbre aprobado.' : 'Solicitud rechazada.'
		};
	}
};
