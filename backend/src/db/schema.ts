import { relations } from 'drizzle-orm';
import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', ['student', 'admin']);
export const disciplineAccentEnum = pgEnum('discipline_accent', ['accent', 'accent2', 'accent3', 'accent4']);
export const materialTypeEnum = pgEnum('material_type', ['prova', 'resumo', 'codigo', 'trabalho']);
export const materialStatusEnum = pgEnum('material_status', ['published', 'pending', 'rejected']);
export const calendarKindEnum = pgEnum('calendar_kind', ['prova', 'entrega', 'seminario']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  course: text('course'),
  role: userRoleEnum('role').notNull().default('student'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Catalog data — course code, workload, prerequisites (free-text names, matched
// best-effort by the frontend's fluxograma builder rather than an FK chain,
// since prerequisites are often taken from disciplines outside this catalog).
export const disciplines = pgTable('disciplines', {
  id: text('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  workload: integer('workload').notNull(),
  semester: text('semester').notNull(),
  description: text('description').notNull(),
  prerequisites: text('prerequisites').array().notNull().default([]),
  accent: disciplineAccentEnum('accent').notNull().default('accent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// A discipline can run as several offerings across semesters/professors
// (e.g. "Estrutura de Dados" taught by two different professors in 2026.1).
// Feedback and materials can optionally scope to one of these.
export const offerings = pgTable(
  'offerings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    disciplineId: text('discipline_id')
      .notNull()
      .references(() => disciplines.id, { onDelete: 'cascade' }),
    professor: text('professor').notNull(),
    semester: text('semester').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('offering_disc_prof_sem').on(t.disciplineId, t.professor, t.semester)],
);

export const materials = pgTable('materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  disciplineId: text('discipline_id')
    .notNull()
    .references(() => disciplines.id, { onDelete: 'cascade' }),
  offeringId: uuid('offering_id').references(() => offerings.id, { onDelete: 'set null' }),
  uploaderId: uuid('uploader_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: materialTypeEnum('type').notNull(),
  title: text('title').notNull(),
  fileKind: text('file_kind').notNull(),
  storageKey: text('storage_key').notNull(),
  note: text('note'),
  anonymous: boolean('anonymous').notNull().default(true),
  status: materialStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Separate vote table (not a counter column) so a user can't inflate
// helpfulCount by re-clicking — count is derived via COUNT(*) on read.
export const materialHelpfulVotes = pgTable(
  'material_helpful_votes',
  {
    materialId: uuid('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.materialId, t.userId] })],
);

// Structured, anonymous feedback scoped to a discipline+professor+semester
// offering (see docs/vision.md — the professor-identity policy resolution).
// Deliberately no field judges the professor directly (no "teaching
// quality"/"rating" of the person) — only workload/logistics signals about
// the course as taught in that offering. voterHash = sha256(userId +
// offeringId + FEEDBACK_SALT) so the identity of the voter is irreversible
// without the server-only salt, and userId itself is never stored.
export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    offeringId: uuid('offering_id')
      .notNull()
      .references(() => offerings.id, { onDelete: 'cascade' }),
    voterHash: text('voter_hash').notNull(),
    materialQuality: smallint('material_quality'),
    examDifficulty: smallint('exam_difficulty'),
    workDifficulty: smallint('work_difficulty'),
    attendance: text('attendance'),
    groupWork: text('group_work'),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('feedback_offering_voter_unique').on(t.offeringId, t.voterHash)],
);

export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  disciplineId: text('discipline_id')
    .notNull()
    .references(() => disciplines.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  date: date('date').notNull(),
  kind: calendarKindEnum('kind').notNull(),
  linkedMaterialId: uuid('linked_material_id').references(() => materials.id, { onDelete: 'set null' }),
  createdById: uuid('created_by_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Per-user attendance confirmation — "confirmations" count and the
// requesting user's own "confirmed" flag are both derived from this table.
export const calendarConfirmations = pgTable(
  'calendar_confirmations',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => calendarEvents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.userId] })],
);

export const usersRelations = relations(users, ({ many }) => ({
  materials: many(materials),
  calendarEvents: many(calendarEvents),
}));

export const disciplinesRelations = relations(disciplines, ({ many }) => ({
  offerings: many(offerings),
  materials: many(materials),
  calendarEvents: many(calendarEvents),
}));

export const offeringsRelations = relations(offerings, ({ one, many }) => ({
  discipline: one(disciplines, { fields: [offerings.disciplineId], references: [disciplines.id] }),
  feedback: many(feedback),
  materials: many(materials),
}));

export const materialsRelations = relations(materials, ({ one, many }) => ({
  discipline: one(disciplines, { fields: [materials.disciplineId], references: [disciplines.id] }),
  offering: one(offerings, { fields: [materials.offeringId], references: [offerings.id] }),
  uploader: one(users, { fields: [materials.uploaderId], references: [users.id] }),
  helpfulVotes: many(materialHelpfulVotes),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  offering: one(offerings, { fields: [feedback.offeringId], references: [offerings.id] }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one, many }) => ({
  discipline: one(disciplines, { fields: [calendarEvents.disciplineId], references: [disciplines.id] }),
  linkedMaterial: one(materials, { fields: [calendarEvents.linkedMaterialId], references: [materials.id] }),
  createdBy: one(users, { fields: [calendarEvents.createdById], references: [users.id] }),
  confirmations: many(calendarConfirmations),
}));
