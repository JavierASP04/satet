import { PERMISSIONS } from '@satet/shared';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './one-per-thousand.controller.js';
import { batchOrdersSchema, singleOrderSchema } from './one-per-thousand.schema.js';

export const onePerThousandRouter = Router();

onePerThousandRouter.use(authenticate);

onePerThousandRouter.post(
	'/batch',
	authorize(PERMISSIONS.DECLARACIONES_CREAR),
	validate(batchOrdersSchema),
	controller.createBatch
);
onePerThousandRouter.post(
	'/single',
	authorize(PERMISSIONS.DECLARACIONES_CREAR),
	validate(singleOrderSchema),
	controller.createSingle
);
onePerThousandRouter.get('/list', controller.list);
