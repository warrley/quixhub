import { writeFile } from 'node:fs/promises';
import { RequestHandler } from 'express';
import { z } from 'zod';
import { buildObjectKey, ensureUploadDir, resolveStoragePath } from '../../lib/storage.js';
import {
  createMaterial,
  getMaterialById,
  listPending,
  listPublishedByDiscipline,
  markHelpful,
  setMaterialStatus,
} from './materials.service.js';

const createMaterialSchema = z.object({
  disciplineId: z.string().min(1),
  type: z.enum(['prova', 'resumo', 'codigo', 'trabalho']),
  title: z.string().min(1),
  fileKind: z.string().min(1),
  note: z.string().optional(),
  anonymous: z.coerce.boolean().default(true),
});

export const listByDiscipline: RequestHandler = async (req, res) => {
  const safeData = z.string().min(1).safeParse(req.query.disciplineId);
  if (!safeData.success) {
    res.status(400).json({ error: safeData.error.flatten().fieldErrors });
    return;
  }
  res.json({ materials: await listPublishedByDiscipline(safeData.data) });
};

export const pending: RequestHandler = async (_req, res) => {
  res.json({ materials: await listPending() });
};

export const create: RequestHandler = async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'file is required' });
    return;
  }
  
  const safeData = createMaterialSchema.safeParse(req.body);
  if (!safeData.success) {
    res.status(400).json({ error: safeData.error.flatten().fieldErrors });
    return;
  }

  const input = safeData.data;
  const storageKey = buildObjectKey(input.disciplineId, req.file.originalname);
  await ensureUploadDir(storageKey);
  await writeFile(resolveStoragePath(storageKey), req.file.buffer);

  const material = await createMaterial({ ...input, storageKey, uploaderId: req.user!.id });
  res.status(201).json({ material });
};

export const downloadMaterial: RequestHandler = async (req, res) => {
  const material = await getMaterialById(req.params.id);
  if (!material) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }
  const isOwnerOrAdmin = material.uploaderId === req.user!.id || req.user!.role === 'admin';
  if (material.status !== 'published' && !isOwnerOrAdmin) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }
  res.download(resolveStoragePath(material.storageKey), material.title);
};

export const helpful: RequestHandler = async (req, res) => {
  await markHelpful(req.params.id, req.user!.id);
  res.status(204).end();
};

export const approve: RequestHandler = async (req, res) => {
  const material = await setMaterialStatus(req.params.id, 'published');
  if (!material) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }
  res.json({ material });
};

export const reject: RequestHandler = async (req, res) => {
  const material = await setMaterialStatus(req.params.id, 'rejected');
  if (!material) {
    res.status(404).json({ error: 'Material not found' });
    return;
  }
  res.json({ material });
};
