import { fail, redirect } from '@sveltejs/kit';
import { ROLES } from '@satet/shared';
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

export const load = async ({ fetch, cookies, parent, url, locals }) => {
	const aviso = url.searchParams.get('aviso');
	const avisoTone = url.searchParams.get('tono') === 'warn' ? 'warn' : 'danger';
	const { taxpayer } = await parent();
	const pendingPromise =
		locals.user?.role === ROLES.ADMIN_SISTEMA
			? apiFetch(fetch, '/royalties/pending', { headers: sessionHeaders(cookies) })
			: Promise.resolve(null);
	const [accounts, royaltiesResponse, pendingResponse] = await Promise.all([
		taxpayer?.isApproved ? loadAccounts(fetch, cookies) : Promise.resolve([]),
		apiFetch(fetch, '/royalties/my', { headers: sessionHeaders(cookies) }),
		pendingPromise
	]);
	if (!royaltiesResponse.ok) {
		return {
			accounts,
			royalties: [],
			aviso,
			avisoTone,
			error: await readApiError(royaltiesResponse, 'No se pudieron cargar las regalías.')
		};
	}
	const body = await royaltiesResponse.json();
	let pending = [];
	if (pendingResponse?.ok) {
		pending = (await pendingResponse.json()).royalties ?? [];
	}
	return { accounts, royalties: body.royalties ?? [], pending, error: null, aviso, avisoTone };
};

export const actions = {
	default: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const values = {
			periodYear: text(data, 'periodYear'),
			extractedSquareMeters: text(data, 'extractedSquareMeters')
		};
		const payload = {
			periodYear: Number(values.periodYear),
			extractedSquareMeters: Number(values.extractedSquareMeters)
		};

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
				tone: response.status === 409 ? 'warn' : 'danger',
				message:
					response.status >= 500
						? 'No se pudo completar la operación. Revisa que la base de datos esté en marcha.'
						: await readApiError(response, 'No se pudo registrar la regalía.')
			});
		}
		redirect(303, '/mineria/regalias');
	},

	instruct: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const id = text(data, 'id');
		const paymentForm = text(data, 'paymentForm');
		const response = await apiFetch(fetch, `/royalties/${id}/instruct`, {
			method: 'POST',
			headers: sessionHeaders(cookies),
			body: JSON.stringify({ paymentForm })
		});
		if (!response.ok) {
			return fail(response.status, {
				message: await readApiError(response, 'No se pudo indicar la forma de pago.')
			});
		}
		return { ok: true, message: 'Forma de pago indicada. El contribuyente ya puede pagar.' };
	},

	pay: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const id = text(data, 'id');
		const values = {
			bankReferenceNumber: text(data, 'bankReferenceNumber'),
			bankAccountId: text(data, 'bankAccountId')
		};
		const voucherRead = await readVoucherField(data);
		if (voucherRead.error) return fail(400, { values, message: voucherRead.error });
		const response = await apiFetch(fetch, `/royalties/${id}/pay`, {
			method: 'POST',
			headers: sessionHeaders(cookies),
			body: JSON.stringify({ ...values, voucher: voucherRead.voucher })
		});
		if (!response.ok) {
			return fail(response.status, {
				values,
				message: await readApiError(response, 'No se pudo registrar el pago.')
			});
		}
		return { ok: true, message: 'Pago registrado. Falta la verificación para imprimir la planilla.' };
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
				tone: response.status === 409 ? 'warn' : 'danger',
				message: await readApiError(response, 'No se pudo resolver la regalía.')
			});
		}
		return {
			ok: true,
			message: decision === 'APROBAR' ? 'Regalía aprobada.' : 'Regalía rechazada.'
		};
	}
};
