import { fail } from '@sveltejs/kit';
import { apiFetch, readApiError } from '#lib/server/api.js';
import { loadCurrentRate } from '#lib/server/bcv-rate.js';
import { rememberIssuedStamp } from '#lib/server/issued-stamps.js';
import { sessionHeaders } from '#lib/server/session.js';
import { stampQrDataUrl } from '#lib/server/stamp-qr.js';

export const load = async ({ fetch, cookies }) => {
	const rate = await loadCurrentRate(fetch, cookies);
	try {
		const response = await apiFetch(fetch, '/stamps/fees', { headers: sessionHeaders(cookies) });
		if (!response.ok) {
			return {
				...rate,
				fees: [],
				feesError: await readApiError(response, 'No se pudo cargar el tabulador.')
			};
		}
		const body = await response.json();
		return { ...rate, fees: body.fees ?? [], feesError: null };
	} catch {
		return { ...rate, fees: [], feesError: 'No se pudo contactar la API.' };
	}
};

export const actions = {
	default: async ({ request, fetch, cookies, url }) => {
		const data = await request.formData();
		const feeCode = String(data.get('feeCode') ?? '').trim();
		if (!feeCode) {
			return fail(400, { message: 'Elige un concepto del tabulador.' });
		}

		let response;
		try {
			response = await apiFetch(fetch, '/stamps/purchase', {
				method: 'POST',
				headers: sessionHeaders(cookies),
				body: JSON.stringify({ feeCode })
			});
		} catch {
			return fail(503, { feeCode, message: 'No se pudo contactar la API.' });
		}

		if (!response.ok) {
			const fallback = 'No se pudo emitir el timbre.';
			return fail(response.status, {
				feeCode,
				message:
					response.status >= 500
						? 'No se pudo completar la operación. Revisa que la base de datos esté en marcha.'
						: await readApiError(response, fallback)
			});
		}

		const body = await response.json();
		const stamp = body.stamp ?? null;
		if (stamp) rememberIssuedStamp(cookies, url, stamp);
		return {
			ok: true,
			feeCode,
			message: 'Timbre emitido. Ya puedes descargar el PDF.',
			stamp,
			qrDataUrl: stamp ? await stampQrDataUrl(stamp.qrPayload) : null
		};
	}
};
