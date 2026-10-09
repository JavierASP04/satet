import { Router } from 'express';
import { PERMISSIONS } from '@satet/shared';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import * as controller from './bcv-rate.controller.js';

export const bcvRateRouter = Router();

// La especificación no marca un rol. Se usa el permiso de comprar timbre:
// es la operación que multiplica euros por la tasa del día (contribuyente y admin).
bcvRateRouter.get(
	'/current',
	authenticate,
	authorize(PERMISSIONS.TIMBRES_COMPRAR),
	controller.getCurrent
);
