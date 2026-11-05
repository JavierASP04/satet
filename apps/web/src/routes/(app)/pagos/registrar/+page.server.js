import { fail, redirect } from '@sveltejs/kit';
import { PAYMENT_STATUS, PAYMENT_SUBJECTS, ROYALTY_PAYMENT_FORMS, TAX_TYPES } from '@satet/shared';
import { periodLabel } from '#lib/mining.js';
import { formatVedText } from '#lib/payments.js';
import { apiFetch, readApiError } from '#lib/server/api.js';
import { readIssuedStamps } from '#lib/server/issued-stamps.js';
import { readVoucherField, text } from '#lib/server/payment.js';
import { sessionHeaders } from '#lib/server/session.js';

const SUBJECTS = new Set(Object.values(PAYMENT_SUBJECTS));

/** @param {typeof fetch} fetch @param {import('@sveltejs/kit').Cookies} cookies @param {string} path */
async function readJson(fetch, cookies, path) {
	try {
		const response = await apiFetch(fetch, path, { headers: sessionHeaders(cookies) });
		if (!response.ok) return { body: null, error: await readApiError(response, 'No se pudo cargar.') };
		return { body: await response.json(), error: null };
	} catch {
		return { body: null, error: 'No se pudo contactar la API.' };
	}
}

/** @param {unknown} value */
function moneyText(value) {
	const amount = Number(value);
	if (!Number.isFinite(amount) || amount <= 0) return null;
	return amount.toFixed(2);
}

/**
 * @param {string} kind
 * @param {string} id
 * @param {string} taxType
 * @param {string} amount
 * @param {string} label
 */
function obligation(kind, id, taxType, amount, label) {
	return { key: `${kind}:${id}`, kind, id, taxType, amount, label };
}

export const load = async ({ fetch, cookies, url, parent }) => {
	const { taxpayer } = await parent();
	const [accountsResult, miningResult, filingsResult, royaltiesResult, paymentsResult] =
		await Promise.all([
			readJson(fetch, cookies, '/bank-accounts'),
			readJson(fetch, cookies, '/mining/declarations/my'),
			readJson(fetch, cookies, '/one-per-thousand/list'),
			readJson(fetch, cookies, '/royalties/my'),
			readJson(fetch, cookies, '/payments/mine')
		]);

	const payments = paymentsResult.body?.payments ?? [];
	const taken = new Set(
		payments
			.filter(
				(payment) =>
					payment.relatedKind &&
					payment.relatedId &&
					payment.status !== PAYMENT_STATUS.RECHAZADO
			)
			.map((payment) => `${payment.relatedKind}:${payment.relatedId}`)
	);

	/** @type {ReturnType<typeof obligation>[]} */
	const obligations = [];

	for (const row of miningResult.body?.declarations ?? []) {
		const amount = moneyText(row.totalVed);
		if (!amount || row.status === PAYMENT_STATUS.RECHAZADO) continue;
		const item = obligation(
			PAYMENT_SUBJECTS.MINING_DECLARATION,
			row.id,
			TAX_TYPES.MINERO,
			amount,
			`Minería · ${periodLabel(row.periodYear, row.periodMonth)} · ${formatVedText(amount)}`
		);
		if (!taken.has(item.key)) obligations.push(item);
	}

	const seenFilings = new Set();
	for (const row of filingsResult.body?.declarations ?? []) {
		if (!row.filingId || seenFilings.has(row.filingId)) continue;
		seenFilings.add(row.filingId);
		const amount = moneyText(row.totalTaxVed);
		if (!amount || row.status === PAYMENT_STATUS.RECHAZADO) continue;
		const item = obligation(
			PAYMENT_SUBJECTS.ONE_PER_THOUSAND_FILING,
			row.filingId,
			TAX_TYPES.UN_POR_MIL,
			amount,
			`1 x 1000 · ${row.entityName || 'Carga'} · ${formatVedText(amount)}`
		);
		if (!taken.has(item.key)) obligations.push(item);
	}

	for (const row of royaltiesResult.body?.royalties ?? []) {
		if (row.paymentForm === ROYALTY_PAYMENT_FORMS.ESPECIE) continue;
		const amount = moneyText(row.amountVed);
		if (!amount || row.status === PAYMENT_STATUS.RECHAZADO) continue;
		const item = obligation(
			PAYMENT_SUBJECTS.MINING_ROYALTY,
			row.id,
			TAX_TYPES.MINERO,
			amount,
			`Regalía ${row.periodYear} · ${formatVedText(amount)}`
		);
		if (!taken.has(item.key)) obligations.push(item);
	}

	for (const stamp of readIssuedStamps(cookies)) {
		const amount = moneyText(stamp.amountVed);
		if (!amount || stamp.status === 'ANULADO') continue;
		const item = obligation(
			PAYMENT_SUBJECTS.ELECTRONIC_STAMP,
			stamp.uuid,
			TAX_TYPES.TIMBRE_FISCAL,
			amount,
			`Timbre · ${stamp.feeCode || stamp.uuid.slice(0, 8)} · ${formatVedText(amount)}`
		);
		if (!taken.has(item.key)) obligations.push(item);
	}

	const stamp = url.searchParams.get('timbre') ?? '';
	const prefill = obligations.find(
		(item) => item.kind === PAYMENT_SUBJECTS.ELECTRONIC_STAMP && item.id === stamp
	);

	const listError = [
		miningResult.error,
		filingsResult.error,
		royaltiesResult.error,
		paymentsResult.error
	].find(Boolean);

	return {
		taxpayer,
		accounts: accountsResult.body?.accounts ?? [],
		accountsError: accountsResult.error,
		obligations,
		listError: listError ?? null,
		prefill: prefill
			? { obligation: prefill.key, taxType: prefill.taxType, amount: prefill.amount }
			: null
	};
};

export const actions = {
	default: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const values = {
			taxType: text(data, 'taxType'),
			bankAccountId: text(data, 'bankAccountId'),
			bankReferenceNumber: text(data, 'bankReferenceNumber'),
			originBank: text(data, 'originBank'),
			paymentDate: text(data, 'paymentDate'),
			amountPaidVed: text(data, 'amountPaidVed'),
			obligation: text(data, 'obligation')
		};

		const cents = Math.round(Number(values.amountPaidVed.replace(',', '.')) * 100);
		if (!Number.isFinite(cents) || cents <= 0) {
			return fail(400, { values, message: 'Indica un monto mayor que cero.' });
		}

		let relatedKind;
		let relatedId;
		if (values.obligation) {
			const split = values.obligation.indexOf(':');
			relatedKind = values.obligation.slice(0, split);
			relatedId = values.obligation.slice(split + 1);
			if (!SUBJECTS.has(relatedKind) || !relatedId) {
				return fail(400, { values, message: 'La obligación asociada no es válida.' });
			}
		}

		const voucherRead = await readVoucherField(data);
		if (voucherRead.error) return fail(400, { values, message: voucherRead.error });

		/** @type {Record<string, unknown>} */
		const body = {
			taxType: values.taxType,
			bankAccountId: values.bankAccountId,
			bankReferenceNumber: values.bankReferenceNumber,
			originBank: values.originBank,
			paymentDate: values.paymentDate,
			amountPaidVed: cents / 100,
			voucher: voucherRead.voucher
		};
		if (relatedKind && relatedId) {
			body.relatedKind = relatedKind;
			body.relatedId = relatedId;
		}

		let response;
		try {
			response = await apiFetch(fetch, '/payments/upload', {
				method: 'POST',
				headers: sessionHeaders(cookies),
				body: JSON.stringify(body)
			});
		} catch {
			return fail(503, { values, message: 'No se pudo contactar la API.' });
		}

		if (!response.ok) {
			let message =
				response.status >= 500
					? 'No se pudo completar la operación. Revisa que la base de datos esté en marcha.'
					: await readApiError(response, 'No se pudo registrar el pago.');
			if (message === 'No se encontró el timbre.') {
				message =
					'Ese timbre no está en esta cuenta. Un timbre de otro contribuyente no se puede pagar desde aquí.';
			}
			return fail(response.status, {
				values,
				tone: response.status === 409 ? 'warn' : 'danger',
				message
			});
		}

		redirect(303, '/pagos/mios?registrado=1');
	}
};
