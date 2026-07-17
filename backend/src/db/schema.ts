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
  professor: text('professor').notNull(),
  workload: integer('workload').notNull(),
  semester: text('semester').notNull(),
  description: text('description').notNull(),
  prerequisites: text('prerequisites').array().notNull().default([]),
  accent: disciplineAccentEnum('accent').notNull().default('accent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const materials = pgTable('materials', {
  id: uuid('id').primaryKey().defaultRandom(),
  disciplineId: text('discipline_id')
    .notNull()
    .references(() => disciplines.id, { onDelete: 'cascade' }),
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

// Structured, anonymous discipline feedback (see docs/vision.md — the
// professor-identity policy is still undecided, so this stays
// discipline-scoped only, no professor field). userId is stored only to
// enforce one submission per student per discipline and is never returned
// by the API — "anonymous" is an API-surface guarantee.
export const feedback = pgTable(
  'feedback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    disciplineId: text('discipline_id')
      .notNull()
      .references(() => disciplines.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rating: smallint('rating'),
    workload: text('workload').notNull(),
    examFormats: text('exam_formats').array().notNull().default([]),
    groupWork: boolean('group_work'),
    teachingStyle: text('teaching_style'),
    attendance: text('attendance'),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('feedback_discipline_user_unique').on(t.disciplineId, t.userId)],
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
  feedback: many(feedback),
  calendarEvents: many(calendarEvents),
}));

export const disciplinesRelations = relations(disciplines, ({ many }) => ({
  materials: many(materials),
  feedback: many(feedback),
  calendarEvents: many(calendarEvents),
}));

export const materialsRelations = relations(materials, ({ one, many }) => ({
  discipline: one(disciplines, { fields: [materials.disciplineId], references: [disciplines.id] }),
  uploader: one(users, { fields: [materials.uploaderId], references: [users.id] }),
  helpfulVotes: many(materialHelpfulVotes),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  discipline: one(disciplines, { fields: [feedback.disciplineId], references: [disciplines.id] }),
  user: one(users, { fields: [feedback.userId], references: [users.id] }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one, many }) => ({
  discipline: one(disciplines, { fields: [calendarEvents.disciplineId], references: [disciplines.id] }),
  linkedMaterial: one(materials, { fields: [calendarEvents.linkedMaterialId], references: [materials.id] }),
  createdBy: one(users, { fields: [calendarEvents.createdById], references: [users.id] }),
  confirmations: many(calendarConfirmations),
}));
