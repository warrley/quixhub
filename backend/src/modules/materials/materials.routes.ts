import { Router } from 'express';
import multer from 'multer';
import { requireAdmin, requireAuth } from '../auth/auth.middleware.js';
import * as materialsController from './materials.controller.js';

export const materialsRouter = Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

materialsRouter.get('/', materialsController.listByDiscipline);
materialsRouter.get('/pending', requireAuth, requireAdmin, materialsController.pending);
materialsRouter.post('/', requireAuth, upload.single('file'), materialsController.create);
materialsRouter.get('/:id/download', requireAuth, materialsController.downloadMaterial);
materialsRouter.post('/:id/helpful', requireAuth, materialsController.helpful);
materialsRouter.post('/:id/approve', requireAuth, requireAdmin, materialsController.approve);
materialsRouter.post('/:id/reject', requireAuth, requireAdmin, materialsController.reject);
