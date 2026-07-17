import { Router } from 'express';
import { attachUserIfPresent, requireAuth } from '../auth/auth.middleware.js';
import * as calendarController from './calendar.controller.js';

export const calendarRouter = Router();

calendarRouter.get('/', attachUserIfPresent, calendarController.getEvents);
calendarRouter.post('/', requireAuth, calendarController.create);
calendarRouter.post('/:id/confirmation', requireAuth, calendarController.confirmEvent);
