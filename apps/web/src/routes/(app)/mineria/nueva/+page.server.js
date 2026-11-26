import { fail, redirect } from '@sveltejs/kit';
import { apiFetch, readApiError } from '#lib/server/api.js';
import { readVoucherField, text } from '#lib/server/payment.js';
import { sessionHeaders } from '#lib/server/session.js';

export const load = async ({ fetch, cookies, parent }) => {
	const { taxpayer } = await parent();
	if (!taxpayer?.isApproved) return { accounts: [] };
	const response = await apiFetch(fetch, '/bank-accounts?taxType=MINERO', {
		headers: sessionHeaders(cookies)
	});
	if (!response.ok) return { accounts: [] };
	const body = await response.json();
	return { accounts: body.accounts ?? [] };
};

export const actions = {
	default: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const activities = data.getAll('activityType').map((value) => String(value));
		const materials = data.getAll('materialType').map((value) => String(value).trim());
		const volumes = data.getAll('volumeCubicMeters').map((value) => String(value).trim());
		const prices = data.getAll('commercialValuePerUnit').map((value) => String(value).trim());
		const lines = activities.map((activityType, index) => ({
			activityType,
			materialType: materials[index] ?? '',
			volumeCubicMeters: volumes[index] ?? '',
			commercialValuePerUnit: prices[index] ?? ''
		}));
		const values = {
			periodYear: text(data, 'periodYear'),
			periodMonth: text(data, 'periodMonth'),
			bankReferenceNumber: text(data, 'bankReferenceNumber'),
			bankAccountId: text(data, 'bankAccountId')
		};
		const filled = lines.filter(
			(line) => line.materialType || line.volumeCubicMeters || line.commercialValuePerUnit
		);
		const voucherRead = await readVoucherField(data);
		if (voucherRead.error || filled.length === 0) {
			return fail(400, {
				values,
				lines: filled.length > 0 ? filled : lines,
				message: voucherRead.error || 'Agrega al menos un material.'
			});
		}

		let response;
		try {
			response = await apiFetch(fetch, '/mining/declarations', {
				method: 'POST',
				headers: sessionHeaders(cookies),
				body: JSON.stringify({
					periodYear: Number(values.periodYear),
					periodMonth: Number(values.periodMonth),
					lines: filled.map((line) => ({
						activityType: line.activityType,
						materialType: line.materialType,
						volumeCubicMeters: Number(line.volumeCubicMeters),
						commercialValuePerUnit: Number(line.commercialValuePerUnit)
					})),
					bankReferenceNumber: values.bankReferenceNumber,
					bankAccountId: values.bankAccountId,
					voucher: voucherRead.voucher
				})
			});
		} catch {
			return fail(503, { values, lines: filled, message: 'No se pudo contactar la API.' });
		}

		if (!response.ok) {
			const fallback = 'No se pudo registrar la declaración.';
			return fail(response.status, {
				values,
				lines: filled,
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
