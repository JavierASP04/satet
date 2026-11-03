import { fail } from '@sveltejs/kit';
import { apiFetch, readApiError } from '#lib/server/api.js';
import { text } from '#lib/server/payment.js';
import { sessionHeaders } from '#lib/server/session.js';

async function readList(fetch, cookies, path, key) {
	const response = await apiFetch(fetch, path, { headers: sessionHeaders(cookies) });
	if (!response.ok) {
		return { rows: [], error: await readApiError(response, 'No se pudo cargar la bandeja.') };
	}
	const body = await response.json();
	return { rows: body[key] ?? [], error: null };
}

export const load = async ({ fetch, cookies }) => {
	const [mining, royalties] = await Promise.all([
		readList(fetch, cookies, '/mining/declarations/pending', 'declarations'),
		readList(fetch, cookies, '/royalties/pending', 'royalties')
	]);
	return {
		declarations: mining.rows,
		royalties: royalties.rows,
		error: mining.error || royalties.error
	};
};

export const actions = {
	resolveRoyalty: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const id = text(data, 'id');
		const decision = text(data, 'decision');
		const rejectionReason = text(data, 'rejectionReason');
		const response = await apiFetch(fetch, `/royalties/${id}/resolve`, {
			method: 'POST',
			headers: sessionHeaders(cookies),
			body: JSON.stringify({
				decision,
				...(decision === 'RECHAZAR' ? { rejectionReason } : {})
			})
		});
		if (!response.ok) {
			return fail(response.status, {
				message: await readApiError(response, 'No se pudo resolver la regalía.')
			});
		}
		return {
			ok: true,
			message: decision === 'APROBAR' ? 'Regalía aprobada.' : 'Regalía rechazada.'
		};
	}
};
