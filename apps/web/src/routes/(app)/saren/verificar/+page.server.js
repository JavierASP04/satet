import { fail } from '@sveltejs/kit';
import { apiFetch, readApiError } from '#lib/server/api.js';
import { text } from '#lib/server/payment.js';
import { sessionHeaders } from '#lib/server/session.js';

export const actions = {
	default: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const officeName = text(data, 'officeName');
		const uuid = text(data, 'uuid');
		const qrPayload = text(data, 'qrPayload');
		const values = { officeName, uuid };

		if (officeName.length < 2) {
			return fail(400, { values, message: 'Indica la oficina del SAREN.' });
		}
		if (!uuid && !qrPayload) {
			return fail(400, { values, message: 'Indica el serial del timbre o escanea el código QR.' });
		}

		/** @type {Record<string, string>} */
		const body = { officeName };
		if (uuid) body.uuid = uuid;
		if (qrPayload) body.qrPayload = qrPayload;

		let response;
		try {
			response = await apiFetch(fetch, '/saren/verify-stamp', {
				method: 'POST',
				headers: sessionHeaders(cookies),
				body: JSON.stringify(body)
			});
		} catch {
			return fail(503, { values, message: 'No se pudo contactar la API.' });
		}

		if (!response.ok) {
			return fail(response.status, {
				values,
				message:
					response.status >= 500
						? 'No se pudo completar la operación. Revisa que la base de datos esté en marcha.'
						: await readApiError(response, 'No se pudo verificar el timbre.')
			});
		}

		const result = await response.json();
		return {
			values,
			ok: result.success === true,
			code: result.code ?? '',
			message: result.message ?? '',
			stamp: result.data ?? null
		};
	}
};
