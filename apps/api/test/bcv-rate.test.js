import './env-setup.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it, before, after } from 'node:test';
import pg from 'pg';
import { BCV_RATE_CRON, BCV_RATE_TIME_ZONE } from '@satet/shared';
import { createApp } from '../src/app.js';
import { closePool, getPool } from '../src/db/pool.js';
import { signSessionToken } from '../src/modules/auth/session.js';
import { runBcvRateJob, startBcvRateScheduler } from '../src/modules/bcv-rate/bcv-rate.job.js';
import {
	fetchOfficialBcvEuroRate,
	normalizeBcvRate,
	parseBcvEuroHtml
} from '../src/modules/bcv-rate/bcv-rate.source.js';
import {
	formatDateInTimeZone,
	msUntilNextDaily,
	parseDailyCron,
	shouldCatchUp
} from '../src/modules/bcv-rate/bcv-rate.time.js';

const ZONE = BCV_RATE_TIME_ZONE;
const FIXTURE = `
<div id="dolar"><strong> 400,00000000 </strong></div>
<div id="euro" class="col-sm-12 col-xs-12">
  <div class="field-content">
    <span> EUR </span>
    <strong class="strong-tb"> 979,07889220</strong>
  </div>
</div>
<div id="yuan"><strong> 130,46356341</strong></div>
Fecha Valor: <span content="2026-10-09T00:00:00-04:00">Viernes, 09 Octubre 2026</span>
`;

describe('lectura de la página del BCV', () => {
	it('toma el euro, ignora el dólar y redondea a 4 decimales', () => {
		assert.deepEqual(parseBcvEuroHtml(FIXTURE), { currency: 'EUR', rateInVed: '979.0789' });
	});

	it('acepta el ejemplo de la especificación y separadores de miles', () => {
		assert.equal(normalizeBcvRate('41,25000000'), '41.2500');
		assert.equal(normalizeBcvRate('1.234,56789'), '1234.5679');
		assert.equal(normalizeBcvRate('0,00005'), '0.0001');
	});

	it('rechaza vacío, cero y un monto que no cabe en NUMERIC(12,4)', () => {
		assert.throws(() => parseBcvEuroHtml('<div id="dolar"><strong>1</strong></div>'), /euro/);
		assert.throws(() => normalizeBcvRate('0,00004'), /mayor que cero/);
		assert.throws(() => normalizeBcvRate('99999999,99999'), /precisión/);
	});

	it('permite inyectar el HTML sin red', async () => {
		const fromHtml = await fetchOfficialBcvEuroRate({ html: FIXTURE });
		const fromRequest = await fetchOfficialBcvEuroRate({
			requestImpl: async () => ({ ok: true, status: 200, body: FIXTURE })
		});
		assert.equal(fromHtml.rateInVed, '979.0789');
		assert.equal(fromRequest.rateInVed, '979.0789');
		await assert.rejects(
			() =>
				fetchOfficialBcvEuroRate({
					requestImpl: async () => ({ ok: false, status: 503, body: '' })
				}),
			/HTTP 503/
		);
	});
});

describe('horario 18:00 America/Caracas', () => {
	it('interpreta el cron compartido', () => {
		assert.deepEqual(parseDailyCron(BCV_RATE_CRON), { minute: 0, hour: 18 });
		assert.throws(() => parseDailyCron('0 18 * * 1'), /minuto hora/);
	});

	it('calcula la próxima corrida y el día calendario', () => {
		const before = new Date('2026-10-08T21:59:30.000Z');
		assert.equal(formatDateInTimeZone(before, ZONE), '2026-10-08');
		assert.equal(shouldCatchUp(before, 18, 0, ZONE), false);
		assert.equal(msUntilNextDaily(before, 18, 0, ZONE), 30_000);

		const exact = new Date('2026-10-08T22:00:00.000Z');
		assert.equal(shouldCatchUp(exact, 18, 0, ZONE), true);
		assert.equal(msUntilNextDaily(exact, 18, 0, ZONE), 24 * 60 * 60 * 1000);

		const after = new Date('2026-10-08T22:30:00.000Z');
		assert.equal(msUntilNextDaily(after, 18, 0, ZONE), 23.5 * 60 * 60 * 1000);

		const lateUtc = new Date('2026-10-08T03:30:00.000Z');
		assert.equal(formatDateInTimeZone(lateUtc, ZONE), '2026-10-07');

		const monthEnd = new Date('2026-10-31T22:30:00.000Z');
		assert.equal(formatDateInTimeZone(monthEnd, ZONE), '2026-10-31');
		assert.equal(msUntilNextDaily(monthEnd, 18, 0, ZONE), 23.5 * 60 * 60 * 1000);
	});

	it('si ya pasaron las 18:00 recupera el día una vez y no deja el temporizador activo', async () => {
		let calls = 0;
		const stop = startBcvRateScheduler({
			run: async () => {
				calls += 1;
			},
			now: () => new Date('2026-10-08T22:30:00.000Z'),
			onError: () => {}
		});
		await new Promise((resolve) => setImmediate(resolve));
		stop();
		assert.equal(calls, 1);
	});
});

describe('persistencia y endpoint', () => {
	const adminUrl = 'postgres://satet:satet@localhost:5433/satet';
	const databaseUrl = 'postgres://satet:satet@localhost:5433/satet_bcv_test';
	/** @type {import('http').Server} */
	let server;
	let base;

	before(async () => {
		const admin = new pg.Client({ connectionString: adminUrl });
		await admin.connect();
		await admin.query(
			`SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = 'satet_bcv_test' AND pid <> pg_backend_pid()`
		);
		await admin.query('DROP DATABASE IF EXISTS satet_bcv_test');
		await admin.query('CREATE DATABASE satet_bcv_test');
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
		if (server) {
			await new Promise((resolve) => server.close(resolve));
		}
		await closePool();
	});

	it('guarda la tasa, no duplica el día y exige sesión y permiso', async () => {
		const client = await getPool().connect();
		try {
			const contribuyente = await insertUser(client, 'contribuyente@bcv.test', 'CONTRIBUYENTE');
			const adminUser = await insertUser(client, 'admin@bcv.test', 'ADMIN_SISTEMA');
			const saren = await insertUser(client, 'saren@bcv.test', 'VERIFICADOR_SAREN');
			const contribuyenteCookie = cookie(contribuyente);
			const adminCookie = cookie(adminUser);
			const sarenCookie = cookie(saren);

			const missing = await fetch(`${base}/api/v1/bcv-rate/current`, {
				headers: { cookie: contribuyenteCookie }
			});
			assert.equal(missing.status, 404);
			assert.equal((await missing.json()).error.code, 'NOT_FOUND');

			const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000);
			const first = await runBcvRateJob({
				fetchRate: async () => ({ currency: 'EUR', rateInVed: '10.0000' }),
				now: () => yesterday,
				log: () => {}
			});
			assert.equal(first.inserted, true);

			const today = await runBcvRateJob({
				fetchRate: async () => ({ currency: 'EUR', rateInVed: '41.2500' }),
				log: () => {}
			});
			assert.equal(today.inserted, true);
			assert.equal(today.row.rate_in_ved, '41.2500');

			const duplicate = await runBcvRateJob({
				fetchRate: async () => ({ currency: 'EUR', rateInVed: '99.9999' }),
				log: () => {}
			});
			assert.equal(duplicate.inserted, false);
			assert.equal(duplicate.row.rate_in_ved, '41.2500');
			assert.equal(duplicate.row.id, today.row.id);

			const counts = await client.query(
				`SELECT
           (SELECT count(*)::int FROM bcv_rates WHERE effective_date = $1) AS same_day,
           (SELECT count(*)::int FROM audit_logs WHERE table_affected = 'bcv_rates' AND action = 'CREATE') AS audits`,
				[today.row.effective_date]
			);
			assert.equal(counts.rows[0].same_day, 1);
			assert.equal(counts.rows[0].audits, 2);

			await client.query(
				`INSERT INTO bcv_rates (currency, rate_in_ved, effective_date)
         VALUES ('EUR', 50.0000, ($1::date + 2))`,
				[today.row.effective_date]
			);

			const current = await fetch(`${base}/api/v1/bcv-rate/current`, {
				headers: { cookie: contribuyenteCookie }
			});
			assert.equal(current.status, 200);
			const body = await current.json();
			assert.equal(body.rate.currency, 'EUR');
			assert.equal(body.rate.rateInVed, '41.2500');
			assert.equal(body.rate.effectiveDate, today.row.effective_date);
			assert.equal(body.rate.id, today.row.id);
			assert.match(body.rate.createdAt, /^\d{4}-\d{2}-\d{2}T/);

			const asAdmin = await fetch(`${base}/api/v1/bcv-rate/current`, {
				headers: { cookie: adminCookie }
			});
			assert.equal(asAdmin.status, 200);

			const anonymous = await fetch(`${base}/api/v1/bcv-rate/current`);
			assert.equal(anonymous.status, 401);
			assert.equal((await anonymous.json()).error.code, 'UNAUTHORIZED');

			const forbidden = await fetch(`${base}/api/v1/bcv-rate/current`, {
				headers: { cookie: sarenCookie }
			});
			assert.equal(forbidden.status, 403);
			assert.equal((await forbidden.json()).error.code, 'FORBIDDEN');

			const stamps = await fetch(`${base}/api/v1/stamps/purchase`, {
				method: 'POST',
				headers: { cookie: contribuyenteCookie, 'content-type': 'application/json' },
				body: '{}'
			});
			assert.equal(stamps.status, 501);
		} finally {
			client.release();
		}
	});
});

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
