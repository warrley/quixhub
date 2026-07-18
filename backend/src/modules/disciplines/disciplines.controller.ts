import { RequestHandler } from 'express';
import { z } from 'zod';
import {
  createDiscipline,
  getDisciplineById,
  listDisciplines,
  updateDiscipline,
} from './disciplines.service.js';

const disciplineSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  workload: z.number().int().positive(),
  semester: z.string().min(1),
  description: z.string().min(1),
  prerequisites: z.array(z.string()).default([]),
  accent: z.enum(['accent', 'accent2', 'accent3', 'accent4']).default('accent'),
});

export const getDisciplines: RequestHandler = async (_req, res) => {
  res.json({ disciplines: await listDisciplines() });
};

export const getDiscipline: RequestHandler = async (req, res) => {
  const discipline = await getDisciplineById(req.params.id);
  if (!discipline) {
    res.status(404).json({ error: 'Discipline not found' });
    return;
  }
  res.json({ discipline });
};

export const create: RequestHandler = async (req, res) => {
  const safeData = disciplineSchema.safeParse(req.body);
  if (!safeData.success) {
    res.status(400).json({ error: safeData.error.flatten().fieldErrors });
    return;
  }

  const discipline = await createDiscipline(safeData.data);
  res.status(201).json({ discipline });
};

export const update: RequestHandler = async (req, res) => {
  const safeData = disciplineSchema.partial().safeParse(req.body);
  if (!safeData.success) {
    res.status(400).json({ error: safeData.error.flatten().fieldErrors });
    return;
  }

  const discipline = await updateDiscipline(req.params.id, safeData.data);
  if (!discipline) {
    res.status(404).json({ error: 'Discipline not found' });
    return;
  }
  res.json({ discipline });
};
