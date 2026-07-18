import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import * as feedbackController from './feedback.controller.js';

export const feedbackRouter = Router();

feedbackRouter.post('/', requireAuth, feedbackController.submit);
feedbackRouter.get('/offering/:offeringId/stats', feedbackController.offeringStats);
feedbackRouter.get('/offering/:offeringId/comments', feedbackController.offeringComments);
feedbackRouter.get('/discipline/:disciplineId', feedbackController.disciplineStats);
