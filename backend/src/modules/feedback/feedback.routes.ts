import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import * as feedbackController from './feedback.controller.js';

export const feedbackRouter = Router();

feedbackRouter.get('/:disciplineId/stats', feedbackController.getStats);
feedbackRouter.post('/', requireAuth, feedbackController.submit);
