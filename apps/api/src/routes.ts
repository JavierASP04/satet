import { Router } from 'express';
import { auditRouter } from './modules/audit/audit.routes.ts';
import { authRouter } from './modules/auth/auth.routes.ts';
import { bcvRateRouter } from './modules/bcv-rate/bcv-rate.routes.ts';
import { miningRouter } from './modules/mining/mining.routes.ts';
import { onePerThousandRouter } from './modules/one-per-thousand/one-per-thousand.routes.ts';
import { paymentsRouter } from './modules/payments/payments.routes.ts';
import { reportsRouter } from './modules/reports/reports.routes.ts';
import { sarenRouter } from './modules/saren/saren.routes.ts';
import { stampsRouter } from './modules/stamps/stamps.routes.ts';
import { taxpayersRouter } from './modules/taxpayers/taxpayers.routes.ts';

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
