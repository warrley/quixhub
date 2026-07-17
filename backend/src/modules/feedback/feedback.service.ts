import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { feedback } from '../../db/schema.js';

type NewFeedback = typeof feedback.$inferInsert;

export async function submitFeedback(input: NewFeedback) {
  const [row] = await db
    .insert(feedback)
    .values(input)
    .onConflictDoUpdate({
      target: [feedback.disciplineId, feedback.userId],
      set: {
        rating: input.rating,
        workload: input.workload,
        examFormats: input.examFormats,
        groupWork: input.groupWork,
        teachingStyle: input.teachingStyle,
        attendance: input.attendance,
        comment: input.comment,
      },
    })
    .returning();
  return row;
}

function mode(values: string[]): { value: string; percent: number } | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const [value, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return { value, percent: Math.round((n / values.length) * 100) };
}

// Mirrors frontend/src/data/types.ts FeedbackStat — one row per category,
// showing the most common answer and what share of respondents gave it.
export async function getFeedbackStats(disciplineId: string) {
  const rows = await db.query.feedback.findMany({ where: eq(feedback.disciplineId, disciplineId) });
  if (rows.length === 0) return [];

  const stats: { label: string; value: string; percent: number; tone: string }[] = [];

  const workload = mode(rows.map((r) => r.workload));
  if (workload) stats.push({ label: 'Carga de trabalho', ...workload, tone: 'var(--color-warn)' });

  const groupWorkRows = rows.filter((r) => r.groupWork !== null);
  if (groupWorkRows.length > 0) {
    const yes = groupWorkRows.filter((r) => r.groupWork).length;
    const percent = Math.round((yes / groupWorkRows.length) * 100);
    stats.push({
      label: 'Trabalho em grupo',
      value: percent >= 50 ? 'frequente' : 'raro',
      percent: percent >= 50 ? percent : 100 - percent,
      tone: 'var(--color-accent-2)',
    });
  }

  const teachingStyle = mode(rows.map((r) => r.teachingStyle).filter((v): v is string => !!v));
  if (teachingStyle) stats.push({ label: 'Uso de slides', ...teachingStyle, tone: 'var(--color-accent-3)' });

  const attendance = mode(rows.map((r) => r.attendance).filter((v): v is string => !!v));
  if (attendance) stats.push({ label: 'Frequência cobrada', ...attendance, tone: 'var(--color-accent)' });

  return stats;
}
