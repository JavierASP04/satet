import { PERMISSIONS } from '@satet/shared';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './stamps.controller.js';
import { purchaseSchema } from './stamps.schema.js';

export const stampsRouter = Router();

stampsRouter.use(authenticate);

stampsRouter.post(
	'/purchase',
	authorize(PERMISSIONS.TIMBRES_COMPRAR),
	validate(purchaseSchema),
	controller.purchase
);
stampsRouter.get('/:uuid/pdf', authorize(PERMISSIONS.TIMBRES_COMPRAR), controller.downloadPdf);
