import { Router } from 'express';
import { PERMISSIONS } from '@satet/shared';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './audit.controller.js';
import { auditQuerySchema } from './audit.schema.js';

export const auditRouter = Router();

auditRouter.get(
	'/logs',
	authenticate,
	authorize(PERMISSIONS.AUDITORIA_CONSULTAR),
	validate(auditQuerySchema, 'query'),
	controller.listLogs
);
