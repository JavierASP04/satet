import { createApp } from './app.ts';
import { env } from './config/env.ts';
import { closePool } from './db/pool.ts';

const app = createApp();

const server = app.listen(env.API_PORT, () => {
	console.log(`[api] SATET API escuchando en http://localhost:${env.API_PORT}`);
});

function shutdown(signal: string) {
	console.log(`[api] ${signal} recibido, cerrando...`);
	server.close(async () => {
		await closePool();
		process.exit(0);
	});
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
