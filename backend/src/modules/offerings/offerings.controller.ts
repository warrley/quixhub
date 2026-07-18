import { RequestHandler } from 'express';
import { z } from 'zod';
import { findOrCreateOffering, getById, listByDiscipline, search } from './offerings.service.js';

export const listOfferings: RequestHandler = async (req, res) => {
  const safeData = z.string().min(1).safeParse(req.query.disciplineId);
  if (!safeData.success) {
    res.status(400).json({ error: safeData.error.flatten().fieldErrors });
    return;
  }
  res.json({ offerings: await listByDiscipline(safeData.data) });
};

export const searchOfferings: RequestHandler = async (req, res) => {
  // Empty query lists everything (used by the /opinioes screen's initial load).
  const safeData = z.string().optional().default('').safeParse(req.query.q);
  if (!safeData.success) {
    res.status(400).json({ error: safeData.error.flatten().fieldErrors });
    return;
  }
  res.json({ offerings: await search(safeData.data) });
};

export const getOffering: RequestHandler = async (req, res) => {
  const offering = await getById(req.params.id);
  if (!offering) {
    res.status(404).json({ error: 'Offering not found' });
    return;
  }
  res.json({ offering });
};

const findOrCreateSchema = z.object({
  disciplineId: z.string().min(1),
  professor: z.string().min(1),
  semester: z.string().regex(/^\d{4}\.\d$/, 'expected format YYYY.N, e.g. 2026.1'),
});

export const findOrCreate: RequestHandler = async (req, res) => {
  const safeData = findOrCreateSchema.safeParse(req.body);
  if (!safeData.success) {
    res.status(400).json({ error: safeData.error.flatten().fieldErrors });
    return;
  }
  const { disciplineId, professor, semester } = safeData.data;
  const offering = await findOrCreateOffering(disciplineId, professor, semester);
  res.status(201).json({ offering });
};
