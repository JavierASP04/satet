import { Router } from 'express';
import { PERMISSIONS } from '@satet/shared';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import * as controller from './stamps.controller.js';

export const stampsRouter = Router();

stampsRouter.use(authenticate);

stampsRouter.post('/purchase', authorize(PERMISSIONS.TIMBRES_COMPRAR), controller.purchase);
stampsRouter.get('/:uuid/pdf', authorize(PERMISSIONS.TIMBRES_COMPRAR), controller.downloadPdf);
