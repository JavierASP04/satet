import { Router } from 'express';
import { PERMISSIONS } from '@satet/shared';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './saren.controller.js';
import { historyQuerySchema, verifyStampSchema } from './saren.schema.js';

export const sarenRouter = Router();

sarenRouter.use(authenticate, authorize(PERMISSIONS.TIMBRES_CONSUMIR));

sarenRouter.post('/verify-stamp', validate(verifyStampSchema), controller.verifyStamp);
sarenRouter.get('/history', validate(historyQuerySchema, 'query'), controller.history);
