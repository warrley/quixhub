import { disciplines } from '@/data/mock';

// Parked for a future catalog picker that lets students add a discipline
// directly by code or by name instead of free-text entry — the IRA page
// currently only accepts free-text names, but this grouping is what a
// by-code/by-name picker would need, so it doesn't have to be rebuilt.
export const disciplinesBySemester = disciplines.reduce((groups, d) => {
  const list = groups.get(d.semester) ?? [];
  list.push(d);
  groups.set(d.semester, list);
  return groups;
}, new Map<string, typeof disciplines>());
