import { Router } from 'express';
import { PERMISSIONS } from '@satet/shared';
import { authenticate } from '../../middleware/authenticate.ts';
import { authorize } from '../../middleware/authorize.ts';
import * as controller from './reports.controller.ts';

export const reportsRouter = Router();

reportsRouter.use(authenticate, authorize(PERMISSIONS.DASHBOARD_POA));

reportsRouter.get('/revenue-summary', controller.revenueSummary);
reportsRouter.get('/export/excel', controller.exportExcel);
reportsRouter.get('/export/pdf', controller.exportPdf);
