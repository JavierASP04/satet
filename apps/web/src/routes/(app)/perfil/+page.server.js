import { fail } from '@sveltejs/kit';
import { apiFetch, readApiError, serviceMessage } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

/** @param {FormData} data @param {string} name */
function text(data, name) {
	return String(data.get(name) ?? '').trim();
}

export const actions = {
	default: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const values = {
			docType: text(data, 'docType'),
			rifNumber: text(data, 'rifNumber'),
			companyName: text(data, 'companyName'),
			commercialDenomination: text(data, 'commercialDenomination'),
			fiscalAddress: text(data, 'fiscalAddress'),
			phoneNumber: text(data, 'phoneNumber'),
			legalRepresentativeName: text(data, 'legalRepresentativeName'),
			legalRepresentativeDna: text(data, 'legalRepresentativeDna')
		};

		let response;
		try {
			response = await apiFetch(fetch, '/taxpayers/profile', {
				method: 'PUT',
				headers: sessionHeaders(cookies),
				body: JSON.stringify({
					...values,
					commercialDenomination: values.commercialDenomination || null
				})
			});
		} catch {
			return fail(503, { values, message: 'No se pudo contactar la API.' });
		}

		if (!response.ok) {
			const fallback = 'No se pudo guardar el expediente.';
			return fail(response.status, {
				values,
				message:
					response.status >= 500 ? serviceMessage(response, fallback) : await readApiError(response, fallback)
			});
		}

		return { ok: true, message: 'Expediente actualizado.' };
	}
};
