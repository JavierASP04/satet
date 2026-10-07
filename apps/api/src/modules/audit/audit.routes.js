import { Router } from 'express';
import { PERMISSIONS } from '@satet/shared';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import * as controller from './audit.controller.js';

export const auditRouter = Router();

auditRouter.get(
	'/logs',
	authenticate,
	authorize(PERMISSIONS.AUDITORIA_CONSULTAR),
	controller.listLogs
);
