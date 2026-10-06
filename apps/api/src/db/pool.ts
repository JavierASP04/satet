import pg from 'pg';
import { env } from '../config/env.ts';

let pool: pg.Pool | undefined;

/** Pool perezoso: la API arranca aunque PostgreSQL no esté disponible. Usar siempre SQL parametrizado. */
export function getPool(): pg.Pool {
	pool ??= new pg.Pool({ connectionString: env.DATABASE_URL });
	return pool;
}

export async function pingDatabase(): Promise<boolean> {
	try {
		await getPool().query('SELECT 1');
		return true;
	} catch {
		return false;
	}
}

export async function closePool(): Promise<void> {
	await pool?.end();
	pool = undefined;
}
