import { PERMISSIONS } from '@satet/shared';
import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './users.controller.js';
import { createVerifierSchema } from './users.schema.js';

export const usersRouter = Router();

usersRouter.use(authenticate);
usersRouter.use(authorize(PERMISSIONS.USUARIOS_CREAR));

usersRouter.get('/verificadores', controller.listVerifiers);
usersRouter.post('/verificadores', validate(createVerifierSchema), controller.createVerifier);
