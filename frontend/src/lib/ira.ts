import { disciplines } from '@/data/mock';
import type { IraEntry } from '@/data/types';

/**
 * Weighted average of grade by workload: IRA = Σ(nota_i × CH_i) / Σ(CH_i).
 * This is an approximation of UFC's official IRA — the real SIGAA formula also
 * factors in each class's standard deviation, which isn't available client-side.
 * Entries without a final grade (em_andamento) are excluded.
 */
export function computeIra(entries: IraEntry[]): number | null {
  const graded = entries.filter(
    (e) => e.situacao !== 'em_andamento' && Number.isFinite(e.grade) && e.workload > 0,
  );
  if (graded.length === 0) return null;
  const totalCH = graded.reduce((sum, e) => sum + e.workload, 0);
  if (totalCH === 0) return null;
  const weighted = graded.reduce((sum, e) => sum + e.grade * e.workload, 0);
  return Number((weighted / totalCH).toFixed(4));
}

const DIACRITICS = /[̀-ͯ]/g;

function normalize(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(DIACRITICS, '');
}

export function resolveDisciplineId(name: string): string | undefined {
  const target = normalize(name);
  return disciplines.find((d) => normalize(d.name) === target)?.id;
}
