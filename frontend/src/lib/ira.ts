import { disciplines } from '@/data/mock';
import type { IraEntry } from '@/data/types';

/**
 * Approximates UFC's IRA Individual: IRA = Σ(Ni × Ci × Pi) / (Σ(Ci × Pi) − T),
 * per prograd.ufc.br/pt/perguntas-frequentes/ira/. Ni = grade, Ci = workload,
 * Pi = min(6, how many semesters ago the discipline was taken — most recent
 * semester present in the entries counts as 1), T = raw (unweighted) CH of
 * "trancado" (withdrawn) entries.
 *
 * UNVERIFIED: the official formula is rendered as an image on that page, not
 * text, so it can't be scraped exactly. The Pi *direction* here (older
 * semesters weighted more) was picked because it landed closest (~0.05 off)
 * to a real transcript's printed IRA when checked against both directions —
 * it is not confirmed to be exactly UFC's formula. Also missing: UFC's
 * official IRA additionally applies a class-level standard deviation/mean
 * normalization for "IRA Geral" that isn't reproducible client-side.
 */
export function computeIra(entries: IraEntry[]): number | null {
  const usable = entries.filter((e) => e.situacao !== 'em_andamento');
  if (usable.length === 0) return null;

  const semesters = [...new Set(usable.map((e) => e.semester).filter((s): s is string => Boolean(s)))].sort((a, b) =>
    a.localeCompare(b),
  );
  const totalSemesters = semesters.length;

  function weight(semester: string | undefined): number {
    if (!semester) return 1;
    const ordinal = semesters.indexOf(semester) + 1; // 1-based, chronological
    const semestersAgo = totalSemesters - ordinal + 1; // most recent semester = 1
    return Math.min(6, semestersAgo);
  }

  let numerator = 0;
  let weightedCH = 0;
  let withdrawnCH = 0;

  for (const e of usable) {
    if (e.situacao === 'trancado') {
      withdrawnCH += e.workload;
      continue;
    }
    if (!Number.isFinite(e.grade) || e.workload <= 0) continue;
    const p = weight(e.semester);
    numerator += e.grade * e.workload * p;
    weightedCH += e.workload * p;
  }

  const denominator = weightedCH - withdrawnCH;
  if (denominator <= 0) return null;
  const ira = numerator / denominator;
  return Number(Math.max(0, Math.min(10, ira)).toFixed(4));
}

const DIACRITICS = /[̀-ͯ]/g;

function normalize(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(DIACRITICS, '');
}

export function resolveDisciplineId(name: string): string | undefined {
  const target = normalize(name);
  return disciplines.find((d) => normalize(d.name) === target)?.id;
}
