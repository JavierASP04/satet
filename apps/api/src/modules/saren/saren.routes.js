import { Router } from 'express';
import { PERMISSIONS } from '@satet/shared';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import * as controller from './saren.controller.js';

export const sarenRouter = Router();

sarenRouter.use(authenticate, authorize(PERMISSIONS.TIMBRES_CONSUMIR));

sarenRouter.post('/verify-stamp', controller.verifyStamp);
sarenRouter.get('/history', controller.history);
