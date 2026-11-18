import {
  inStatusGroup,
  summarize,
  type CampusStudent,
  type GraduationTable,
  type StatusGroup,
  type Summary,
} from '@/lib/iraCampus';

/**
 * Campus-wide student IRA list is intentionally kept private and excluded
 * from Git and public client bundles. The 7 UFC Quixadá courses remain listed
 * so personal IRA tools, normalization, and course selectors keep working.
 */
export const CAMPUS_UPDATED_AT = '2026.1';

export const CAMPUS_COURSES: string[] = [
  'Ciência da Computação',
  'Design Digital',
  'Engenharia de Computação',
  'Engenharia de Software',
  'Inteligência Artificial',
  'Redes de Computadores',
  'Sistemas de Informação',
];

export const CAMPUS_STUDENTS: CampusStudent[] = [];

export const CAMPUS_GRADUATION: Record<string, GraduationTable> = {};

/** Every IRA in a course (or the whole campus when `course` is null) for a
 * status group. */
export function groupIras(course: string | null, group: StatusGroup): number[] {
  return CAMPUS_STUDENTS.filter((s) => (course === null || s.course === course) && inStatusGroup(s.status, group)).map(
    (s) => s.ira,
  );
}

const summaryCache = new Map<string, Summary | null>();

export function groupSummary(course: string | null, group: StatusGroup): Summary | null {
  const key = `${course ?? '*'}|${group}`;
  if (!summaryCache.has(key)) summaryCache.set(key, summarize(groupIras(course, group)));
  return summaryCache.get(key) ?? null;
}

export function isCampusCourse(course: string | null | undefined): course is string {
  return Boolean(course && CAMPUS_COURSES.includes(course));
}

// Older accounts were created with the cadastro's previous spelling.
const COURSE_ALIASES: Record<string, string> = { 'Engenharia da Computação': 'Engenharia de Computação' };

/** A user's stored course mapped onto the export's names, or null. */
export function normalizeCourse(course: string | null | undefined): string | null {
  const name = course ? (COURSE_ALIASES[course] ?? course) : null;
  return isCampusCourse(name) ? name : null;
}
