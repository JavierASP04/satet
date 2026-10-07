import { getPool } from './pool.js';

/** @param {(client: import('pg').PoolClient) => Promise<T>} fn @template T */
export async function withTransaction(fn) {
	const client = await getPool().connect();
	try {
		await client.query('BEGIN');
		const result = await fn(client);
		await client.query('COMMIT');
		return result;
	} catch (err) {
		try {
			await client.query('ROLLBACK');
		} catch (rollbackErr) {
			console.error('[api] Error al revertir la transacción:', rollbackErr);
		}
		throw err;
	} finally {
		client.release();
	}
}
