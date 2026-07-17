import { RequestHandler } from 'express';
import { z } from 'zod';
import { createEvent, listEvents, setConfirmation } from './calendar.service.js';

const rangeSchema = z.object({ from: z.string().min(1), to: z.string().min(1) });

const createEventSchema = z.object({
  disciplineId: z.string().min(1),
  title: z.string().min(1),
  date: z.string().min(1),
  kind: z.enum(['prova', 'entrega', 'seminario']),
  linkedMaterialId: z.string().optional(),
});

export const getEvents: RequestHandler = async (req, res) => {
  const safeData = rangeSchema.safeParse(req.query);
  if (!safeData.success) {
    res.status(400).json({ error: safeData.error.flatten().fieldErrors });
    return;
  }
  res.json({ events: await listEvents(safeData.data, req.user?.id) });
};

export const create: RequestHandler = async (req, res) => {
  const safeData = createEventSchema.safeParse(req.body);
  if (!safeData.success) {
    res.status(400).json({ error: safeData.error.flatten().fieldErrors });
    return;
  }

  const event = await createEvent({ ...safeData.data, createdById: req.user!.id });
  res.status(201).json({ event });
};

export const confirmEvent: RequestHandler = async (req, res) => {
  const safeData = z.object({ confirmed: z.boolean() }).safeParse(req.body);
  if (!safeData.success) {
    res.status(400).json({ error: safeData.error.flatten().fieldErrors });
    return;
  }

  await setConfirmation(req.params.id, req.user!.id, safeData.data.confirmed);
  res.status(204).end();
};
