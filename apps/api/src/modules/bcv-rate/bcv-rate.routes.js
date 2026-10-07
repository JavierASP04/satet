import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import * as controller from './bcv-rate.controller.js';

export const bcvRateRouter = Router();

bcvRateRouter.get('/current', authenticate, controller.getCurrent);
