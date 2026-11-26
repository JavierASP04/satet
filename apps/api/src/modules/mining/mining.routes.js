import { Router } from 'express';
import { PERMISSIONS } from '@satet/shared';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './mining.controller.js';
import {
	createDeclarationSchema,
	declarationIdParamsSchema,
	resolveSchema
} from './mining.schema.js';

export const miningRouter = Router();

miningRouter.use(authenticate);

miningRouter.post(
	'/declarations',
	authorize(PERMISSIONS.DECLARACIONES_CREAR),
	validate(createDeclarationSchema),
	controller.createDeclaration
);
miningRouter.get(
	'/declarations/my',
	authorize(PERMISSIONS.DECLARACIONES_CREAR),
	controller.listMyDeclarations
);
miningRouter.get(
	'/declarations/pending',
	authorize(PERMISSIONS.DECLARACIONES_RESOLVER),
	controller.listPending
);
miningRouter.get(
	'/declarations/:id/pdf',
	validate(declarationIdParamsSchema, 'params'),
	controller.downloadPdf
);
miningRouter.post(
	'/declarations/:id/resolve',
	authorize(PERMISSIONS.DECLARACIONES_RESOLVER),
	validate(declarationIdParamsSchema, 'params'),
	validate(resolveSchema),
	controller.resolveDeclaration
);
miningRouter.get('/declarations/:id', controller.getDeclaration);
miningRouter.get(
	'/extemporaneous',
	authorize(PERMISSIONS.DECLARACIONES_SUPERVISAR),
	controller.listExtemporaneous
);
