import { createApp } from './app.js';
import { env } from './config/env.js';
import { closePool } from './db/pool.js';

const app = createApp();

const server = app.listen(env.API_PORT, () => {
	console.log(`[api] SATET API escuchando en http://localhost:${env.API_PORT}`);
});

function shutdown(signal) {
	console.log(`[api] ${signal} recibido, cerrando...`);
	server.close(async () => {
		await closePool();
		process.exit(0);
	});
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
