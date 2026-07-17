import { Router } from 'express';
import { z } from 'zod';
import { AppError, asyncHandler } from '../../lib/errors.js';
import { buildObjectKey, presignDownload, presignUpload } from '../../lib/storage.js';
import { requireAdmin, requireAuth } from '../auth/auth.middleware.js';
import {
  createMaterial,
  getMaterialById,
  listPending,
  listPublishedByDiscipline,
  markHelpful,
  setMaterialStatus,
} from './materials.service.js';

export const materialsRouter = Router();

const uploadUrlSchema = z.object({
  disciplineId: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
});

const createMaterialSchema = z.object({
  disciplineId: z.string().min(1),
  type: z.enum(['prova', 'resumo', 'codigo', 'trabalho']),
  title: z.string().min(1),
  fileKind: z.string().min(1),
  storageKey: z.string().min(1),
  note: z.string().optional(),
  anonymous: z.boolean().default(true),
});

materialsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const disciplineId = z.string().min(1).parse(req.query.disciplineId);
    res.json({ materials: await listPublishedByDiscipline(disciplineId) });
  }),
);

materialsRouter.get('/pending', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  res.json({ materials: await listPending() });
}));

materialsRouter.post(
  '/upload-url',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = uploadUrlSchema.parse(req.body);
    const storageKey = buildObjectKey(input.disciplineId, input.fileName);
    const uploadUrl = await presignUpload(storageKey, input.contentType);
    res.json({ uploadUrl, storageKey });
  }),
);

materialsRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = createMaterialSchema.parse(req.body);
    const material = await createMaterial({ ...input, uploaderId: req.user!.id });
    res.status(201).json({ material });
  }),
);

materialsRouter.get(
  '/:id/download',
  requireAuth,
  asyncHandler(async (req, res) => {
    const material = await getMaterialById(req.params.id);
    if (!material) throw new AppError(404, 'Material not found');
    const isOwnerOrAdmin = material.uploaderId === req.user!.id || req.user!.role === 'admin';
    if (material.status !== 'published' && !isOwnerOrAdmin) throw new AppError(404, 'Material not found');
    const downloadUrl = await presignDownload(material.storageKey);
    res.json({ downloadUrl });
  }),
);

materialsRouter.post(
  '/:id/helpful',
  requireAuth,
  asyncHandler(async (req, res) => {
    await markHelpful(req.params.id, req.user!.id);
    res.status(204).end();
  }),
);

materialsRouter.post(
  '/:id/approve',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const material = await setMaterialStatus(req.params.id, 'published');
    if (!material) throw new AppError(404, 'Material not found');
    res.json({ material });
  }),
);

materialsRouter.post(
  '/:id/reject',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const material = await setMaterialStatus(req.params.id, 'rejected');
    if (!material) throw new AppError(404, 'Material not found');
    res.json({ material });
  }),
);
