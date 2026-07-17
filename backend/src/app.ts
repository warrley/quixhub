import 'dotenv/config';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { errorMiddleware } from './lib/errors.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { calendarRouter } from './modules/calendar/calendar.routes.js';
import { disciplinesRouter } from './modules/disciplines/disciplines.routes.js';
import { feedbackRouter } from './modules/feedback/feedback.routes.js';
import { materialsRouter } from './modules/materials/materials.routes.js';
import { openapiDocument } from './docs/openapi.js';

export const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/docs', (_req, res) => res.json(openapiDocument));

app.use('/api/auth', authRouter);
app.use('/api/disciplines', disciplinesRouter);
app.use('/api/materials', materialsRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/calendar', calendarRouter);

app.use(errorMiddleware);
