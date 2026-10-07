import { Router } from 'express';
import { auditRouter } from './modules/audit/audit.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { bcvRateRouter } from './modules/bcv-rate/bcv-rate.routes.js';
import { miningRouter } from './modules/mining/mining.routes.js';
import { onePerThousandRouter } from './modules/one-per-thousand/one-per-thousand.routes.js';
import { paymentsRouter } from './modules/payments/payments.routes.js';
import { reportsRouter } from './modules/reports/reports.routes.js';
import { sarenRouter } from './modules/saren/saren.routes.js';
import { stampsRouter } from './modules/stamps/stamps.routes.js';
import { taxpayersRouter } from './modules/taxpayers/taxpayers.routes.js';

export const apiRouter = Router();

// Módulo 01
apiRouter.use('/auth', authRouter);
apiRouter.use('/taxpayers', taxpayersRouter);
// Módulo 02
apiRouter.use('/mining', miningRouter);
// Módulo 03
apiRouter.use('/one-per-thousand', onePerThousandRouter);
// Módulo 04
apiRouter.use('/stamps', stampsRouter);
apiRouter.use('/bcv-rate', bcvRateRouter);
// Módulo 05
apiRouter.use('/payments', paymentsRouter);
// Módulo 06
apiRouter.use('/saren', sarenRouter);
// Módulo 07
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/audit', auditRouter);
