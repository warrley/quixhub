import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import * as offeringsController from './offerings.controller.js';

export const offeringsRouter = Router();

offeringsRouter.get('/search', offeringsController.searchOfferings);
offeringsRouter.get('/', offeringsController.listOfferings);
offeringsRouter.get('/:id', offeringsController.getOffering);
offeringsRouter.post('/', requireAuth, offeringsController.findOrCreate);
