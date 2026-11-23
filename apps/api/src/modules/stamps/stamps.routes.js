import { PERMISSIONS } from '@satet/shared';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './stamps.controller.js';
import { purchaseSchema, resolveStampSchema, stampUuidParamsSchema } from './stamps.schema.js';

export const stampsRouter = Router();

stampsRouter.get('/public/:uuid', controller.publicView);

stampsRouter.use(authenticate);

stampsRouter.get('/fees', authorize(PERMISSIONS.TIMBRES_COMPRAR), controller.listFees);
stampsRouter.post(
	'/purchase',
	authorize(PERMISSIONS.TIMBRES_COMPRAR),
	validate(purchaseSchema),
	controller.purchase
);
stampsRouter.get('/pending', authorize(PERMISSIONS.TIMBRES_RESOLVER), controller.listPending);
stampsRouter.post(
	'/:uuid/resolve',
	authorize(PERMISSIONS.TIMBRES_RESOLVER),
	validate(stampUuidParamsSchema, 'params'),
	validate(resolveStampSchema),
	controller.resolveStamp
);
stampsRouter.get('/:uuid/pdf', authorize(PERMISSIONS.TIMBRES_COMPRAR), controller.downloadPdf);
