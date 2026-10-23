import './env-setup-stamps.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { describe, it, before, after } from 'node:test';
import pg from 'pg';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
import { createApp } from '../src/app.js';
import { closePool, getPool } from '../src/db/pool.js';
import { signSessionToken } from '../src/modules/auth/session.js';
import { createStampQrPng } from '../src/modules/stamps/stamps.pdf.js';
import { signStampQr, verifyStampQr } from '../src/modules/stamps/stamps.qr.js';

describe('firma del código QR', () => {
	it('firma y rechaza un monto alterado', () => {
		const qr = signStampQr({
			uuid: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
			rif: 'J-12345678-9',
			taxpayer: 'Constructora Trujillo C.A.',
			amountEur: '10.00',
			bcvRate: '41.2500',
			amountVed: '412.50',
			issuedAt: '2026-10-23T14:30:00.000Z'
		});
		const claims = verifyStampQr(qr);
		assert.equal(claims.amount_eur, 10);
		assert.equal(claims.bcv_rate, 41.25);
		assert.equal(claims.amount_ved, 412.5);
		assert.equal(claims.uuid, 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6');

		const tampered = JSON.parse(qr);
		tampered.amount_ved = 1;
		assert.equal(verifyStampQr(JSON.stringify(tampered)), null);
		assert.equal(verifyStampQr('no-es-json'), null);
	});

	it('el PNG del QR contiene el mismo texto firmado', async () => {
		const qr = signStampQr({
			uuid: 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6',
			rif: 'J-30012345-0',
			taxpayer: 'CONSTRUCTORA TRUJILLO C.A.',
			amountEur: 10,
			bcvRate: 41.25,
			amountVed: 412.5,
			issuedAt: '2026-10-15T10:30:00.000Z'
		});
		const png = await createStampQrPng(qr);
		const image = PNG.sync.read(png);
		const code = jsQR(new Uint8ClampedArray(image.data), image.width, image.height);
		assert.equal(code?.data, qr);
		assert.ok(verifyStampQr(code.data));
	});
});

describe('emisión de timbres', () => {
	const adminUrl = 'postgres://satet:satet@localhost:5433/postgres';
	const databaseUrl = 'postgres://satet:satet@localhost:5433/satet_stamps_test';
	/** @type {import('http').Server} */
	let server;
	let base;

	before(async () => {
		const admin = new pg.Client({ connectionString: adminUrl });
		await admin.connect();
		await admin.query(
			`SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = 'satet_stamps_test' AND pid <> pg_backend_pid()`
		);
		await admin.query('DROP DATABASE IF EXISTS satet_stamps_test');
		await admin.query('CREATE DATABASE satet_stamps_test');
		await admin.end();

		const db = new pg.Client({ connectionString: databaseUrl });
		await db.connect();
		const schemaPath = new URL('../../../database/schema.sql', import.meta.url);
		await db.query(readFileSync(schemaPath, 'utf8'));
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
	});

	after(async () => {
		if (server) await new Promise((resolve) => server.close(resolve));
		await closePool();
	});

	it('rechaza sesión, cuerpo, aprobación y tasa, y devuelve un PDF con QR verificable', async () => {
		const client = await getPool().connect();
		try {
			const owner = await insertUser(client, 'dueno@timbres.test', 'CONTRIBUYENTE');
			const other = await insertUser(client, 'otro@timbres.test', 'CONTRIBUYENTE');
			const saren = await insertUser(client, 'saren@timbres.test', 'VERIFICADOR_SAREN');
			const admin = await insertUser(client, 'admin@timbres.test', 'ADMIN_SISTEMA');
			const ownerCookie = cookie(owner);
			const otherCookie = cookie(other);
			const sarenCookie = cookie(saren);
			const adminCookie = cookie(admin);

			const anonymous = await fetch(`${base}/api/v1/stamps/purchase`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ amountEur: 10 })
			});
			assert.equal(anonymous.status, 401);
			assert.equal((await anonymous.json()).error.code, 'UNAUTHORIZED');

			const forbidden = await fetch(`${base}/api/v1/stamps/purchase`, {
				method: 'POST',
				headers: { cookie: sarenCookie, 'content-type': 'application/json' },
				body: JSON.stringify({ amountEur: 10 })
			});
			assert.equal(forbidden.status, 403);
			assert.equal((await forbidden.json()).error.code, 'FORBIDDEN');

			const invalid = await fetch(`${base}/api/v1/stamps/purchase`, {
				method: 'POST',
				headers: { cookie: ownerCookie, 'content-type': 'application/json' },
				body: JSON.stringify({ amountEur: 1.001 })
			});
			assert.equal(invalid.status, 400);
			assert.equal((await invalid.json()).error.code, 'VALIDATION_ERROR');

			await insertTaxpayer(client, owner, 'J-12345678-9', 'Constructora Trujillo C.A.', false);
			const unapproved = await fetch(`${base}/api/v1/stamps/purchase`, {
				method: 'POST',
				headers: { cookie: ownerCookie, 'content-type': 'application/json' },
				body: JSON.stringify({ amountEur: 10 })
			});
			assert.equal(unapproved.status, 403);
			assert.equal((await unapproved.json()).error.code, 'FORBIDDEN');

			await client.query('UPDATE taxpayers SET is_approved = TRUE WHERE user_id = $1', [owner]);
			const noRate = await fetch(`${base}/api/v1/stamps/purchase`, {
				method: 'POST',
				headers: { cookie: ownerCookie, 'content-type': 'application/json' },
				body: JSON.stringify({ amountEur: 10 })
			});
			assert.equal(noRate.status, 404);
			assert.equal((await noRate.json()).error.code, 'NOT_FOUND');

			await client.query(
				`INSERT INTO bcv_rates (currency, rate_in_ved, effective_date)
				 VALUES ('EUR', 99.0000, (CURRENT_TIMESTAMP AT TIME ZONE 'America/Caracas')::date + 2)`
			);
			const futureOnly = await fetch(`${base}/api/v1/stamps/purchase`, {
				method: 'POST',
				headers: { cookie: ownerCookie, 'content-type': 'application/json' },
				body: JSON.stringify({ amountEur: 10 })
			});
			assert.equal(futureOnly.status, 404);

			await client.query(
				`INSERT INTO bcv_rates (currency, rate_in_ved, effective_date)
				 VALUES ('EUR', 41.2500, (CURRENT_TIMESTAMP AT TIME ZONE 'America/Caracas')::date)`
			);

			const bought = await fetch(`${base}/api/v1/stamps/purchase`, {
				method: 'POST',
				headers: { cookie: ownerCookie, 'content-type': 'application/json' },
				body: JSON.stringify({ amountEur: 10 })
			});
			assert.equal(bought.status, 201);
			const body = await bought.json();
			assert.equal(body.stamp.amountEur, '10.00');
			assert.equal(body.stamp.bcvRate, '41.2500');
			assert.equal(body.stamp.amountVed, '412.50');
			assert.equal(body.stamp.status, 'ACTIVO');
			assert.equal(body.stamp.rif, 'J-12345678-9');
			assert.equal(body.stamp.taxpayer, 'Constructora Trujillo C.A.');
			assert.equal(body.stamp.uuid[14], '4');
			assert.notEqual(body.stamp.id, body.stamp.uuid);

			const claims = verifyStampQr(body.stamp.qrPayload);
			assert.ok(claims);
			assert.equal(claims.uuid, body.stamp.uuid);
			assert.equal(claims.rif, body.stamp.rif);
			assert.equal(claims.taxpayer, body.stamp.taxpayer);
			assert.equal(claims.amount_eur, 10);
			assert.equal(claims.bcv_rate, 41.25);
			assert.equal(claims.amount_ved, 412.5);
			assert.equal(claims.issued_at, body.stamp.issuedAt);

			const pdfRes = await fetch(`${base}/api/v1/stamps/${body.stamp.uuid}/pdf`, {
				headers: { cookie: ownerCookie }
			});
			assert.equal(pdfRes.status, 200);
			assert.equal(pdfRes.headers.get('content-type'), 'application/pdf');
			assert.match(
				pdfRes.headers.get('content-disposition') ?? '',
				/attachment; filename="timbre-/
			);
			const pdf = Buffer.from(await pdfRes.arrayBuffer());
			assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
			const decoded = qrTextFromPdf(pdf);
			assert.equal(decoded, body.stamp.qrPayload);
			assert.equal(verifyStampQr(decoded).uuid, body.stamp.uuid);

			const stranger = await fetch(`${base}/api/v1/stamps/${body.stamp.uuid}/pdf`, {
				headers: { cookie: otherCookie }
			});
			assert.equal(stranger.status, 404);
			assert.equal((await stranger.json()).error.code, 'NOT_FOUND');

			const asAdmin = await fetch(`${base}/api/v1/stamps/${body.stamp.uuid}/pdf`, {
				headers: { cookie: adminCookie }
			});
			assert.equal(asAdmin.status, 200);

			const anonymousPdf = await fetch(`${base}/api/v1/stamps/${body.stamp.uuid}/pdf`);
			assert.equal(anonymousPdf.status, 401);

			const audits = await client.query(
				`SELECT count(*)::int AS n FROM audit_logs
				 WHERE table_affected = 'electronic_stamps' AND action = 'CREATE'`
			);
			assert.equal(audits.rows[0].n, 1);

			const rounded = await fetch(`${base}/api/v1/stamps/purchase`, {
				method: 'POST',
				headers: { cookie: ownerCookie, 'content-type': 'application/json' },
				body: JSON.stringify({ amountEur: 1.01 })
			});
			assert.equal(rounded.status, 201);
			const second = await rounded.json();
			assert.equal(second.stamp.amountVed, '41.66');
			assert.equal(verifyStampQr(second.stamp.qrPayload).amount_ved, 41.66);
		} finally {
			client.release();
		}
	});
});

/** @param {Buffer} pdf */
function qrTextFromPdf(pdf) {
	const latin = pdf.toString('latin1');
	const marker = '/Subtype /Image';
	let from = 0;
	while (from < latin.length) {
		const at = latin.indexOf(marker, from);
		if (at < 0) return null;
		const dictStart = latin.lastIndexOf('<<', at);
		const dictEnd = latin.indexOf('>>', at);
		const dict = latin.slice(dictStart, dictEnd);
		from = at + marker.length;
		if (!dict.includes('/ColorSpace /DeviceRGB')) continue;

		const width = Number(/\/Width (\d+)/.exec(dict)?.[1]);
		const height = Number(/\/Height (\d+)/.exec(dict)?.[1]);
		const length = Number(/\/Length (\d+)/.exec(dict)?.[1]);
		const streamAt = latin.indexOf('stream\n', dictEnd);
		const compressed = Buffer.from(latin.slice(streamAt + 7, streamAt + 7 + length), 'latin1');
		const raw = inflateSync(compressed);
		const pixels = new Uint8ClampedArray(width * height * 4);
		for (let source = 0, target = 0; source < raw.length; source += 3, target += 4) {
			pixels[target] = raw[source];
			pixels[target + 1] = raw[source + 1];
			pixels[target + 2] = raw[source + 2];
			pixels[target + 3] = 255;
		}
		const code = jsQR(pixels, width, height);
		if (code?.data) return code.data;
	}
	return null;
}

async function insertUser(client, email, role) {
	const { rows } = await client.query(
		`INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id`,
		[email, 'not-a-login', role]
	);
	return rows[0].id;
}

function cookie(userId) {
	return `satet_session=${signSessionToken(userId)}`;
}

async function insertTaxpayer(client, userId, rif, companyName, approved) {
	await client.query(
		`INSERT INTO taxpayers (
			user_id, doc_type, rif_number, company_name, fiscal_address, phone_number,
			legal_representative_name, legal_representative_dna, is_approved
		) VALUES ($1, 'RIF_JURIDICO', $2, $3, 'Av. Principal, Valera', '0271-1234567', 'Ana Pérez', 'V-12345678', $4)`,
		[userId, rif, companyName, approved]
	);
}
