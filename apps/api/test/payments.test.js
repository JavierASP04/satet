import './env-setup-payments.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { before, after, describe, it } from 'node:test';
import pg from 'pg';
import { createApp } from '../src/app.js';
import { closePool, getPool } from '../src/db/pool.js';
import { signSessionToken } from '../src/modules/auth/session.js';

const MINERO = '00000000-0000-4000-8000-0000000000a1';
const TIMBRE = '00000000-0000-4000-8000-0000000000c1';
const voucher = {
	fileName: 'pago.pdf',
	mediaType: 'application/pdf',
	contentBase64: Buffer.from('%PDF-1.4 comprobante').toString('base64')
};

describe('conciliación de tesorería', () => {
	const adminUrl = 'postgres://satet:satet@localhost:5433/postgres';
	const databaseUrl = 'postgres://satet:satet@localhost:5433/satet_payments_test';
	/** @type {import('http').Server} */
	let server;
	let base;

	before(async () => {
		const admin = new pg.Client({ connectionString: adminUrl });
		await admin.connect();
		await admin.query(
			`SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = 'satet_payments_test' AND pid <> pg_backend_pid()`
		);
		await admin.query('DROP DATABASE IF EXISTS satet_payments_test');
		await admin.query('CREATE DATABASE satet_payments_test');
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

	it('concilia el pago, aprueba la planilla y anula el timbre rechazado', async () => {
		const client = await getPool().connect();
		try {
			const owner = await insertUser(client, 'mina@pagos.test', 'CONTRIBUYENTE');
			const treasury = await insertUser(client, 'tesoreria@pagos.test', 'ANALISTA_TESORERIA');
			const collector = await insertUser(client, 'recaudacion@pagos.test', 'ANALISTA_RECAUDACION');
			const admin = await insertUser(client, 'admin@pagos.test', 'ADMIN_SISTEMA');
			await insertTaxpayer(client, owner, 'J-12345678-9', true);
			const pendingUser = await insertUser(client, 'nuevo@pagos.test', 'CONTRIBUYENTE');
			await insertTaxpayer(client, pendingUser, 'J-87654321-0', false);
			const ownerCookie = cookie(owner);
			const treasuryCookie = cookie(treasury);

			const anonymous = await fetch(`${base}/api/v1/payments/upload`, { method: 'POST' });
			assert.equal(anonymous.status, 401);

			const unapproved = await post(
				cookie(pendingUser),
				'/payments/upload',
				paymentBody('11112222', 60)
			);
			assert.equal(unapproved.status, 403);

			const declared = await post(ownerCookie, '/mining/declarations', {
				periodYear: 2024,
				periodMonth: 1,
				activityType: 'EXTRACCION',
				materialType: 'Arena',
				volumeCubicMeters: 10,
				commercialValuePerUnit: 100,
				bankReferenceNumber: '12345678',
				bankAccountId: MINERO,
				voucher
			});
			assert.equal(declared.status, 201);
			const declaration = (await declared.json()).declaration;
			assert.equal(declaration.totalVed, '60.00');

			const earlyPdf = await fetch(`${base}/api/v1/mining/declarations/${declaration.id}/pdf`, {
				headers: { cookie: ownerCookie }
			});
			assert.equal(earlyPdf.status, 409);

			const wrongAccount = await post(
				ownerCookie,
				'/payments/upload',
				paymentBody('22223333', 60, {
					bankAccountId: TIMBRE,
					relatedKind: 'MINING_DECLARATION',
					relatedId: declaration.id
				})
			);
			assert.equal(wrongAccount.status, 400);

			const wrongAmount = await post(
				ownerCookie,
				'/payments/upload',
				paymentBody('22223333', 1, {
					relatedKind: 'MINING_DECLARATION',
					relatedId: declaration.id
				})
			);
			assert.equal(wrongAmount.status, 400);

			const uploaded = await post(
				ownerCookie,
				'/payments/upload',
				paymentBody('22223333', 60, {
					relatedKind: 'MINING_DECLARATION',
					relatedId: declaration.id
				})
			);
			assert.equal(uploaded.status, 201);
			const payment = (await uploaded.json()).payment;
			assert.equal(payment.status, 'PENDIENTE');
			assert.equal(payment.amountPaidVed, '60.00');

			const forbiddenList = await fetch(`${base}/api/v1/payments/pending`, {
				headers: { cookie: cookie(collector) }
			});
			assert.equal(forbiddenList.status, 403);

			const pending = await fetch(`${base}/api/v1/payments/pending?taxType=MINERO`, {
				headers: { cookie: treasuryCookie }
			});
			assert.equal(pending.status, 200);
			assert.equal((await pending.json()).payments.length, 1);

			const ownerVerify = await fetch(`${base}/api/v1/payments/${payment.id}/verify`, {
				method: 'PATCH',
				headers: { cookie: ownerCookie, 'content-type': 'application/json' },
				body: '{}'
			});
			assert.equal(ownerVerify.status, 403);

			const verified = await fetch(`${base}/api/v1/payments/${payment.id}/verify`, {
				method: 'PATCH',
				headers: { cookie: treasuryCookie, 'content-type': 'application/json' },
				body: '{}'
			});
			assert.equal(verified.status, 200);
			assert.equal((await verified.json()).payment.status, 'VERIFICADO');

			const pdf = await fetch(`${base}/api/v1/mining/declarations/${declaration.id}/pdf`, {
				headers: { cookie: ownerCookie }
			});
			assert.equal(pdf.status, 200);
			assert.equal(
				Buffer.from(await pdf.arrayBuffer())
					.subarray(0, 5)
					.toString(),
				'%PDF-'
			);

			const again = await fetch(`${base}/api/v1/payments/${payment.id}/verify`, {
				method: 'PATCH',
				headers: { cookie: treasuryCookie, 'content-type': 'application/json' },
				body: '{}'
			});
			assert.equal(again.status, 409);

			const duplicate = await post(ownerCookie, '/payments/upload', paymentBody('22223333', 60));
			assert.equal(duplicate.status, 409);

			const file = await fetch(`${base}/api/v1/payments/${payment.id}/voucher`, {
				headers: { cookie: treasuryCookie }
			});
			assert.equal(file.status, 200);
			assert.equal(file.headers.get('content-type'), 'application/pdf');
			assert.equal(
				Buffer.from(await file.arrayBuffer())
					.subarray(0, 5)
					.toString(),
				'%PDF-'
			);

			const second = await post(ownerCookie, '/mining/declarations', {
				periodYear: 2024,
				periodMonth: 2,
				activityType: 'EXTRACCION',
				materialType: 'Grava',
				volumeCubicMeters: 10,
				commercialValuePerUnit: 100,
				bankReferenceNumber: '12340000',
				bankAccountId: MINERO,
				voucher
			});
			const secondId = (await second.json()).declaration.id;
			const secondPay = await post(
				ownerCookie,
				'/payments/upload',
				paymentBody('33334444', 60, {
					relatedKind: 'MINING_DECLARATION',
					relatedId: secondId
				})
			);
			const secondPaymentId = (await secondPay.json()).payment.id;
			const missingReason = await fetch(`${base}/api/v1/payments/${secondPaymentId}/reject`, {
				method: 'PATCH',
				headers: { cookie: treasuryCookie, 'content-type': 'application/json' },
				body: JSON.stringify({})
			});
			assert.equal(missingReason.status, 400);
			const rejected = await fetch(`${base}/api/v1/payments/${secondPaymentId}/reject`, {
				method: 'PATCH',
				headers: { cookie: treasuryCookie, 'content-type': 'application/json' },
				body: JSON.stringify({ rejectionReason: 'La referencia no aparece en el banco.' })
			});
			assert.equal(rejected.status, 200);
			const rejectedBody = await rejected.json();
			assert.equal(rejectedBody.payment.status, 'RECHAZADO');
			assert.match(rejectedBody.notice.body, /La referencia no aparece/);
			const blocked = await fetch(`${base}/api/v1/mining/declarations/${secondId}/pdf`, {
				headers: { cookie: ownerCookie }
			});
			assert.equal(blocked.status, 409);
			const mine = await fetch(`${base}/api/v1/payments/mine`, {
				headers: { cookie: ownerCookie }
			});
			const mineBody = await mine.json();
			const noticed = mineBody.payments.find((item) => item.id === secondPaymentId);
			assert.equal(noticed.notice.subject.includes('33334444'), true);

			const approved = await post(cookie(admin), `/mining/declarations/${declaration.id}/resolve`, {
				decision: 'APROBAR'
			});
			assert.equal(approved.status, 409);

			const third = await post(ownerCookie, '/mining/declarations', {
				periodYear: 2024,
				periodMonth: 3,
				activityType: 'PROCESAMIENTO',
				materialType: 'Piedra',
				volumeCubicMeters: 10,
				commercialValuePerUnit: 100,
				bankReferenceNumber: '12340001',
				bankAccountId: MINERO,
				voucher
			});
			const thirdDeclaration = (await third.json()).declaration;
			assert.equal(third.status, 201);
			const resolved = await post(
				cookie(admin),
				`/mining/declarations/${thirdDeclaration.id}/resolve`,
				{
					decision: 'APROBAR'
				}
			);
			assert.equal(resolved.status, 200);
			const linked = await post(
				ownerCookie,
				'/payments/upload',
				paymentBody('44445555', 50, {
					relatedKind: 'MINING_DECLARATION',
					relatedId: thirdDeclaration.id
				})
			);
			assert.equal(linked.status, 201);
			const undo = await fetch(
				`${base}/api/v1/payments/${(await linked.json()).payment.id}/reject`,
				{
					method: 'PATCH',
					headers: { cookie: treasuryCookie, 'content-type': 'application/json' },
					body: JSON.stringify({ rejectionReason: 'Intento tardío.' })
				}
			);
			assert.equal(undo.status, 409);
			const still = await fetch(`${base}/api/v1/mining/declarations/${thirdDeclaration.id}/pdf`, {
				headers: { cookie: ownerCookie }
			});
			assert.equal(still.status, 200);

			const serial = randomUUID();
			await client.query(
				`INSERT INTO electronic_stamps (
					uuid_code, taxpayer_id, amount_eur, bcv_rate_applied, amount_ved, qr_payload, status
				)
				SELECT $1, id, 1, 25, 25, '{}', 'ACTIVO' FROM taxpayers WHERE user_id = $2`,
				[serial, owner]
			);
			const stampPay = await post(
				ownerCookie,
				'/payments/upload',
				paymentBody('55556666', 25, {
					taxType: 'TIMBRE_FISCAL',
					bankAccountId: TIMBRE,
					relatedKind: 'ELECTRONIC_STAMP',
					relatedId: serial
				})
			);
			assert.equal(stampPay.status, 201);
			const stampRejected = await fetch(
				`${base}/api/v1/payments/${(await stampPay.json()).payment.id}/reject`,
				{
					method: 'PATCH',
					headers: { cookie: treasuryCookie, 'content-type': 'application/json' },
					body: JSON.stringify({ rejectionReason: 'Transferencia inexistente.' })
				}
			);
			assert.equal(stampRejected.status, 200);
			const stamp = await client.query(
				`SELECT status FROM electronic_stamps WHERE uuid_code = $1`,
				[serial]
			);
			assert.equal(stamp.rows[0].status, 'ANULADO');
		} finally {
			client.release();
		}
	});
});

let baseUrl = '';

function cookie(userId) {
	return `satet_session=${signSessionToken(userId)}`;
}

function post(cookieHeader, path, body) {
	return fetch(`${baseUrl}/api/v1${path}`, {
		method: 'POST',
		headers: { cookie: cookieHeader, 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

/** @param {string} reference @param {number} amount @param {Record<string, unknown>} [extra] */
function paymentBody(reference, amount, extra = {}) {
	return {
		taxType: 'MINERO',
		bankAccountId: MINERO,
		bankReferenceNumber: reference,
		originBank: 'Banesco',
		paymentDate: '2026-10-29',
		amountPaidVed: amount,
		voucher,
		...extra
	};
}

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
