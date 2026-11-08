/**
 * Inserta una fila de auditoría dentro de la misma transacción que la mutación.
 * @param {import('pg').PoolClient} client
 * @param {{
 *   userId: string | null,
 *   action: string,
 *   tableAffected: string,
 *   recordId: string,
 *   oldValues: unknown,
 *   newValues: unknown,
 *   ipAddress: string,
 *   userAgent: string | null
 * }} entry
 */
export async function writeAudit(client, entry) {
	await client.query(
		`INSERT INTO audit_logs (
       user_id, action, table_affected, record_id, old_values, new_values, ip_address, user_agent
     ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7, $8)`,
		[
			entry.userId,
			entry.action,
			entry.tableAffected,
			entry.recordId,
			entry.oldValues == null ? null : JSON.stringify(entry.oldValues),
			entry.newValues == null ? null : JSON.stringify(entry.newValues),
			entry.ipAddress,
			entry.userAgent
		]
	);
}
