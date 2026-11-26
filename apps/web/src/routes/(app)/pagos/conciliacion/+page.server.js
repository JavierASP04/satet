import { fail } from '@sveltejs/kit';
import { TAX_TYPES } from '@satet/shared';
import { apiFetch, readApiError } from '#lib/server/api.js';
import { text } from '#lib/server/payment.js';
import { sessionHeaders } from '#lib/server/session.js';

const TAXES = new Set(Object.values(TAX_TYPES));

export const load = async ({ fetch, cookies, url }) => {
	const taxType = url.searchParams.get('taxType') ?? '';
	const query = TAXES.has(taxType) ? `?taxType=${taxType}` : '';
	try {
		const response = await apiFetch(fetch, `/payments/pending${query}`, {
			headers: sessionHeaders(cookies)
		});
		if (!response.ok) {
			return {
				payments: [],
				taxType: TAXES.has(taxType) ? taxType : '',
				error: await readApiError(response, 'No se pudieron cargar los pagos pendientes.')
			};
		}
		const body = await response.json();
		return {
			payments: body.payments ?? [],
			taxType: TAXES.has(taxType) ? taxType : '',
			error: null
		};
	} catch {
		return {
			payments: [],
			taxType: TAXES.has(taxType) ? taxType : '',
			error: 'No se pudo contactar la API.'
		};
	}
};

export const actions = {
	verify: async ({ request, fetch, cookies }) => {
		const id = text(await request.formData(), 'id');
		let response;
		try {
			response = await apiFetch(fetch, `/payments/${id}/verify`, {
				method: 'PATCH',
				headers: sessionHeaders(cookies),
				body: '{}'
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
						: await readApiError(response, 'No se pudo verificar el pago.')
			});
		}
		return {
			ok: true,
			message: 'Pago verificado. Si la planilla seguía pendiente, quedó aprobada.'
		};
	},
	reject: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const id = text(data, 'id');
		const rejectionReason = text(data, 'rejectionReason');
		if (!rejectionReason) return fail(400, { message: 'Indica el motivo del rechazo.' });

		let response;
		try {
			response = await apiFetch(fetch, `/payments/${id}/reject`, {
				method: 'PATCH',
				headers: sessionHeaders(cookies),
				body: JSON.stringify({ rejectionReason })
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
						: await readApiError(response, 'No se pudo rechazar el pago.')
			});
		}
		const body = await response.json();
		return {
			ok: true,
			message: 'Pago rechazado. El aviso queda en el registro del contribuyente.',
			notice: body.notice ?? body.payment?.notice ?? null
		};
	}
};
