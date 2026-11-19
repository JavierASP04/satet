import './env-setup-pedido.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { before, after, describe, it } from 'node:test';
import pg from 'pg';
import { createApp } from '../src/app.js';
import { closePool, getPool } from '../src/db/pool.js';
import { signSessionToken } from '../src/modules/auth/session.js';

const VENEZUELA_MINERO = '00000000-0000-4000-8000-0000000000a1';
const VENEZUELA_MIL = '00000000-0000-4000-8000-0000000000b1';
const TIMBRE = '00000000-0000-4000-8000-0000000000c1';
const voucher = {
	fileName: 'pago.pdf',
	mediaType: 'application/pdf',
	contentBase64: Buffer.from('%PDF-1.4 comprobante').toString('base64')
};

describe('pedido de la reunión', () => {
	const adminUrl = 'postgres://satet:satet@localhost:5433/postgres';
	const databaseUrl = 'postgres://satet:satet@localhost:5433/satet_pedido_test';
	/** @type {import('http').Server} */
	let server;
	let base;

	before(async () => {
		const admin = new pg.Client({ connectionString: adminUrl });
		await admin.connect();
		await admin.query(
			`SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = 'satet_pedido_test' AND pid <> pg_backend_pid()`
		);
		await admin.query('DROP DATABASE IF EXISTS satet_pedido_test');
		await admin.query('CREATE DATABASE satet_pedido_test');
		await admin.end();

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
		base = `http://127.0.0.1:${address.port}`;
		baseUrl = base;
	});

	after(async () => {
		if (server) await new Promise((resolve) => server.close(resolve));
		await closePool();
	});

	it('exige comprobante, calcula materiales y regalía, y solo imprime la planilla aprobada', async () => {
		const client = await getPool().connect();
		try {
			const owner = await insertUser(client, 'mina@pedido.test', 'CONTRIBUYENTE');
			const analyst = await insertUser(client, 'analista@pedido.test', 'ANALISTA_RECAUDACION');
			const admin = await insertUser(client, 'admin@pedido.test', 'ADMIN_SISTEMA');
			await insertTaxpayer(client, owner, 'J-12345678-9', true);
			const ownerCookie = cookie(owner);
			const adminCookie = cookie(admin);

			const accounts = await fetch(`${base}/api/v1/bank-accounts?taxType=TIMBRE_FISCAL`, {
				headers: { cookie: ownerCookie }
			});
			assert.equal(accounts.status, 200);
			const listed = await accounts.json();
			assert.equal(listed.accounts.length, 3);
			assert.deepEqual(listed.accounts.map((account) => account.bankName).sort(), [
				'BNC',
				'Banca Amiga',
				'Banco de Venezuela'
			]);

			const incomplete = await post(ownerCookie, '/mining/declarations', {
				periodYear: 2024,
				periodMonth: 1,
				activityType: 'EXTRACCION',
				materialType: 'Arena',
				volumeCubicMeters: 10,
				commercialValuePerUnit: 100
			});
			assert.equal(incomplete.status, 400);

			const wrongAccount = await post(ownerCookie, '/mining/declarations', {
				periodYear: 2024,
				periodMonth: 1,
				lines: [
					{
						activityType: 'EXTRACCION',
						materialType: 'Arena',
						volumeCubicMeters: 10,
						commercialValuePerUnit: 100
					}
				],
				bankReferenceNumber: '12345678',
				bankAccountId: TIMBRE,
				voucher
			});
			assert.equal(wrongAccount.status, 400);

			const created = await post(ownerCookie, '/mining/declarations', {
				periodYear: 2024,
				periodMonth: 1,
				lines: [
					{
						activityType: 'EXTRACCION',
						materialType: 'Arena',
						volumeCubicMeters: 10,
						commercialValuePerUnit: 100
					},
					{
						activityType: 'PREMEZCLADO',
						materialType: 'Mezcla',
						volumeCubicMeters: 5,
						commercialValuePerUnit: 80
					}
				],
				bankReferenceNumber: '12345678',
				bankAccountId: VENEZUELA_MINERO,
				voucher
			});
			assert.equal(created.status, 201);
			const declaration = (await created.json()).declaration;
			assert.equal(declaration.isExtemporaneous, true);
			assert.equal('fineEur' in declaration, false);
			assert.equal(declaration.lines[0].appliedTaxRate, '6.00');
			assert.equal(declaration.lines[0].subtotalVed, '60.00');
			assert.equal(declaration.lines[1].appliedTaxRate, '2.00');
			assert.equal(declaration.lines[1].subtotalVed, '8.00');
			assert.equal(declaration.totalVed, '68.00');

			const pendingList = await fetch(`${base}/api/v1/mining/declarations/pending`, {
				headers: { cookie: adminCookie }
			});
			assert.equal(pendingList.status, 200);
			assert.equal((await pendingList.json()).declarations.length, 1);
			const analystPending = await fetch(`${base}/api/v1/mining/declarations/pending`, {
				headers: { cookie: cookie(analyst) }
			});
			assert.equal(analystPending.status, 403);

			const earlyPdf = await fetch(`${base}/api/v1/mining/declarations/${declaration.id}/pdf`, {
				headers: { cookie: ownerCookie }
			});
			assert.equal(earlyPdf.status, 409);

			const analystResolve = await post(
				cookie(analyst),
				`/mining/declarations/${declaration.id}/resolve`,
				{
					decision: 'APROBAR'
				}
			);
			assert.equal(analystResolve.status, 403);

			const approved = await post(adminCookie, `/mining/declarations/${declaration.id}/resolve`, {
				decision: 'APROBAR'
			});
			assert.equal(approved.status, 200);
			const pdf = await fetch(`${base}/api/v1/mining/declarations/${declaration.id}/pdf`, {
				headers: { cookie: ownerCookie }
			});
			assert.equal(pdf.status, 200);
			assert.equal(pdf.headers.get('content-type'), 'application/pdf');
			const bytes = Buffer.from(await pdf.arrayBuffer());
			assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');

			const retention = await post(ownerCookie, '/one-per-thousand/batch', {
				orders: [
					{
						paymentOrderNumber: 'OP-1',
						entityName: 'Gobernación',
						executedAmountVed: 1000,
						executionDate: '2026-10-01'
					},
					{
						paymentOrderNumber: 'OP-2',
						entityName: 'Alcaldía',
						executedAmountVed: 2000,
						executionDate: '2026-10-02'
					}
				],
				bankReferenceNumber: '99887766',
				bankAccountId: VENEZUELA_MIL,
				voucher
			});
			assert.equal(retention.status, 201);
			const filing = await retention.json();
			assert.equal(filing.totalTaxVed, '3.00');
			assert.equal(filing.declarations[0].taxAmountVed, '1.00');
			assert.equal(filing.declarations[1].taxAmountVed, '2.00');

			const royaltyCash = await post(ownerCookie, '/royalties', {
				periodYear: 2024,
				commercialValuePerUnit: 100,
				paymentForm: 'DINERO_TOTAL'
			});
			assert.equal(royaltyCash.status, 400);

			const royalty = await post(ownerCookie, '/royalties', {
				periodYear: 2024,
				commercialValuePerUnit: 100,
				paymentForm: 'ESPECIE'
			});
			assert.equal(royalty.status, 201);
			const royaltyBody = await royalty.json();
			assert.equal(royaltyBody.royalty.volumeCubicMeters, '15.00');
			assert.equal(royaltyBody.royalty.amountVed, '105.00');

			const pendingUser = await insertUser(client, 'nuevo@pedido.test', 'CONTRIBUYENTE');
			await insertTaxpayer(client, pendingUser, 'J-87654321-0', false);
			const { rows } = await client.query('SELECT id FROM taxpayers WHERE user_id = $1', [
				pendingUser
			]);
			const rejected = await fetch(`${base}/api/v1/taxpayers/${rows[0].id}/approve`, {
				method: 'PATCH',
				headers: { cookie: adminCookie, 'content-type': 'application/json' },
				body: JSON.stringify({ approved: false })
			});
			assert.equal(rejected.status, 200);
			assert.equal((await rejected.json()).deleted, true);
			const gone = await client.query(
				'SELECT count(*)::int AS n FROM taxpayers WHERE rif_number = $1',
				['J-87654321-0']
			);
			assert.equal(gone.rows[0].n, 0);
			const scrubbed = await client.query('SELECT email, is_active FROM users WHERE id = $1', [
				pendingUser
			]);
			assert.equal(scrubbed.rows[0].is_active, false);
			assert.notEqual(scrubbed.rows[0].email, 'nuevo@pedido.test');
		} finally {
			client.release();
		}
	});
});

function cookie(userId) {
	return `satet_session=${signSessionToken(userId)}`;
}

function post(cookieHeader, path, body) {
	return fetch(`${baseOf()}/api/v1${path}`, {
		method: 'POST',
		headers: { cookie: cookieHeader, 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

function baseOf() {
	return baseUrl;
}

let baseUrl = '';

async function insertUser(client, email, role) {
	const { rows } = await client.query(
		`INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id`,
		[email, 'not-a-login', role]
	);
	return rows[0].id;
}

async function insertTaxpayer(client, userId, rif, approved) {
	await client.query(
		`INSERT INTO taxpayers (
			user_id, doc_type, rif_number, company_name, fiscal_address, phone_number,
			legal_representative_name, legal_representative_dna, is_approved
		) VALUES ($1, 'RIF_JURIDICO', $2, 'Cantera Andina C.A.', 'Av. Principal', '0271-0000000', 'Ana Pérez', 'V-12345678', $3)`,
		[userId, rif, approved]
	);
}
