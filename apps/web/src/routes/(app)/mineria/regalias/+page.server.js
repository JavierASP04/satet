import { fail, redirect } from '@sveltejs/kit';
import { apiFetch, readApiError } from '#lib/server/api.js';
import { readVoucherField, text } from '#lib/server/payment.js';
import { sessionHeaders } from '#lib/server/session.js';

async function loadAccounts(fetch, cookies) {
	const response = await apiFetch(fetch, '/bank-accounts?taxType=MINERO', {
		headers: sessionHeaders(cookies)
	});
	if (!response.ok) return [];
	const body = await response.json();
	return body.accounts ?? [];
}

export const load = async ({ fetch, cookies, parent }) => {
	const { taxpayer } = await parent();
	const [accounts, royaltiesResponse] = await Promise.all([
		taxpayer?.isApproved ? loadAccounts(fetch, cookies) : Promise.resolve([]),
		apiFetch(fetch, '/royalties/my', { headers: sessionHeaders(cookies) })
	]);
	if (!royaltiesResponse.ok) {
		return {
			accounts,
			royalties: [],
			error: await readApiError(royaltiesResponse, 'No se pudieron cargar las regalías.')
		};
	}
	const body = await royaltiesResponse.json();
	return { accounts, royalties: body.royalties ?? [], error: null };
};

export const actions = {
	default: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const values = {
			periodYear: text(data, 'periodYear'),
			commercialValuePerUnit: text(data, 'commercialValuePerUnit'),
			paymentForm: text(data, 'paymentForm'),
			bankReferenceNumber: text(data, 'bankReferenceNumber'),
			bankAccountId: text(data, 'bankAccountId')
		};
		const inKind = values.paymentForm === 'ESPECIE';
		const voucherRead = inKind ? { voucher: null } : await readVoucherField(data);
		if (!inKind && voucherRead.error) {
			return fail(400, { values, message: voucherRead.error });
		}

		/** @type {Record<string, unknown>} */
		const payload = {
			periodYear: Number(values.periodYear),
			commercialValuePerUnit: Number(values.commercialValuePerUnit),
			paymentForm: values.paymentForm
		};
		if (!inKind) {
			payload.bankReferenceNumber = values.bankReferenceNumber;
			payload.bankAccountId = values.bankAccountId;
			payload.voucher = voucherRead.voucher;
		}

		let response;
		try {
			response = await apiFetch(fetch, '/royalties', {
				method: 'POST',
				headers: sessionHeaders(cookies),
				body: JSON.stringify(payload)
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
						: await readApiError(response, 'No se pudo registrar la regalía.')
			});
		}
		redirect(303, '/mineria/regalias');
	},

	resolve: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const id = text(data, 'id');
		const decision = text(data, 'decision');
		const rejectionReason = text(data, 'rejectionReason');
		const response = await apiFetch(fetch, `/royalties/${id}/resolve`, {
			method: 'POST',
			headers: sessionHeaders(cookies),
			body: JSON.stringify({
				decision,
				...(decision === 'RECHAZAR' ? { rejectionReason } : {})
			})
		});
		if (!response.ok) {
			return fail(response.status, {
				message: await readApiError(response, 'No se pudo resolver la regalía.')
			});
		}
		return {
			ok: true,
			message: decision === 'APROBAR' ? 'Regalía aprobada.' : 'Regalía rechazada.'
		};
	}
};
