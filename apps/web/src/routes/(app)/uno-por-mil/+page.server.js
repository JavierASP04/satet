import { fail } from '@sveltejs/kit';
import { apiFetch, readApiError } from '#lib/server/api.js';
import { text } from '#lib/server/payment.js';
import { sessionHeaders } from '#lib/server/session.js';

export const load = async ({ fetch, cookies, url }) => {
	const aviso = url.searchParams.get('aviso');
	const avisoTone = url.searchParams.get('tono') === 'warn' ? 'warn' : 'danger';
	const response = await apiFetch(fetch, '/one-per-thousand/list', {
		headers: sessionHeaders(cookies)
	});
	if (!response.ok) {
		const fallback = 'No se pudieron cargar las retenciones.';
		return {
			declarations: [],
			scope: 'own',
			aviso,
			avisoTone,
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
		error: null,
		aviso,
		avisoTone
	};
};

export const actions = {
	resolve: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const filingId = text(data, 'filingId');
		const decision = text(data, 'decision');
		const rejectionReason = text(data, 'rejectionReason');
		if (decision !== 'APROBAR' && decision !== 'RECHAZAR') {
			return fail(400, { message: 'La decisión no es válida.' });
		}
		if (decision === 'RECHAZAR' && !rejectionReason) {
			return fail(400, { message: 'Indica el motivo del rechazo.' });
		}
		if (rejectionReason.length > 500) {
			return fail(400, { message: 'El motivo del rechazo es demasiado largo.' });
		}

		let response;
		try {
			response = await apiFetch(fetch, `/one-per-thousand/filings/${filingId}/resolve`, {
				method: 'POST',
				headers: sessionHeaders(cookies),
				body: JSON.stringify({
					decision,
					...(decision === 'RECHAZAR' ? { rejectionReason } : {})
				})
			});
		} catch {
			return fail(503, { message: 'No se pudo contactar la API.' });
		}
		if (!response.ok) {
			return fail(response.status, {
				tone: response.status === 409 ? 'warn' : 'danger',
				message:
					response.status >= 500
						? 'No se pudo completar la operación. Revisa que la base de datos esté en marcha.'
						: await readApiError(response, 'No se pudo resolver la carga.')
			});
		}
		return {
			ok: true,
			message:
				decision === 'RECHAZAR'
					? 'Carga rechazada. La planilla no se imprime.'
					: 'Carga aprobada. Ya se puede imprimir la planilla.'
		};
	}
};
