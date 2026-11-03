import { fail, redirect } from '@sveltejs/kit';
import { apiFetch, readApiError } from '#lib/server/api.js';
import { readVoucherField, text } from '#lib/server/payment.js';
import { sessionHeaders } from '#lib/server/session.js';

export const load = async ({ fetch, cookies, parent }) => {
	const { taxpayer } = await parent();
	if (!taxpayer?.isApproved) return { accounts: [] };
	const response = await apiFetch(fetch, '/bank-accounts?taxType=UN_POR_MIL', {
		headers: sessionHeaders(cookies)
	});
	if (!response.ok) return { accounts: [] };
	const body = await response.json();
	return { accounts: body.accounts ?? [] };
};

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
			executionDate: text(data, 'executionDate'),
			bankReferenceNumber: text(data, 'bankReferenceNumber'),
			bankAccountId: text(data, 'bankAccountId')
		};
		const voucherRead = await readVoucherField(data);
		if (voucherRead.error) {
			return fail(400, { mode: 'single', values, message: voucherRead.error });
		}

		let response;
		try {
			response = await apiFetch(fetch, '/one-per-thousand/single', {
				method: 'POST',
				headers: sessionHeaders(cookies),
				body: JSON.stringify({
					paymentOrderNumber: values.paymentOrderNumber,
					entityName: values.entityName,
					executedAmountVed: Number(values.executedAmountVed),
					executionDate: values.executionDate,
					bankReferenceNumber: values.bankReferenceNumber,
					bankAccountId: values.bankAccountId,
					voucher: voucherRead.voucher
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
		const values = {
			bankReferenceNumber: text(data, 'bankReferenceNumber'),
			bankAccountId: text(data, 'bankAccountId')
		};
		const voucherRead = await readVoucherField(data);

		if (filled.length === 0 || voucherRead.error) {
			return fail(400, {
				mode: 'batch',
				orders,
				values,
				message: voucherRead.error || 'Agrega al menos una orden.'
			});
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
					})),
					bankReferenceNumber: values.bankReferenceNumber,
					bankAccountId: values.bankAccountId,
					voucher: voucherRead.voucher
				})
			});
		} catch {
			return fail(503, {
				mode: 'batch',
				orders: filled,
				values,
				message: 'No se pudo contactar la API.'
			});
		}

		if (!response.ok) {
			return fail(response.status, {
				mode: 'batch',
				orders: filled,
				values,
				message: await failureMessage(response, 'No se pudo registrar la carga.')
			});
		}

		redirect(303, '/uno-por-mil');
	}
};
