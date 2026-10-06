import { Router } from 'express';
import type { HealthResponse } from '@satet/shared';
import { pingDatabase } from '../../db/pool.ts';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
	const body: HealthResponse = {
		status: 'ok',
		service: 'satet-api',
		database: (await pingDatabase()) ? 'up' : 'down',
		timestamp: new Date().toISOString()
	};
	res.json(body);
});
