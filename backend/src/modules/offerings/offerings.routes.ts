import { Router } from 'express';
import * as offeringsController from './offerings.controller.js';

export const offeringsRouter = Router();

offeringsRouter.get('/search', offeringsController.searchOfferings);
offeringsRouter.get('/', offeringsController.listOfferings);
offeringsRouter.get('/:id', offeringsController.getOffering);
