import { RequestHandler } from 'express';
import { z } from 'zod';
import { getFeedbackStats, submitFeedback } from './feedback.service.js';

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

export const getStats: RequestHandler = async (req, res) => {
  res.json({ stats: await getFeedbackStats(req.params.disciplineId) });
};

export const submit: RequestHandler = async (req, res) => {
  const safeData = submitSchema.safeParse(req.body);
  if (!safeData.success) {
    res.status(400).json({ error: safeData.error.flatten().fieldErrors });
    return;
  }

  // One submission per student per discipline — resubmitting updates it
  // rather than creating a duplicate (see feedback.service submitFeedback).
  await submitFeedback({ ...safeData.data, userId: req.user!.id });
  res.status(201).json({ ok: true });
};
