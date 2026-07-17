import { Router } from 'express';
import { z } from 'zod';
import { AppError, asyncHandler } from '../../lib/errors.js';
import { requireAdmin, requireAuth } from '../auth/auth.middleware.js';
import {
  createDiscipline,
  getDisciplineById,
  listDisciplines,
  updateDiscipline,
} from './disciplines.service.js';

export const disciplinesRouter = Router();

const disciplineSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  professor: z.string().min(1),
  workload: z.number().int().positive(),
  semester: z.string().min(1),
  description: z.string().min(1),
  prerequisites: z.array(z.string()).default([]),
  accent: z.enum(['accent', 'accent2', 'accent3', 'accent4']).default('accent'),
});

disciplinesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ disciplines: await listDisciplines() });
  }),
);

disciplinesRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const discipline = await getDisciplineById(req.params.id);
    if (!discipline) throw new AppError(404, 'Discipline not found');
    res.json({ discipline });
  }),
);

disciplinesRouter.post(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const input = disciplineSchema.parse(req.body);
    const discipline = await createDiscipline(input);
    res.status(201).json({ discipline });
  }),
);

disciplinesRouter.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const input = disciplineSchema.partial().parse(req.body);
    const discipline = await updateDiscipline(req.params.id, input);
    if (!discipline) throw new AppError(404, 'Discipline not found');
    res.json({ discipline });
  }),
);
