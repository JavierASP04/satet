import { PERMISSIONS } from '@satet/shared';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './bank-accounts.controller.js';

export const bankAccountsRouter = Router();

bankAccountsRouter.use(authenticate);
bankAccountsRouter.get('/', validate(controller.listQuerySchema, 'query'), controller.list);
bankAccountsRouter.post(
	'/',
	authorize(PERMISSIONS.CUENTAS_GESTIONAR),
	validate(controller.createAccountSchema),
	controller.create
);
