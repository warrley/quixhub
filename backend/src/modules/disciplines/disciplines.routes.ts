import { Router } from 'express';
import { requireAdmin, requireAuth } from '../auth/auth.middleware.js';
import * as disciplinesController from './disciplines.controller.js';

export const disciplinesRouter = Router();

disciplinesRouter.get('/', disciplinesController.getDisciplines);
disciplinesRouter.get('/:id', disciplinesController.getDiscipline);
disciplinesRouter.post('/', requireAuth, requireAdmin, disciplinesController.create);
disciplinesRouter.patch('/:id', requireAuth, requireAdmin, disciplinesController.update);
