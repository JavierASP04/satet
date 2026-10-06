import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.ts';
import * as controller from './bcv-rate.controller.ts';

export const bcvRateRouter = Router();

bcvRateRouter.get('/current', authenticate, controller.getCurrent);
