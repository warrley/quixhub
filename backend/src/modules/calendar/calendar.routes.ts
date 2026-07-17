import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/errors.js';
import { attachUserIfPresent, requireAuth } from '../auth/auth.middleware.js';
import { createEvent, listEvents, setConfirmation } from './calendar.service.js';

export const calendarRouter = Router();

const rangeSchema = z.object({ from: z.string().min(1), to: z.string().min(1) });

const createEventSchema = z.object({
  disciplineId: z.string().min(1),
  title: z.string().min(1),
  date: z.string().min(1),
  kind: z.enum(['prova', 'entrega', 'seminario']),
  linkedMaterialId: z.string().optional(),
});

calendarRouter.get(
  '/',
  attachUserIfPresent,
  asyncHandler(async (req, res) => {
    const range = rangeSchema.parse(req.query);
    res.json({ events: await listEvents(range, req.user?.id) });
  }),
);

calendarRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = createEventSchema.parse(req.body);
    const event = await createEvent({ ...input, createdById: req.user!.id });
    res.status(201).json({ event });
  }),
);

calendarRouter.post(
  '/:id/confirmation',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { confirmed } = z.object({ confirmed: z.boolean() }).parse(req.body);
    await setConfirmation(req.params.id, req.user!.id, confirmed);
    res.status(204).end();
  }),
);
