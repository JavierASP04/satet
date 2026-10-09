import { Router } from 'express';
import { PERMISSIONS } from '@satet/shared';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import * as controller from './one-per-thousand.controller.js';

export const onePerThousandRouter = Router();

onePerThousandRouter.use(authenticate);

onePerThousandRouter.post(
	'/batch',
	authorize(PERMISSIONS.DECLARACIONES_CREAR),
	controller.createBatch
);
onePerThousandRouter.post(
	'/single',
	authorize(PERMISSIONS.DECLARACIONES_CREAR),
	controller.createSingle
);
// Lectura: propias (contribuyente) o todas (analista); se resuelve en el controlador.
onePerThousandRouter.get('/list', controller.list);
