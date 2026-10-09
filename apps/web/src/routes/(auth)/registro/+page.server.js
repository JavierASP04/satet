import { fail, redirect } from '@sveltejs/kit';
import { apiFetch, readApiError, serviceMessage } from '#lib/server/api.js';

/** @param {FormData} data @param {string} name */
function text(data, name) {
	return String(data.get(name) ?? '').trim();
}

export const actions = {
	default: async ({ request, fetch }) => {
		const data = await request.formData();
		const values = {
			email: text(data, 'email'),
			docType: text(data, 'docType'),
			rifNumber: text(data, 'rifNumber'),
			companyName: text(data, 'companyName'),
			commercialDenomination: text(data, 'commercialDenomination'),
			fiscalAddress: text(data, 'fiscalAddress'),
			phoneNumber: text(data, 'phoneNumber'),
			legalRepresentativeName: text(data, 'legalRepresentativeName'),
			legalRepresentativeDna: text(data, 'legalRepresentativeDna')
		};
		const password = String(data.get('password') ?? '');

		let response;
		try {
			response = await apiFetch(fetch, '/auth/register', {
				method: 'POST',
				body: JSON.stringify({ ...values, password })
			});
		} catch {
			return fail(503, { values, message: 'No se pudo contactar la API.' });
		}

		if (!response.ok) {
			const fallback = 'No se pudo crear la cuenta.';
			return fail(response.status, {
				values,
				message:
					response.status >= 500 ? serviceMessage(response, fallback) : await readApiError(response, fallback)
			});
		}

		redirect(303, '/login?registrado=1');
	}
};
