import './env-setup-mining.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it, before, after } from 'node:test';
import pg from 'pg';
import { createApp } from '../src/app.js';
import { closePool, getPool } from '../src/db/pool.js';
import { miningFineEur, toMiningDeclaration } from '../src/lib/present.js';
import { signSessionToken } from '../src/modules/auth/session.js';

describe('sanción por declaración extemporánea', () => {
	it('informa 1000 euros si es extemporánea y cero si está en término, sin tocar el subtotal', () => {
		assert.equal(miningFineEur(true), '1000.00');
		assert.equal(miningFineEur(false), '0.00');

		const late = toMiningDeclaration({
			id: '11111111-1111-4111-8111-111111111111',
			taxpayer_id: '22222222-2222-4222-8222-222222222222',
			period_year: 2024,
			period_month: 1,
			activity_type: 'EXTRACCION',
			material_type: 'Arena',
			volume_cubic_meters: '2.00',
			commercial_value_per_unit: '100.00',
			applied_tax_rate: '10.00',
			subtotal_ved: '20.00',
			is_extemporaneous: true,
			declaration_date: new Date('2026-10-23T12:00:00.000Z'),
			status: 'PENDIENTE'
		});
		assert.equal(late.fineEur, '1000.00');
		assert.equal(late.subtotalVed, '20.00');
		assert.equal(late.isExtemporaneous, true);

		const onTime = toMiningDeclaration({
			...{
				id: late.id,
				taxpayer_id: late.taxpayerId,
				period_year: late.periodYear,
				period_month: late.periodMonth,
				activity_type: late.activityType,
				material_type: late.materialType,
				volume_cubic_meters: late.volumeCubicMeters,
				commercial_value_per_unit: late.commercialValuePerUnit,
				applied_tax_rate: late.appliedTaxRate,
				subtotal_ved: late.subtotalVed,
				is_extemporaneous: false,
				declaration_date: late.declarationDate,
				status: late.status
			}
		});
		assert.equal(onTime.fineEur, '0.00');
		assert.equal(onTime.subtotalVed, '20.00');
	});

	const adminUrl = 'postgres://satet:satet@localhost:5433/postgres';
	const databaseUrl = 'postgres://satet:satet@localhost:5433/satet_mining_test';
	/** @type {import('http').Server} */
	let server;
	let base;

	before(async () => {
		const admin = new pg.Client({ connectionString: adminUrl });
		await admin.connect();
		await admin.query(
			`SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = 'satet_mining_test' AND pid <> pg_backend_pid()`
		);
		await admin.query('DROP DATABASE IF EXISTS satet_mining_test');
		await admin.query('CREATE DATABASE satet_mining_test');
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

	it('al registrar una declaración fuera de lapso guarda el impuesto y marca la sanción', async () => {
		const client = await getPool().connect();
		try {
			const { rows } = await client.query(
				`INSERT INTO users (email, password_hash, role) VALUES ($1, $2, 'CONTRIBUYENTE') RETURNING id`,
				['mineria@satet.test', 'not-a-login']
			);
			const userId = rows[0].id;
			await client.query(
				`INSERT INTO taxpayers (
					user_id, doc_type, rif_number, company_name, fiscal_address, phone_number,
					legal_representative_name, legal_representative_dna, is_approved
				) VALUES ($1, 'RIF_JURIDICO', 'J-87654321-0', 'Cantera Andina C.A.', 'Av. Principal', '0271-0000000', 'Ana Pérez', 'V-12345678', TRUE)`,
				[userId]
			);

			const response = await fetch(`${base}/api/v1/mining/declarations`, {
				method: 'POST',
				headers: {
					cookie: `satet_session=${signSessionToken(userId)}`,
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					periodYear: 2024,
					periodMonth: 1,
					activityType: 'EXTRACCION',
					materialType: 'Arena',
					volumeCubicMeters: 2,
					commercialValuePerUnit: 100
				})
			});
			assert.equal(response.status, 201);
			const body = await response.json();
			assert.equal(body.declaration.isExtemporaneous, true);
			assert.equal(body.declaration.fineEur, '1000.00');
			assert.equal(Number(body.declaration.subtotalVed), 20);
			assert.notEqual(Number(body.declaration.subtotalVed), 1000);

			const onTime = toMiningDeclaration({
				id: body.declaration.id,
				taxpayer_id: body.declaration.taxpayerId,
				period_year: body.declaration.periodYear,
				period_month: body.declaration.periodMonth,
				activity_type: body.declaration.activityType,
				material_type: body.declaration.materialType,
				volume_cubic_meters: body.declaration.volumeCubicMeters,
				commercial_value_per_unit: body.declaration.commercialValuePerUnit,
				applied_tax_rate: body.declaration.appliedTaxRate,
				subtotal_ved: body.declaration.subtotalVed,
				is_extemporaneous: false,
				declaration_date: body.declaration.declarationDate,
				status: body.declaration.status
			});
			assert.equal(onTime.fineEur, '0.00');
			assert.equal(onTime.subtotalVed, body.declaration.subtotalVed);
		} finally {
			client.release();
		}
	});
});
