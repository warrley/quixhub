'use client';

import { FlaskConical, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import type { IraEntry } from '@/data/types';
import { computeIra } from '@/lib/ira';
import { percentileBelow, semesterIndex, semesterLabel, type StatusGroup } from '@/lib/iraCampus';
import { groupIras } from '@/lib/iraCampusData';
import { clampIra } from '@/lib/statistics';
import { fmt, ordinal, pct } from './chartFormat';

const WORKLOAD_CHOICES = [128, 192, 256, 320, 384];

function nextSemesterAfter(entries: IraEntry[]): string {
  let maxIdx = 0;
  for (const e of entries) {
    const idx = semesterIndex(e.semester);
    if (idx !== null && idx > maxIdx) maxIdx = idx;
  }
  return maxIdx > 0 ? semesterLabel(maxIdx + 1) : '2026.2';
}

function computeSimulatedIra(entries: IraEntry[], nextGrade: number, nextWorkload: number): number | null {
  if (entries.length === 0) return null;
  const synthetic: IraEntry = {
    id: '__sim__',
    disciplineName: 'Simulação',
    grade: nextGrade,
    workload: nextWorkload,
    situacao: nextGrade < 5 ? 'reprovado' : 'aprovado',
    source: 'manual',
    semester: nextSemesterAfter(entries),
  };
  return computeIra([...entries, synthetic]);
}

/**
 * Interactive "what-if" strip: lets the student slide their expected average
 * and workload for the next semester, computes the projected IRA with the real
 * formula (`computeIra`), and exposes `simulatedIra` so the main chart can
 * draw a live ghost marker.
 */
export function IraWhatIfSimulator({
  entries,
  currentIra,
  course,
  group,
  active,
  grade,
  workload,
  onToggle,
  onGradeChange,
  onWorkloadChange,
}: {
  entries: IraEntry[];
  currentIra: number;
  course: string | null;
  group: StatusGroup;
  active: boolean;
  grade: number;
  workload: number;
  onToggle: (active: boolean) => void;
  onGradeChange: (grade: number) => void;
  onWorkloadChange: (workload: number) => void;
}) {
  const simulatedIra = useMemo(
    () => (active ? computeSimulatedIra(entries, grade, workload) : null),
    [active, entries, grade, workload],
  );

  const values = useMemo(() => groupIras(course, group), [course, group]);

  const currentDisplay = clampIra(currentIra);
  const simDisplay = simulatedIra !== null ? clampIra(simulatedIra) : null;
  const delta = simDisplay !== null ? simDisplay - currentDisplay : 0;

  const currentRank = values.filter((v) => v > currentDisplay).length + 1;
  const simRank = simDisplay !== null ? values.filter((v) => v > simDisplay).length + 1 : null;
  const simPct = simDisplay !== null ? percentileBelow(values, simDisplay) : null;

  return (
    <div className="mt-4 pt-4 border-t border-line">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => onToggle(!active)}
          className="inline-flex items-center gap-2 font-heading font-semibold text-12-5 text-ink hover:text-accent cursor-pointer transition-colors"
        >
          <FlaskConical size={15} className={active ? 'text-accent-2-dark' : 'text-ink-3'} aria-hidden />
          <span>Simulador &ldquo;E se no próximo semestre…&rdquo;</span>
          <span
            className={`text-10-5 px-2 py-0.5 rounded-full ${
              active ? 'bg-accent-2-tint text-accent-2-dark' : 'bg-surface-sunken text-ink-3'
            }`}
          >
            {active ? 'ativo no gráfico' : 'abrir'}
          </span>
        </button>

        {active && (
          <button
            type="button"
            onClick={() => onToggle(false)}
            className="inline-flex items-center gap-1 text-11-5 text-ink-3 hover:text-ink cursor-pointer"
          >
            <RotateCcw size={12} aria-hidden />
            Limpar simulação
          </button>
        )}
      </div>

      {active && (
        <div className="mt-3 p-3.5 rounded-md bg-surface-sunken border border-line grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-4 items-center">
          <div className="min-w-0">
            <div className="flex items-center justify-between text-12 mb-1.5">
              <span className="text-ink-2 font-medium">Média esperada no próximo semestre</span>
              <span className="font-heading font-bold text-14-5 text-accent-2-dark tabular-nums">{fmt(grade, 1)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={grade}
              onChange={(e) => onGradeChange(Number(e.target.value))}
              aria-label="Média esperada no próximo semestre"
              className="w-full accent-[var(--color-accent-2-dark)] cursor-pointer"
            />
            <div className="flex justify-between text-10 text-ink-3 mt-0.5">
              <span>0.0</span>
              <span>5.0</span>
              <span>10.0</span>
            </div>
          </div>

          <label className="flex flex-col gap-1 text-11-5 text-ink-2">
            Carga horária
            <select
              value={workload}
              onChange={(e) => onWorkloadChange(Number(e.target.value))}
              className="font-heading font-semibold text-12-5 text-ink bg-surface border border-line rounded-md py-1.5 px-2.5 cursor-pointer hover:border-accent focus:border-accent outline-none"
            >
              {WORKLOAD_CHOICES.map((ch) => (
                <option key={ch} value={ch}>
                  {ch}h ({Math.round(ch / 64)} disc.)
                </option>
              ))}
            </select>
          </label>

          {simDisplay !== null && simRank !== null && simPct !== null && (
            <div className="flex items-center gap-4 md:border-l md:border-line md:pl-4">
              <div>
                <div className="text-10 text-ink-3 uppercase tracking-wide font-semibold">IRA projetado</div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-heading font-extrabold text-19 text-accent-2-dark tabular-nums">
                    {simDisplay.toFixed(4)}
                  </span>
                  <span
                    className={`text-11 font-bold tabular-nums ${
                      delta > 0.0005 ? 'text-good' : delta < -0.0005 ? 'text-danger' : 'text-ink-3'
                    }`}
                  >
                    {delta >= 0 ? '+' : ''}
                    {delta.toFixed(4)}
                  </span>
                </div>
              </div>
              <div className="text-11-5 text-ink-2">
                <div>
                  Posição: <b className="text-ink">{ordinal(simRank)}</b>
                  {simRank !== currentRank && (
                    <span className={simRank < currentRank ? 'text-good font-semibold' : 'text-danger font-semibold'}>
                      {' '}
                      ({simRank < currentRank ? `+${currentRank - simRank}` : `${currentRank - simRank}`})
                    </span>
                  )}
                </div>
                <div>
                  Supera <b className="text-ink">{pct(simPct)}</b>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
