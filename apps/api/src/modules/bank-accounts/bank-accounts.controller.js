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

export const accountIdParamsSchema = z.object({
	id: z.uuid('Identificador inválido.')
});

export const updateAccountSchema = z
	.object({
		bankName: z.string().trim().min(3).max(100).optional(),
		accountNumber: z.string().regex(/^\d{20}$/, 'La cuenta debe tener 20 dígitos.').optional(),
		accountType: z.enum(taxTypes).optional(),
		isActive: z.boolean().optional()
	})
	.refine((body) => Object.values(body).some((value) => value !== undefined), {
		message: 'Indica el dato que quieres cambiar.'
	});

/** PATCH /bank-accounts/:id */
export async function update(req, res) {
	const account = await withTransaction(async (client) => {
		const current = await client.query(
			`SELECT id, bank_name, account_number, account_type, holder_name, is_active
			 FROM bank_accounts WHERE id = $1 FOR UPDATE`,
			[req.params.id]
		);
		const row = current.rows[0];
		if (!row) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'No se encontró la cuenta.');
		const next = {
			bankName: req.body.bankName ?? row.bank_name,
			accountNumber: req.body.accountNumber ?? row.account_number,
			accountType: req.body.accountType ?? row.account_type,
			isActive: req.body.isActive ?? row.is_active
		};
		const { rows } = await client.query(
			`UPDATE bank_accounts
			 SET bank_name = $2, account_number = $3, account_type = $4, is_active = $5
			 WHERE id = $1
			 RETURNING id, bank_name, account_number, account_type, holder_name, is_active`,
			[row.id, next.bankName, next.accountNumber, next.accountType, next.isActive]
		);
		await writeAudit(client, {
			userId: req.user.id,
			action: 'UPDATE',
			tableAffected: 'bank_accounts',
			recordId: row.id,
			oldValues: present(row),
			newValues: present(rows[0]),
			...requestMeta(req)
		});
		return rows[0];
	});
	res.json({ account: present(account) });
}

export function assertKnownTaxType(taxType) {
	if (taxType && !taxTypes.includes(taxType)) {
		throw new HttpError(400, ERROR_CODES.VALIDATION_ERROR, 'Tipo de tributo inválido.');
	}
}
