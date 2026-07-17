import { writeFile } from 'node:fs/promises';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { AppError, asyncHandler } from '../../lib/errors.js';
import { buildObjectKey, ensureUploadDir, resolveStoragePath } from '../../lib/storage.js';
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

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const createMaterialSchema = z.object({
  disciplineId: z.string().min(1),
  type: z.enum(['prova', 'resumo', 'codigo', 'trabalho']),
  title: z.string().min(1),
  fileKind: z.string().min(1),
  note: z.string().optional(),
  anonymous: z.coerce.boolean().default(true),
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
  '/',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, 'file is required');
    const input = createMaterialSchema.parse(req.body);

    const storageKey = buildObjectKey(input.disciplineId, req.file.originalname);
    await ensureUploadDir(storageKey);
    await writeFile(resolveStoragePath(storageKey), req.file.buffer);

    const material = await createMaterial({ ...input, storageKey, uploaderId: req.user!.id });
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
    res.download(resolveStoragePath(material.storageKey), material.title);
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
