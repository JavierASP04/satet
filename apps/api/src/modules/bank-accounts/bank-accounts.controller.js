import { ERROR_CODES, TAX_TYPES } from '@satet/shared';
import { z } from 'zod';
import { getPool } from '../../db/pool.js';
import { withTransaction } from '../../db/tx.js';
import { writeAudit } from '../../lib/audit.js';
import { HttpError } from '../../lib/http.js';
import { requestMeta } from '../../lib/request-meta.js';

const taxTypes = /** @type {[string, ...string[]]} */ (Object.values(TAX_TYPES));

export const listQuerySchema = z.object({
	taxType: z.enum(taxTypes).optional()
});

export const createAccountSchema = z.object({
	bankName: z.string().trim().min(3).max(100),
	accountNumber: z.string().regex(/^\d{20}$/, 'La cuenta debe tener 20 dígitos.'),
	accountType: z.enum(taxTypes)
});

/** @param {Record<string, any>} row */
function present(row) {
	return {
		id: row.id,
		bankName: row.bank_name,
		accountNumber: row.account_number,
		accountType: row.account_type,
		holderName: row.holder_name,
		isActive: row.is_active
	};
}

/** GET /bank-accounts */
export async function list(req, res) {
	const taxType = req.query.taxType;
	const params = [];
	let where = 'WHERE is_active = TRUE';
	if (taxType) {
		params.push(taxType);
		where += ` AND account_type = $${params.length}`;
	}
	const { rows } = await getPool().query(
		`SELECT id, bank_name, account_number, account_type, holder_name, is_active
		 FROM bank_accounts
		 ${where}
		 ORDER BY bank_name, account_number`,
		params
	);
	res.json({ accounts: rows.map(present) });
}

/** POST /bank-accounts */
export async function create(req, res) {
	const account = await withTransaction(async (client) => {
		const { rows } = await client.query(
			`INSERT INTO bank_accounts (bank_name, account_number, account_type)
			 VALUES ($1, $2, $3)
			 RETURNING id, bank_name, account_number, account_type, holder_name, is_active`,
			[req.body.bankName, req.body.accountNumber, req.body.accountType]
		);
		await writeAudit(client, {
			userId: req.user.id,
			action: 'CREATE',
			tableAffected: 'bank_accounts',
			recordId: rows[0].id,
			oldValues: null,
			newValues: present(rows[0]),
			...requestMeta(req)
		});
		return rows[0];
	});
	res.status(201).json({ account: present(account) });
}

export function assertKnownTaxType(taxType) {
	if (taxType && !taxTypes.includes(taxType)) {
		throw new HttpError(400, ERROR_CODES.VALIDATION_ERROR, 'Tipo de tributo inválido.');
	}
}
