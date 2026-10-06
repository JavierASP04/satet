import { Router } from 'express';
import { PERMISSIONS } from '@satet/shared';
import { authenticate } from '../../middleware/authenticate.ts';
import { authorize } from '../../middleware/authorize.ts';
import * as controller from './stamps.controller.ts';

export const stampsRouter = Router();

stampsRouter.use(authenticate);

stampsRouter.post('/purchase', authorize(PERMISSIONS.TIMBRES_COMPRAR), controller.purchase);
stampsRouter.get('/:uuid/pdf', authorize(PERMISSIONS.TIMBRES_COMPRAR), controller.downloadPdf);
