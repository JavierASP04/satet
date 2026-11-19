import './env-setup-reports.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { before, after, describe, it } from 'node:test';
import pg from 'pg';
import { createApp } from '../src/app.js';
import { closePool, getPool } from '../src/db/pool.js';
import { signSessionToken } from '../src/modules/auth/session.js';

const MINERO = '00000000-0000-4000-8000-0000000000a1';
const MIL = '00000000-0000-4000-8000-0000000000b1';
const TIMBRE = '00000000-0000-4000-8000-0000000000c1';

describe('reportes del POA y auditoría', () => {
	const adminUrl = 'postgres://satet:satet@localhost:5433/postgres';
	const databaseUrl = 'postgres://satet:satet@localhost:5433/satet_reports_test';
	/** @type {import('http').Server} */
	let server;
	/** @type {string} */
	let collector;
	/** @type {string} */
	let treasury;
	/** @type {string} */
	let admin;
	/** @type {string} */
	let contributor;
	/** @type {string} */
	let saren;

	before(async () => {
		const adminDb = new pg.Client({ connectionString: adminUrl });
		await adminDb.connect();
		await adminDb.query(
			`SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = 'satet_reports_test' AND pid <> pg_backend_pid()`
		);
		await adminDb.query('DROP DATABASE IF EXISTS satet_reports_test');
		await adminDb.query('CREATE DATABASE satet_reports_test');
		await adminDb.end();

		const db = new pg.Client({ connectionString: databaseUrl });
		await db.connect();
		await db.query(readFileSync(new URL('../../../database/schema.sql', import.meta.url), 'utf8'));
		await db.end();

		const app = createApp();
		server = app.listen(0, '127.0.0.1');
		await new Promise((resolve, reject) => {
			server.once('listening', resolve);
			server.once('error', reject);
		});
		const address = server.address();
		if (!address || typeof address === 'string') throw new Error('Sin puerto de prueba.');
		baseUrl = `http://127.0.0.1:${address.port}`;

		const client = await getPool().connect();
		try {
			contributor = await insertUser(client, 'mina@reportes.test', 'CONTRIBUYENTE');
			collector = await insertUser(client, 'recaudacion@reportes.test', 'ANALISTA_RECAUDACION');
			treasury = await insertUser(client, 'tesoreria@reportes.test', 'ANALISTA_TESORERIA');
			saren = await insertUser(client, 'saren@reportes.test', 'VERIFICADOR_SAREN');
			admin = await insertUser(client, 'admin@reportes.test', 'ADMIN_SISTEMA');
			const taxpayer = await insertTaxpayer(client, contributor);
			await insertPayment(client, taxpayer, {
				taxType: 'MINERO',
				accountId: MINERO,
				reference: 'VER-MINERO',
				amount: '60.00',
				status: 'VERIFICADO',
				paymentDate: '2026-10-15',
				verifiedAt: '2026-10-20T16:00:00.000Z',
				verifiedBy: treasury
			});
			await insertPayment(client, taxpayer, {
				taxType: 'TIMBRE_FISCAL',
				accountId: TIMBRE,
				reference: 'VER-TIMBRE',
				amount: '10.00',
				status: 'VERIFICADO',
				paymentDate: '2026-10-31',
				verifiedAt: '2026-11-01T03:30:00.000Z',
				verifiedBy: treasury
			});
			await insertPayment(client, taxpayer, {
				taxType: 'UN_POR_MIL',
				accountId: MIL,
				reference: 'VER-MIL',
				amount: '15.50',
				status: 'VERIFICADO',
				paymentDate: '2026-11-01',
				verifiedAt: '2026-11-01T04:30:00.000Z',
				verifiedBy: treasury
			});
			await insertPayment(client, taxpayer, {
				taxType: 'MINERO',
				accountId: MINERO,
				reference: 'PEND-100',
				amount: '100.00',
				status: 'PENDIENTE',
				paymentDate: '2026-10-02'
			});
			await insertPayment(client, taxpayer, {
				taxType: 'MINERO',
				accountId: MINERO,
				reference: 'RECH-40',
				amount: '40.00',
				status: 'RECHAZADO',
				paymentDate: '2026-10-03',
				reason: 'Referencia inexistente.'
			});
			await insertLog(client, admin, {
				action: 'CREATE',
				table: 'mining_declarations',
				at: '2026-10-01T12:00:00.000Z',
				oldValues: null,
				newValues: { status: 'PENDIENTE' },
				ip: '127.0.0.1'
			});
			await insertLog(client, admin, {
				action: 'APPROVE',
				table: 'taxpayers',
				at: '2026-10-02T12:00:00.000Z',
				oldValues: { isApproved: false },
				newValues: { isApproved: true },
				ip: '10.0.0.8'
			});
		} finally {
			client.release();
		}
	});

	after(async () => {
		if (server) await new Promise((resolve) => server.close(resolve));
		await closePool();
	});

	it('exige sesión y el permiso del tablero', async () => {
		const anonymous = await fetch(`${baseUrl}/api/v1/reports/revenue-summary`);
		assert.equal(anonymous.status, 401);

		for (const path of [
			'/reports/revenue-summary',
			'/reports/export/excel',
			'/reports/export/pdf'
		]) {
			const forbidden = await fetch(`${baseUrl}/api/v1${path}`, {
				headers: { cookie: cookie(contributor) }
			});
			assert.equal(forbidden.status, 403);
		}
		const sarenSummary = await fetch(`${baseUrl}/api/v1/reports/revenue-summary`, {
			headers: { cookie: cookie(saren) }
		});
		assert.equal(sarenSummary.status, 403);
	});

	it('suma solo los pagos verificados y omite la meta', async () => {
		const response = await fetch(`${baseUrl}/api/v1/reports/revenue-summary`, {
			headers: { cookie: cookie(collector) }
		});
		assert.equal(response.status, 200);
		const body = await response.json();
		assert.equal(body.currency, 'VED');
		assert.equal(body.totalVed, '85.50');
		assert.equal('projectedGoal' in body, false);
		assert.equal('goalVed' in body, false);
		assert.deepEqual(
			body.byBranch.map((branch) => [branch.taxType, branch.label, branch.totalVed]),
			[
				['MINERO', 'Minería', '60.00'],
				['UN_POR_MIL', '1x1000', '15.50'],
				['TIMBRE_FISCAL', 'Timbres', '10.00']
			]
		);
		assert.deepEqual(
			body.months.map((month) => [month.month, month.totalVed]),
			[
				['2026-10', '70.00'],
				['2026-11', '15.50']
			]
		);
		const october = body.months[0].byBranch.map((branch) => branch.totalVed);
		assert.deepEqual(october, ['60.00', '0.00', '10.00']);
	});

	it('exporta la conciliación en xlsx, incluidos pendiente y rechazado', async () => {
		const response = await fetch(`${baseUrl}/api/v1/reports/export/excel`, {
			headers: { cookie: cookie(treasury) }
		});
		assert.equal(response.status, 200);
		assert.equal(
			response.headers.get('content-type'),
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
		);
		assert.match(response.headers.get('content-disposition') ?? '', /conciliacion\.xlsx/);
		const file = Buffer.from(await response.arrayBuffer());
		assert.equal(file.subarray(0, 4).toString(), 'PK\u0003\u0004');
		const text = file.toString('utf8');
		assert.match(text, /VER-MINERO/);
		assert.match(text, /PEND-100/);
		assert.match(text, /RECH-40/);
		assert.match(text, /Referencia inexistente/);
		assert.match(text, /Fecha de pago/);
	});

	it('entrega el informe PDF de gestión', async () => {
		const response = await fetch(`${baseUrl}/api/v1/reports/export/pdf`, {
			headers: { cookie: cookie(admin) }
		});
		assert.equal(response.status, 200);
		assert.equal(response.headers.get('content-type'), 'application/pdf');
		assert.match(response.headers.get('content-disposition') ?? '', /informe-gestion\.pdf/);
		const pdf = Buffer.from(await response.arrayBuffer());
		assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
	});

	it('lista la auditoría del administrador con valores anteriores y nuevos', async () => {
		const denied = await fetch(`${baseUrl}/api/v1/audit/logs`, {
			headers: { cookie: cookie(collector) }
		});
		assert.equal(denied.status, 403);
		const treasuryDenied = await fetch(`${baseUrl}/api/v1/audit/logs`, {
			headers: { cookie: cookie(treasury) }
		});
		assert.equal(treasuryDenied.status, 403);

		const invalid = await fetch(`${baseUrl}/api/v1/audit/logs?limit=0`, {
			headers: { cookie: cookie(admin) }
		});
		assert.equal(invalid.status, 400);

		const page = await fetch(`${baseUrl}/api/v1/audit/logs?limit=1`, {
			headers: { cookie: cookie(admin) }
		});
		assert.equal(page.status, 200);
		const latest = await page.json();
		assert.equal(latest.total, 2);
		assert.equal(latest.logs.length, 1);
		assert.equal(latest.logs[0].action, 'APPROVE');
		assert.equal(latest.logs[0].email, 'admin@reportes.test');
		assert.equal(latest.logs[0].ipAddress, '10.0.0.8');
		assert.deepEqual(latest.logs[0].oldValues, { isApproved: false });
		assert.deepEqual(latest.logs[0].newValues, { isApproved: true });

		const filtered = await fetch(
			`${baseUrl}/api/v1/audit/logs?action=CREATE&table=mining_declarations`,
			{
				headers: { cookie: cookie(admin) }
			}
		);
		assert.equal(filtered.status, 200);
		const created = await filtered.json();
		assert.equal(created.total, 1);
		assert.equal(created.logs[0].tableAffected, 'mining_declarations');
		assert.equal(created.logs[0].userId, admin);
		assert.deepEqual(created.logs[0].newValues, { status: 'PENDIENTE' });
		assert.equal(created.logs[0].oldValues, null);
	});
});

let baseUrl = '';

function cookie(userId) {
	return `satet_session=${signSessionToken(userId)}`;
}

async function insertUser(client, email, role) {
	const { rows } = await client.query(
		`INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id`,
		[email, 'not-a-login', role]
	);
	return rows[0].id;
}

async function insertTaxpayer(client, userId) {
	const { rows } = await client.query(
		`INSERT INTO taxpayers (
			user_id, doc_type, rif_number, company_name, fiscal_address, phone_number,
			legal_representative_name, legal_representative_dna, is_approved
		) VALUES ($1, 'RIF_JURIDICO', 'J-12345678-9', 'Cantera Andina C.A.', 'Av. Principal', '0271-0000000', 'Ana Pérez', 'V-12345678', TRUE)
		RETURNING id`,
		[userId]
	);
	return rows[0].id;
}

async function insertPayment(client, taxpayerId, payment) {
	await client.query(
		`INSERT INTO payments (
			taxpayer_id, tax_type, target_bank_account_id, bank_reference_number,
			origin_bank, payment_date, amount_paid_ved, voucher_file_path,
			voucher_media_type, voucher_content, status, rejection_reason, verified_by, verified_at
		) VALUES (
			$1, $2, $3, $4, 'Banesco', $5, $6, $7, 'application/pdf', $8, $9, $10, $11, $12
		)`,
		[
			taxpayerId,
			payment.taxType,
			payment.accountId,
			payment.reference,
			payment.paymentDate,
			payment.amount,
			`payments/${payment.reference}/pago.pdf`,
			Buffer.from('%PDF-1.4'),
			payment.status,
			payment.reason ?? null,
			payment.verifiedBy ?? null,
			payment.verifiedAt ?? null
		]
	);
}

async function insertLog(client, userId, entry) {
	await client.query(
		`INSERT INTO audit_logs (
			user_id, action, table_affected, record_id, old_values, new_values, ip_address, user_agent, created_at
		) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, 'prueba', $8)`,
		[
			userId,
			entry.action,
			entry.table,
			randomUUID(),
			entry.oldValues == null ? null : JSON.stringify(entry.oldValues),
			JSON.stringify(entry.newValues),
			entry.ip,
			entry.at
		]
	);
}
