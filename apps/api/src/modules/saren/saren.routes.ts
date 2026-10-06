import { Router } from 'express';
import { PERMISSIONS } from '@satet/shared';
import { authenticate } from '../../middleware/authenticate.ts';
import { authorize } from '../../middleware/authorize.ts';
import * as controller from './saren.controller.ts';

export const sarenRouter = Router();

sarenRouter.use(authenticate, authorize(PERMISSIONS.TIMBRES_CONSUMIR));

sarenRouter.post('/verify-stamp', controller.verifyStamp);
sarenRouter.get('/history', controller.history);
