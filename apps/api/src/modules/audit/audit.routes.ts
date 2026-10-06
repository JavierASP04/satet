import { Router } from 'express';
import { PERMISSIONS } from '@satet/shared';
import { authenticate } from '../../middleware/authenticate.ts';
import { authorize } from '../../middleware/authorize.ts';
import * as controller from './audit.controller.ts';

export const auditRouter = Router();

auditRouter.get(
	'/logs',
	authenticate,
	authorize(PERMISSIONS.AUDITORIA_CONSULTAR),
	controller.listLogs
);
