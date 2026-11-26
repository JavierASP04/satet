import { ERROR_CODES } from '@satet/shared';
import { HttpError } from './http.js';

/**
 * La referencia no puede repetirse en pagos, declaraciones, cargas ni regalías.
 * @param {import('pg').PoolClient} client
 * @param {string} reference
 */
export async function assertBankReferenceAvailable(client, reference) {
	const { rows } = await client.query(
		`SELECT 1
		 FROM (
		   SELECT bank_reference_number AS ref FROM payments
		   UNION ALL
		   SELECT bank_reference_number FROM mining_declarations
		   UNION ALL
		   SELECT bank_reference_number FROM one_per_thousand_filings
		   UNION ALL
		   SELECT bank_reference_number FROM mining_royalties
		     WHERE bank_reference_number IS NOT NULL
		 ) refs
		 WHERE ref = $1
		 LIMIT 1`,
		[reference]
	);
	if (rows[0]) {
		throw new HttpError(
			409,
			ERROR_CODES.CONFLICT,
			'Esa referencia bancaria ya está registrada.',
			{ field: 'bankReferenceNumber' }
		);
	}
}
