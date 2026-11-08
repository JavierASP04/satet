import { PERMISSIONS } from '@satet/shared';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './royalties.controller.js';
import {
	createRoyaltySchema,
	resolveRoyaltySchema,
	royaltyIdParamsSchema
} from './royalties.schema.js';

export const royaltiesRouter = Router();

royaltiesRouter.use(authenticate);

royaltiesRouter.post(
	'/',
	authorize(PERMISSIONS.DECLARACIONES_CREAR),
	validate(createRoyaltySchema),
	controller.createRoyalty
);
royaltiesRouter.get('/my', authorize(PERMISSIONS.DECLARACIONES_CREAR), controller.listMine);
royaltiesRouter.get(
	'/pending',
	authorize(PERMISSIONS.DECLARACIONES_RESOLVER),
	controller.listPending
);
royaltiesRouter.get('/:id/pdf', validate(royaltyIdParamsSchema, 'params'), controller.downloadPdf);
royaltiesRouter.post(
	'/:id/resolve',
	authorize(PERMISSIONS.DECLARACIONES_RESOLVER),
	validate(royaltyIdParamsSchema, 'params'),
	validate(resolveRoyaltySchema),
	controller.resolveRoyalty
);
