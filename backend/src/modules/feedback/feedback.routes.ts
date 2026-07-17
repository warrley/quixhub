import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../lib/errors.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { getFeedbackStats, submitFeedback } from './feedback.service.js';

export const feedbackRouter = Router();

const submitSchema = z.object({
  disciplineId: z.string().min(1),
  rating: z.number().int().min(1).max(5).optional(),
  workload: z.string().min(1),
  examFormats: z.array(z.string()).default([]),
  groupWork: z.boolean().optional(),
  teachingStyle: z.string().optional(),
  attendance: z.string().optional(),
  comment: z.string().optional(),
});

feedbackRouter.get(
  '/:disciplineId/stats',
  asyncHandler(async (req, res) => {
    res.json({ stats: await getFeedbackStats(req.params.disciplineId) });
  }),
);

feedbackRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = submitSchema.parse(req.body);
    // One submission per student per discipline — resubmitting updates it
    // rather than creating a duplicate (see feedback.service submitFeedback).
    await submitFeedback({ ...input, userId: req.user!.id });
    res.status(201).json({ ok: true });
  }),
);
