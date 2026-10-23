import { fail, redirect } from '@sveltejs/kit';
import { apiFetch, readApiError } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

/** @param {FormData} data @param {string} name */
function text(data, name) {
	return String(data.get(name) ?? '').trim();
}

/** @param {Response} response @param {string} fallback */
async function failureMessage(response, fallback) {
	if (response.status >= 500) {
		return 'No se pudo completar la operación. Revisa que la base de datos esté en marcha.';
	}
	return readApiError(response, fallback);
}

export const actions = {
	single: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const values = {
			paymentOrderNumber: text(data, 'paymentOrderNumber'),
			entityName: text(data, 'entityName'),
			executedAmountVed: text(data, 'executedAmountVed'),
			executionDate: text(data, 'executionDate')
		};

		let response;
		try {
			response = await apiFetch(fetch, '/one-per-thousand/single', {
				method: 'POST',
				headers: sessionHeaders(cookies),
				body: JSON.stringify({
					...values,
					executedAmountVed: Number(values.executedAmountVed)
				})
			});
		} catch {
			return fail(503, { mode: 'single', values, message: 'No se pudo contactar la API.' });
		}

		if (!response.ok) {
			return fail(response.status, {
				mode: 'single',
				values,
				message: await failureMessage(response, 'No se pudo registrar la orden.')
			});
		}

		redirect(303, '/uno-por-mil');
	},

	batch: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const numbers = data.getAll('paymentOrderNumber').map((value) => String(value).trim());
		const entities = data.getAll('entityName').map((value) => String(value).trim());
		const amounts = data.getAll('executedAmountVed').map((value) => String(value).trim());
		const dates = data.getAll('executionDate').map((value) => String(value).trim());
		const orders = numbers.map((paymentOrderNumber, index) => ({
			paymentOrderNumber,
			entityName: entities[index] ?? '',
			executedAmountVed: amounts[index] ?? '',
			executionDate: dates[index] ?? ''
		}));
		const filled = orders.filter(
			(order) => order.paymentOrderNumber || order.entityName || order.executedAmountVed
		);

		if (filled.length === 0) {
			return fail(400, { mode: 'batch', orders, message: 'Agrega al menos una orden.' });
		}

		let response;
		try {
			response = await apiFetch(fetch, '/one-per-thousand/batch', {
				method: 'POST',
				headers: sessionHeaders(cookies),
				body: JSON.stringify({
					orders: filled.map((order) => ({
						paymentOrderNumber: order.paymentOrderNumber,
						entityName: order.entityName,
						executedAmountVed: Number(order.executedAmountVed),
						executionDate: order.executionDate
					}))
				})
			});
		} catch {
			return fail(503, { mode: 'batch', orders: filled, message: 'No se pudo contactar la API.' });
		}

		if (!response.ok) {
			return fail(response.status, {
				mode: 'batch',
				orders: filled,
				message: await failureMessage(response, 'No se pudo registrar la carga.')
			});
		}

		redirect(303, '/uno-por-mil');
	}
};
