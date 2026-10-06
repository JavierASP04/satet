import { Router } from 'express';
import { PERMISSIONS } from '@satet/shared';
import { authenticate } from '../../middleware/authenticate.ts';
import { authorize } from '../../middleware/authorize.ts';
import * as controller from './mining.controller.ts';

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
