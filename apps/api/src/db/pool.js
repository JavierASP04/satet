import pg from 'pg';
import { env } from '../config/env.js';

let pool;

/** Pool perezoso: la API arranca aunque PostgreSQL no esté disponible. Usar siempre SQL parametrizado. */
export function getPool() {
	pool ??= new pg.Pool({ connectionString: env.DATABASE_URL });
	return pool;
}

export async function pingDatabase() {
	try {
		await getPool().query('SELECT 1');
		return true;
	} catch {
		return false;
	}
}

export async function closePool() {
	await pool?.end();
	pool = undefined;
}
