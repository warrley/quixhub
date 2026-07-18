import express, { urlencoded } from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import cookieParser from "cookie-parser";

import { authRouter } from "./modules/auth/auth.routes.js";
import { calendarRouter } from "./modules/calendar/calendar.routes.js";
import { disciplinesRouter } from "./modules/disciplines/disciplines.routes.js";
import { feedbackRouter } from "./modules/feedback/feedback.routes.js";
import { materialsRouter } from "./modules/materials/materials.routes.js";
import { offeringsRouter } from "./modules/offerings/offerings.routes.js";
import { openapiDocument } from "./docs/openapi.js";

const server = express();
dotenv.config();

server.use(cors({ origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000', credentials: true }));
server.use(helmet());
server.use(express.json());
server.use(urlencoded({ extended: true }));
server.use(cookieParser());

server.get('/api/health', (_req, res) => res.json({ ok: true }));
server.get('/api/docs', (_req, res) => res.json(openapiDocument));

server.use('/api/auth', authRouter);
server.use('/api/disciplines', disciplinesRouter);
server.use('/api/materials', materialsRouter);
server.use('/api/offerings', offeringsRouter);
server.use('/api/feedback', feedbackRouter);
server.use('/api/calendar', calendarRouter);


const port = process.env.PORT ?? 4000;
server.listen(port, () => {
  console.log(`QuixHub backend listening on http://localhost:${port}`);
});
