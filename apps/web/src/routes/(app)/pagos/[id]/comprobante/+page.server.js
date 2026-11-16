import { apiFetch, readApiError } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const load = async ({ params, fetch, cookies }) => {
	if (!UUID.test(params.id)) {
		return { payment: null, error: 'No se encontró el pago.' };
	}
	const response = await apiFetch(fetch, `/payments/${params.id}`, {
		headers: sessionHeaders(cookies)
	});
	if (!response.ok) {
		const fallback = 'No se pudo cargar el comprobante.';
		return {
			payment: null,
			error:
				response.status >= 500
					? 'No se pudo completar la operación. Revisa que la base de datos esté en marcha.'
					: await readApiError(response, fallback)
		};
	}
	const body = await response.json();
	return { payment: body.payment ?? null, error: body.payment ? null : 'No se encontró el pago.' };
};
