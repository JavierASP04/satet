import { Router } from 'express';
import { PERMISSIONS } from '@satet/shared';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import * as controller from './mining.controller.js';

export const miningRouter = Router();

miningRouter.use(authenticate);

miningRouter.post(
	'/declarations',
	authorize(PERMISSIONS.DECLARACIONES_CREAR),
	controller.createDeclaration
);
miningRouter.get(
	'/declarations/my',
	authorize(PERMISSIONS.DECLARACIONES_CREAR),
	controller.listMyDeclarations
);
// Lectura: dueño de la declaración o analista (se resuelve en el controlador).
miningRouter.get('/declarations/:id', controller.getDeclaration);
miningRouter.get(
	'/extemporaneous',
	authorize(PERMISSIONS.DECLARACIONES_SUPERVISAR),
	controller.listExtemporaneous
);
