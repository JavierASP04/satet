import cors from 'cors';
import express from 'express';
import { API_PREFIX } from '@satet/shared';
import { env } from './config/env.ts';
import { errorHandler } from './middleware/error-handler.ts';
import { notFound } from './middleware/not-found.ts';
import { healthRouter } from './modules/health/health.routes.ts';
import { apiRouter } from './routes.ts';

export function createApp() {
	const app = express();

	app.disable('x-powered-by');
	app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
	app.use(express.json({ limit: '1mb' }));

	app.use('/api/health', healthRouter);
	app.use(API_PREFIX, apiRouter);

	app.use(notFound);
	app.use(errorHandler);

	return app;
}
