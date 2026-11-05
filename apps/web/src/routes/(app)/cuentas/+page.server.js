import { fail } from '@sveltejs/kit';
import { hasPermission, PERMISSIONS, TAX_TYPES } from '@satet/shared';
import { apiFetch, readApiError } from '#lib/server/api.js';
import { sessionHeaders } from '#lib/server/session.js';

const TAXES = new Set(Object.values(TAX_TYPES));
const DENIED = 'No tiene permiso para gestionar las cuentas institucionales.';

/** @param {typeof fetch} fetch @param {import('@sveltejs/kit').Cookies} cookies */
async function loadAccounts(fetch, cookies) {
	const response = await apiFetch(fetch, '/bank-accounts', {
		headers: sessionHeaders(cookies)
	});
	if (!response.ok) {
		return {
			accounts: [],
			error:
				response.status >= 500
					? 'No se pudo completar la operación. Revisa que la base de datos esté en marcha.'
					: await readApiError(response, 'No se pudieron cargar las cuentas.')
		};
	}
	const body = await response.json();
	return { accounts: body.accounts ?? [], error: null };
}

export const load = async ({ fetch, cookies, parent }) => {
	const { user } = await parent();
	if (!hasPermission(user.role, PERMISSIONS.CUENTAS_GESTIONAR)) {
		return { accounts: [], forbidden: true, error: DENIED };
	}
	try {
		const loaded = await loadAccounts(fetch, cookies);
		return { ...loaded, forbidden: false };
	} catch {
		return { accounts: [], forbidden: false, error: 'No se pudo contactar la API.' };
	}
};

export const actions = {
	default: async ({ request, fetch, cookies, locals }) => {
		if (!hasPermission(locals.user?.role, PERMISSIONS.CUENTAS_GESTIONAR)) {
			return fail(403, { message: DENIED, tone: 'warn' });
		}

		const data = await request.formData();
		const bankName = String(data.get('bankName') ?? '').trim();
		const accountNumber = String(data.get('accountNumber') ?? '').replace(/\D/g, '');
		const accountType = String(data.get('accountType') ?? '').trim();
		const values = { bankName, accountNumber, accountType };

		if (bankName.length < 3 || bankName.length > 100) {
			return fail(400, { values, message: 'El banco debe tener entre 3 y 100 caracteres.' });
		}
		if (!/^\d{20}$/.test(accountNumber)) {
			return fail(400, { values, message: 'La cuenta debe tener 20 dígitos.' });
		}
		if (!TAXES.has(accountType)) {
			return fail(400, { values, message: 'Elige el tributo de la cuenta.' });
		}

		try {
			const current = await loadAccounts(fetch, cookies);
			if (current.accounts.some((account) => account.accountNumber === accountNumber)) {
				return fail(409, {
					values,
					tone: 'warn',
					message: 'Ese número de cuenta ya está registrado.'
				});
			}
		} catch {
			return fail(503, { values, message: 'No se pudo contactar la API.' });
		}

		let response;
		try {
			response = await apiFetch(fetch, '/bank-accounts', {
				method: 'POST',
				headers: sessionHeaders(cookies),
				body: JSON.stringify({ bankName, accountNumber, accountType })
			});
		} catch {
			return fail(503, { values, message: 'No se pudo contactar la API.' });
		}

		if (!response.ok) {
			const apiMessage =
				response.status >= 500
					? 'No se pudo completar la operación. Revisa que la base de datos esté en marcha.'
					: await readApiError(response, 'No se pudo registrar la cuenta.');
			const duplicate =
				response.status === 409 &&
				(apiMessage === 'El registro entra en conflicto con uno existente.' ||
					apiMessage === 'Ese número de cuenta ya está registrado.');
			return fail(response.status, {
				values,
				tone: response.status === 409 ? 'warn' : 'danger',
				message: duplicate ? 'Ese número de cuenta ya está registrado.' : apiMessage
			});
		}

		return {
			ok: true,
			message: 'Cuenta institucional registrada. Ya puede usarse en los pagos de ese tributo.'
		};
	}
};
