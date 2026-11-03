import { Router } from 'express';
import { PERMISSIONS } from '@satet/shared';
import { taxpayerProfileSchema } from '../auth/auth.schema.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { approveSchema, taxpayerIdParamsSchema } from './taxpayers.schema.js';
import * as controller from './taxpayers.controller.js';

export const taxpayersRouter = Router();

taxpayersRouter.use(authenticate);

taxpayersRouter.get('/profile', authorize(PERMISSIONS.PERFIL_GESTIONAR), controller.getProfile);
taxpayersRouter.put(
	'/profile',
	authorize(PERMISSIONS.PERFIL_GESTIONAR),
	validate(taxpayerProfileSchema),
	controller.updateProfile
);
taxpayersRouter.get(
	'/pending',
	authorize(PERMISSIONS.CONTRIBUYENTES_APROBAR),
	controller.listPending
);
taxpayersRouter.patch(
	'/:id/approve',
	authorize(PERMISSIONS.CONTRIBUYENTES_APROBAR),
	validate(taxpayerIdParamsSchema, 'params'),
	validate(approveSchema),
	controller.approve
);
