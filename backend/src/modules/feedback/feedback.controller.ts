import { RequestHandler } from 'express';
import { z } from 'zod';
import {
  getComments,
  getDisciplineStats,
  getOfferingStats,
  submitFeedback,
} from './feedback.service.js';

const submitSchema = z.object({
  offeringId: z.string().uuid(),
  materialQuality: z.number().int().min(1).max(5).optional(),
  examDifficulty: z.number().int().min(1).max(5).optional(),
  workDifficulty: z.number().int().min(1).max(5).optional(),
  attendance: z.enum(['sempre', 'as_vezes', 'nao_cobra']).optional(),
  groupWork: z.enum(['frequente', 'raro', 'nao_tem']).optional(),
  comment: z.string().max(2000).optional(),
});

export const submit: RequestHandler = async (req, res) => {
  const safeData = submitSchema.safeParse(req.body);
  if (!safeData.success) {
    res.status(400).json({ error: safeData.error.flatten().fieldErrors });
    return;
  }

  const { offeringId, ...input } = safeData.data;
  // One submission per student per offering — resubmitting updates it rather
  // than creating a duplicate (see feedback.service submitFeedback).
  await submitFeedback(req.user!.id, offeringId, input);
  res.status(201).json({ ok: true });
};

export const offeringStats: RequestHandler = async (req, res) => {
  res.json({ stats: await getOfferingStats(req.params.offeringId) });
};

export const offeringComments: RequestHandler = async (req, res) => {
  res.json({ comments: await getComments(req.params.offeringId) });
};

export const disciplineStats: RequestHandler = async (req, res) => {
  res.json({ professors: await getDisciplineStats(req.params.disciplineId) });
};
