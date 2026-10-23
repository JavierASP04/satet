import { Router } from 'express';
import { PERMISSIONS } from '@satet/shared';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import * as controller from './payments.controller.js';

export const paymentsRouter = Router();

paymentsRouter.use(authenticate);

paymentsRouter.post('/upload', authorize(PERMISSIONS.PAGOS_REGISTRAR), controller.upload);
paymentsRouter.get('/pending', authorize(PERMISSIONS.PAGOS_CONCILIAR), controller.listPending);
paymentsRouter.patch('/:id/verify', authorize(PERMISSIONS.PAGOS_CONCILIAR), controller.verify);
paymentsRouter.patch('/:id/reject', authorize(PERMISSIONS.PAGOS_CONCILIAR), controller.reject);
