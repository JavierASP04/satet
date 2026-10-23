import { Router } from 'express';
import { PERMISSIONS } from '@satet/shared';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import * as controller from './reports.controller.js';

export const reportsRouter = Router();

reportsRouter.use(authenticate, authorize(PERMISSIONS.DASHBOARD_POA));

reportsRouter.get('/revenue-summary', controller.revenueSummary);
reportsRouter.get('/export/excel', controller.exportExcel);
reportsRouter.get('/export/pdf', controller.exportPdf);
