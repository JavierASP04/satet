import { Router } from 'express';
import { pingDatabase } from '../../db/pool.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
	res.json({
		status: 'ok',
		service: 'satet-api',
		database: (await pingDatabase()) ? 'up' : 'down',
		timestamp: new Date().toISOString()
	});
});
