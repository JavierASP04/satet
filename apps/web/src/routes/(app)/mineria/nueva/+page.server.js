import { fail, redirect } from '@sveltejs/kit';
import { apiFetch, readApiError } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

/** @param {FormData} data @param {string} name */
function text(data, name) {
	return String(data.get(name) ?? '').trim();
}

export const actions = {
	default: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const values = {
			periodYear: text(data, 'periodYear'),
			periodMonth: text(data, 'periodMonth'),
			activityType: text(data, 'activityType'),
			materialType: text(data, 'materialType'),
			volumeCubicMeters: text(data, 'volumeCubicMeters'),
			commercialValuePerUnit: text(data, 'commercialValuePerUnit')
		};

		let response;
		try {
			response = await apiFetch(fetch, '/mining/declarations', {
				method: 'POST',
				headers: sessionHeaders(cookies),
				body: JSON.stringify({
					periodYear: Number(values.periodYear),
					periodMonth: Number(values.periodMonth),
					activityType: values.activityType,
					materialType: values.materialType,
					volumeCubicMeters: Number(values.volumeCubicMeters),
					commercialValuePerUnit: Number(values.commercialValuePerUnit)
				})
			});
		} catch {
			return fail(503, { values, message: 'No se pudo contactar la API.' });
		}

		if (!response.ok) {
			const fallback = 'No se pudo registrar la declaración.';
			return fail(response.status, {
				values,
				message:
					response.status >= 500
						? 'No se pudo completar la operación. Revisa que la base de datos esté en marcha.'
						: await readApiError(response, fallback)
			});
		}

		const body = await response.json();
		redirect(303, `/mineria/${body.declaration.id}`);
	}
};
