import { getPool } from '../../db/pool.js';

/** @param {unknown} value */
function iso(value) {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(String(value));
	return date.toISOString();
}

/** GET /audit/logs */
export async function listLogs(req, res) {
	const action = req.query.action ?? null;
	const table = req.query.table ?? null;
	const limit = req.query.limit ?? 100;
	const { rows } = await getPool().query(
		`SELECT a.id, a.user_id, u.email, a.action, a.table_affected, a.record_id,
		        a.old_values, a.new_values, a.ip_address, a.user_agent, a.created_at,
		        COUNT(*) OVER()::int AS total
		 FROM audit_logs a
		 LEFT JOIN users u ON u.id = a.user_id
		 WHERE ($1::text IS NULL OR a.action = $1)
		   AND ($2::text IS NULL OR a.table_affected = $2)
		 ORDER BY a.created_at DESC, a.id DESC
		 LIMIT $3`,
		[action, table, limit]
	);
	res.status(200).json({
		total: rows[0]?.total ?? 0,
		logs: rows.map((row) => ({
			id: row.id,
			createdAt: iso(row.created_at),
			action: row.action,
			tableAffected: row.table_affected,
			recordId: row.record_id,
			userId: row.user_id,
			email: row.email,
			ipAddress: row.ip_address,
			userAgent: row.user_agent,
			oldValues: row.old_values,
			newValues: row.new_values
		}))
	});
}
