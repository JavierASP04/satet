import { ERROR_CODES } from '@satet/shared';
import { z } from 'zod';
import { HttpError } from './http.js';

export const voucherSchema = z.object({
	fileName: z.string().trim().min(1, 'Indica el nombre del comprobante.').max(120),
	mediaType: z.enum(['image/jpeg', 'image/png', 'application/pdf']),
	contentBase64: z.string().trim().min(1, 'Adjunta el comprobante de pago.')
});

export const moneyPaymentSchema = {
	bankReferenceNumber: z
		.string()
		.trim()
		.min(4, 'Indica el número de referencia bancaria.')
		.max(100),
	bankAccountId: z.uuid('Selecciona la cuenta institucional.'),
	voucher: voucherSchema
};

/**
 * @param {import('pg').PoolClient} client
 * @param {string} accountId
 * @param {string} taxType
 */
export async function requireBankAccount(client, accountId, taxType) {
	const { rows } = await client.query(
		`SELECT id, bank_name, account_number, account_type
		 FROM bank_accounts
		 WHERE id = $1 AND is_active = TRUE`,
		[accountId]
	);
	const account = rows[0];
	if (!account || account.account_type !== taxType) {
		throw new HttpError(
			400,
			ERROR_CODES.VALIDATION_ERROR,
			'La cuenta no corresponde a este tributo o no está activa.'
		);
	}
	return account;
}
