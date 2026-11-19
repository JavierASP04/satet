import './env-setup-saren.js';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { before, after, describe, it } from 'node:test';
import pg from 'pg';
import { createApp } from '../src/app.js';
import { closePool, getPool } from '../src/db/pool.js';
import { signSessionToken } from '../src/modules/auth/session.js';
import { signStampQr } from '../src/modules/stamps/stamps.qr.js';

describe('consumo único del timbre en el SAREN', () => {
	const adminUrl = 'postgres://satet:satet@localhost:5433/postgres';
	const databaseUrl = 'postgres://satet:satet@localhost:5433/satet_saren_test';
	/** @type {import('http').Server} */
	let server;

	before(async () => {
		const admin = new pg.Client({ connectionString: adminUrl });
		await admin.connect();
		await admin.query(
			`SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = 'satet_saren_test' AND pid <> pg_backend_pid()`
		);
		await admin.query('DROP DATABASE IF EXISTS satet_saren_test');
		await admin.query('CREATE DATABASE satet_saren_test');
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
		baseUrl = `http://127.0.0.1:${address.port}`;
	});

	after(async () => {
		if (server) await new Promise((resolve) => server.close(resolve));
		await closePool();
	});

	it('exige sesión y el permiso de consumir timbres', async () => {
		const anonymous = await fetch(`${baseUrl}/api/v1/saren/verify-stamp`, { method: 'POST' });
		assert.equal(anonymous.status, 401);

		const client = await getPool().connect();
		try {
			const contributor = await insertUser(client, 'mina@saren.test', 'CONTRIBUYENTE');
			const forbidden = await post(cookie(contributor), {
				officeName: 'Registro Principal de Trujillo',
				uuid: randomUUID()
			});
			assert.equal(forbidden.status, 403);
		} finally {
			client.release();
		}
	});

	it('no encuentra un serial inexistente y no lo audita', async () => {
		const client = await getPool().connect();
		try {
			const official = await insertUser(client, 'saren@saren.test', 'VERIFICADOR_SAREN');
			const before = await client.query('SELECT count(*)::int AS n FROM audit_logs');
			const missing = await post(cookie(official), {
				officeName: 'Registro Principal de Trujillo',
				uuid: randomUUID()
			});
			assert.equal(missing.status, 200);
			const body = await missing.json();
			assert.equal(body.success, false);
			assert.equal(body.code, 'NOT_FOUND');
			assert.equal(body.message, 'El timbre fiscal no existe en los registros oficiales.');
			const after = await client.query('SELECT count(*)::int AS n FROM audit_logs');
			assert.equal(after.rows[0].n, before.rows[0].n);
		} finally {
			client.release();
		}
	});

	it('consume el QR una sola vez y el segundo intento falla sin mover la fecha', async () => {
		const client = await getPool().connect();
		try {
			const owner = await insertUser(client, 'dueno@saren.test', 'CONTRIBUYENTE');
			const taxpayerId = await insertTaxpayer(client, owner, 'J-12345678-9', 'Cantera Andina C.A.');
			const official = await insertUser(client, 'notaria@saren.test', 'VERIFICADOR_SAREN');
			const stamp = await insertStamp(client, taxpayerId, {
				rif: 'J-12345678-9',
				taxpayer: 'Cantera Andina C.A.'
			});
			const officialCookie = cookie(official);
			const office = 'Registro Principal de Trujillo';

			const first = await post(officialCookie, { officeName: office, qrPayload: stamp.qr });
			assert.equal(first.status, 200);
			const consumed = await first.json();
			assert.equal(consumed.success, true);
			assert.equal(consumed.code, 'VALIDATED_AND_CONSUMED');
			assert.equal(
				consumed.message,
				'Timbre fiscal VÁLIDO. Ha sido marcado como CONSUMIDO en este momento.'
			);
			assert.equal(consumed.data.status, 'CONSUMIDO');
			assert.equal(consumed.data.uuid, stamp.uuid);
			assert.equal(consumed.data.rif, 'J-12345678-9');
			assert.equal(consumed.data.officeName, office);
			assert.equal(consumed.data.consumedBy, official);
			assert.ok(consumed.data.consumedAt);

			const row = await client.query(
				`SELECT status, consumed_at, saren_office_name FROM electronic_stamps WHERE uuid_code = $1`,
				[stamp.uuid]
			);
			assert.equal(row.rows[0].status, 'CONSUMIDO');
			const consumedAt = new Date(row.rows[0].consumed_at).toISOString();
			assert.equal(consumed.data.consumedAt, consumedAt);

			const second = await post(officialCookie, {
				officeName: 'Otra Notaría',
				qrPayload: stamp.qr
			});
			assert.equal(second.status, 200);
			const reused = await second.json();
			assert.equal(reused.success, false);
			assert.equal(reused.code, 'ALREADY_USED');
			assert.equal(
				reused.message,
				`ALERTA DE REUTILIZACIÓN: Este timbre ya fue consumido el ${consumedAt} en la oficina ${office}.`
			);

			const after = await client.query(
				`SELECT status, consumed_at, saren_office_name FROM electronic_stamps WHERE uuid_code = $1`,
				[stamp.uuid]
			);
			assert.equal(after.rows[0].status, 'CONSUMIDO');
			assert.equal(new Date(after.rows[0].consumed_at).toISOString(), consumedAt);
			assert.equal(after.rows[0].saren_office_name, office);

			const audits = await client.query(
				`SELECT action FROM audit_logs WHERE record_id = (
					SELECT id FROM electronic_stamps WHERE uuid_code = $1
				) ORDER BY created_at`,
				[stamp.uuid]
			);
			assert.deepEqual(
				audits.rows.map((entry) => entry.action),
				['CONSUME', 'REJECT']
			);

			const history = await fetch(
				`${baseUrl}/api/v1/saren/history?officeName=${encodeURIComponent(office)}`,
				{ headers: { cookie: officialCookie } }
			);
			assert.equal(history.status, 200);
			const listed = await history.json();
			assert.equal(listed.verifications.length, 1);
			assert.equal(listed.verifications[0].uuid, stamp.uuid);
			assert.equal(listed.verifications[0].officeName, office);
			assert.equal(listed.verifications[0].consumedByEmail, 'notaria@saren.test');

			const empty = await fetch(
				`${baseUrl}/api/v1/saren/history?officeName=${encodeURIComponent('Oficina que no existe')}`,
				{ headers: { cookie: officialCookie } }
			);
			assert.equal(empty.status, 200);
			assert.equal((await empty.json()).verifications.length, 0);
		} finally {
			client.release();
		}
	});

	it('rechaza un segundo consumo cuando el serial se escribe a mano', async () => {
		const client = await getPool().connect();
		try {
			const owner = await insertUser(client, 'manual@saren.test', 'CONTRIBUYENTE');
			const taxpayerId = await insertTaxpayer(client, owner, 'J-11111111-1', 'Manual C.A.');
			const official = await insertUser(client, 'manual-saren@saren.test', 'VERIFICADOR_SAREN');
			const stamp = await insertStamp(client, taxpayerId, {
				rif: 'J-11111111-1',
				taxpayer: 'Manual C.A.'
			});
			const officialCookie = cookie(official);

			const first = await post(officialCookie, {
				officeName: 'Notaría Primera',
				uuid: stamp.uuid
			});
			assert.equal(first.status, 200);
			assert.equal((await first.json()).code, 'VALIDATED_AND_CONSUMED');

			const second = await post(officialCookie, {
				officeName: 'Notaría Primera',
				uuid: stamp.uuid
			});
			assert.equal(second.status, 200);
			const reused = await second.json();
			assert.equal(reused.success, false);
			assert.equal(reused.code, 'ALREADY_USED');
			assert.match(reused.message, /ALERTA DE REUTILIZACIÓN/);
		} finally {
			client.release();
		}
	});

	it('no consume un timbre anulado ni uno cuyo QR no es íntegro', async () => {
		const client = await getPool().connect();
		try {
			const owner = await insertUser(client, 'anulado@saren.test', 'CONTRIBUYENTE');
			const taxpayerId = await insertTaxpayer(client, owner, 'J-22222222-2', 'Anulada C.A.');
			const official = await insertUser(client, 'anulado-saren@saren.test', 'VERIFICADOR_SAREN');
			const officialCookie = cookie(official);
			const annulled = await insertStamp(client, taxpayerId, {
				rif: 'J-22222222-2',
				taxpayer: 'Anulada C.A.',
				status: 'ANULADO'
			});
			const active = await insertStamp(client, taxpayerId, {
				rif: 'J-22222222-2',
				taxpayer: 'Anulada C.A.'
			});

			const blocked = await post(officialCookie, {
				officeName: 'Registro Mercantil',
				uuid: annulled.uuid
			});
			assert.equal(blocked.status, 200);
			const blockedBody = await blocked.json();
			assert.equal(blockedBody.success, false);
			assert.equal(blockedBody.code, 'ANNULLED');
			assert.equal(blockedBody.message, 'Este timbre fiscal fue anulado previamente.');
			const stillAnnulled = await client.query(
				`SELECT status, consumed_at FROM electronic_stamps WHERE uuid_code = $1`,
				[annulled.uuid]
			);
			assert.equal(stillAnnulled.rows[0].status, 'ANULADO');
			assert.equal(stillAnnulled.rows[0].consumed_at, null);

			const parsed = JSON.parse(active.qr);
			parsed.amount_eur = 99;
			const tampered = await post(officialCookie, {
				officeName: 'Registro Mercantil',
				qrPayload: JSON.stringify(parsed)
			});
			assert.equal(tampered.status, 400);
			const tamperedBody = await tampered.json();
			assert.equal(tamperedBody.error.code, 'VALIDATION_ERROR');
			const stillActive = await client.query(
				`SELECT status, consumed_at FROM electronic_stamps WHERE uuid_code = $1`,
				[active.uuid]
			);
			assert.equal(stillActive.rows[0].status, 'ACTIVO');
			assert.equal(stillActive.rows[0].consumed_at, null);

			const mismatched = await post(officialCookie, {
				officeName: 'Registro Mercantil',
				uuid: active.uuid,
				qrPayload: annulled.qr
			});
			assert.equal(mismatched.status, 400);
			const afterMismatch = await client.query(
				`SELECT status, consumed_at FROM electronic_stamps WHERE uuid_code = $1`,
				[active.uuid]
			);
			assert.equal(afterMismatch.rows[0].status, 'ACTIVO');
			assert.equal(afterMismatch.rows[0].consumed_at, null);

			await client.query(`UPDATE electronic_stamps SET qr_payload = 'roto' WHERE uuid_code = $1`, [
				active.uuid
			]);
			const broken = await post(officialCookie, {
				officeName: 'Registro Mercantil',
				uuid: active.uuid
			});
			assert.equal(broken.status, 500);
			const afterBroken = await client.query(
				`SELECT status, consumed_at FROM electronic_stamps WHERE uuid_code = $1`,
				[active.uuid]
			);
			assert.equal(afterBroken.rows[0].status, 'ACTIVO');
			assert.equal(afterBroken.rows[0].consumed_at, null);
		} finally {
			client.release();
		}
	});

	it('deja un solo consumo cuando dos oficinas escanean el mismo timbre a la vez', async () => {
		const client = await getPool().connect();
		try {
			const owner = await insertUser(client, 'carrera@saren.test', 'CONTRIBUYENTE');
			const taxpayerId = await insertTaxpayer(client, owner, 'J-33333333-3', 'Carrera C.A.');
			const firstOfficial = await insertUser(client, 'uno@saren.test', 'VERIFICADOR_SAREN');
			const secondOfficial = await insertUser(client, 'dos@saren.test', 'VERIFICADOR_SAREN');
			const stamp = await insertStamp(client, taxpayerId, {
				rif: 'J-33333333-3',
				taxpayer: 'Carrera C.A.'
			});

			const [left, right] = await Promise.all([
				post(cookie(firstOfficial), { officeName: 'Oficina Uno', qrPayload: stamp.qr }),
				post(cookie(secondOfficial), { officeName: 'Oficina Dos', qrPayload: stamp.qr })
			]);
			assert.equal(left.status, 200);
			assert.equal(right.status, 200);
			const bodies = await Promise.all([left.json(), right.json()]);
			const codes = bodies.map((body) => body.code).sort();
			assert.deepEqual(codes, ['ALREADY_USED', 'VALIDATED_AND_CONSUMED']);

			const row = await client.query(
				`SELECT status, consumed_at, saren_office_name FROM electronic_stamps WHERE uuid_code = $1`,
				[stamp.uuid]
			);
			assert.equal(row.rows[0].status, 'CONSUMIDO');
			assert.ok(row.rows[0].consumed_at);
			const winner = bodies.find((body) => body.code === 'VALIDATED_AND_CONSUMED');
			assert.equal(row.rows[0].saren_office_name, winner.data.officeName);
		} finally {
			client.release();
		}
	});
});

let baseUrl = '';

function cookie(userId) {
	return `satet_session=${signSessionToken(userId)}`;
}

function post(cookieHeader, body) {
	return fetch(`${baseUrl}/api/v1/saren/verify-stamp`, {
		method: 'POST',
		headers: { cookie: cookieHeader, 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

async function insertUser(client, email, role) {
	const { rows } = await client.query(
		`INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id`,
		[email, 'not-a-login', role]
	);
	return rows[0].id;
}

async function insertTaxpayer(client, userId, rif, companyName) {
	const { rows } = await client.query(
		`INSERT INTO taxpayers (
			user_id, doc_type, rif_number, company_name, fiscal_address, phone_number,
			legal_representative_name, legal_representative_dna, is_approved
		) VALUES ($1, 'RIF_JURIDICO', $2, $3, 'Av. Principal', '0271-0000000', 'Ana Pérez', 'V-12345678', TRUE)
		RETURNING id`,
		[userId, rif, companyName]
	);
	return rows[0].id;
}

async function insertStamp(client, taxpayerId, fields) {
	const uuid = randomUUID();
	const issuedAt = '2026-10-23T18:30:00.000Z';
	const qr = signStampQr({
		uuid,
		rif: fields.rif,
		taxpayer: fields.taxpayer,
		amountEur: '10.00',
		bcvRate: '41.2500',
		amountVed: '412.50',
		issuedAt
	});
	await client.query(
		`INSERT INTO electronic_stamps (
			uuid_code, taxpayer_id, amount_eur, bcv_rate_applied, amount_ved, qr_payload, status, created_at
		) VALUES ($1, $2, '10.00', '41.2500', '412.50', $3, $4, $5)`,
		[uuid, taxpayerId, qr, fields.status ?? 'ACTIVO', issuedAt]
	);
	return { uuid, qr };
}
