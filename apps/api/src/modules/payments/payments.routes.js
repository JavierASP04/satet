import { PERMISSIONS } from '@satet/shared';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './payments.controller.js';
import {
	paymentIdParamsSchema,
	pendingQuerySchema,
	rejectSchema,
	uploadSchema
} from './payments.schema.js';

export const paymentsRouter = Router();

paymentsRouter.use(authenticate);

paymentsRouter.post(
	'/upload',
	authorize(PERMISSIONS.PAGOS_REGISTRAR),
	validate(uploadSchema),
	controller.upload
);
paymentsRouter.get(
	'/pending',
	authorize(PERMISSIONS.PAGOS_CONCILIAR),
	validate(pendingQuerySchema, 'query'),
	controller.listPending
);
paymentsRouter.get('/mine', authorize(PERMISSIONS.PAGOS_REGISTRAR), controller.listMine);
paymentsRouter.get(
	'/:id/voucher',
	validate(paymentIdParamsSchema, 'params'),
	controller.downloadVoucher
);
paymentsRouter.patch(
	'/:id/verify',
	authorize(PERMISSIONS.PAGOS_CONCILIAR),
	validate(paymentIdParamsSchema, 'params'),
	controller.verify
);
paymentsRouter.patch(
	'/:id/reject',
	authorize(PERMISSIONS.PAGOS_CONCILIAR),
	validate(paymentIdParamsSchema, 'params'),
	validate(rejectSchema),
	controller.reject
);
paymentsRouter.get('/:id', validate(paymentIdParamsSchema, 'params'), controller.getOne);
