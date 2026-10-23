import { createApp } from './app.js';
import { env } from './config/env.js';
import { closePool } from './db/pool.js';
import { startBcvRateScheduler } from './modules/bcv-rate/bcv-rate.job.js';

const app = createApp();
const stopBcvScheduler = env.NODE_ENV === 'test' ? () => {} : startBcvRateScheduler();

const server = app.listen(env.API_PORT, () => {
	console.log(`[api] SATET API escuchando en http://localhost:${env.API_PORT}`);
});

function shutdown(signal) {
	console.log(`[api] ${signal} recibido, cerrando...`);
	stopBcvScheduler();
	server.close(async () => {
		await closePool();
		process.exit(0);
	});
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
