'use client';

import { useMemo } from 'react';
import type { IraEntry } from '@/data/types';
import { computeSemesterComposition, type TreemapDiscipline, type TreemapSemester } from '@/lib/ira';
import { squarify } from '@/lib/treemap';
import { fmt } from './chartFormat';
import { impactTone, type TreemapSizing } from './personalColors';

interface SizedDiscipline {
  discipline: TreemapDiscipline;
  value: number;
}

interface SizedSemester {
  semester: TreemapSemester;
  items: SizedDiscipline[];
  value: number;
}

/**
 * Nested 2D Squarified Treemap:
 * - Outer cells partition the canvas across all semesters so every period
 *   stays visible with its recency weight (`1×–6×`) and net IRA delta.
 * - Inner cells partition each semester by either `impacto` (marginal |Δ| on
 *   IRA) or `notaPeso` (CH × weight × grade), colored dynamically via `impactTone`.
 */
export function TreemapPlot({
  entries,
  sizing,
  activeId,
  onHover,
  onSelect,
  large = false,
}: {
  entries: IraEntry[];
  sizing: TreemapSizing;
  activeId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  large?: boolean;
}) {
  const layout = useMemo(() => {
    const semesters = computeSemesterComposition(entries);
    if (semesters.length === 0) return null;

    const allDisciplines = semesters.flatMap((s) => s.disciplines);
    const maxAbsDelta = Math.max(0.0005, ...allDisciplines.map((d) => Math.abs(d.delta)));
    const hasNonZeroDelta = allDisciplines.some((d) => Math.abs(d.delta) >= 0.0005);
    const maxSemAbsDelta = Math.max(0.0005, ...semesters.map((s) => Math.abs(s.delta)));

    const useImpactSizing = sizing === 'impacto' && hasNonZeroDelta;

    const rawSemesters: SizedSemester[] = semesters.map((sem) => {
      const items: SizedDiscipline[] = sem.disciplines.map((d) => {
        const value = useImpactSizing
          ? Math.pow(Math.abs(d.delta) / maxAbsDelta, 0.85) + 0.1
          : d.effectiveWeight * Math.pow(Math.max(1.5, d.situacao === 'trancado' ? 4 : d.grade) / 10, 1.6);
        return { discipline: d, value: Math.max(0.01, value) };
      });
      const discSum = items.reduce((acc, it) => acc + it.value, 0);
      const rawValue = useImpactSizing
        ? discSum * (0.65 + 0.35 * (Math.abs(sem.delta) / maxSemAbsDelta))
        : discSum;
      return { semester: sem, items, value: rawValue };
    });

    const totalRaw = Math.max(0.001, rawSemesters.reduce((acc, s) => acc + s.value, 0));
    const minShare = useImpactSizing ? 0.065 : 0.06;
    const flooredSemesters = rawSemesters.map((s) => ({
      ...s,
      value: Math.max(s.value, totalRaw * minShare),
    }));

    const outerCells = squarify(
      flooredSemesters.map((s) => ({ value: s.value, data: s })),
      { x: 0, y: 0, w: 100, h: 100 },
    );

    return {
      maxAbsDelta,
      semesters: outerCells.map((cell) => ({
        rect: cell,
        semester: cell.data.semester,
        innerCells: squarify(
          cell.data.items.map((it) => ({ value: it.value, data: it.discipline })),
          { x: 0, y: 0, w: 100, h: 100 },
        ),
      })),
    };
  }, [entries, sizing]);

  if (!layout) return null;

  const estCanvasW = large ? 1020 : 1060;
  const estCanvasH = large ? 560 : 420;

  return (
    <div
      className={`relative w-full select-none ${
        large ? 'h-[520px] lg:h-[580px]' : 'h-[400px] sm:h-[440px]'
      }`}
      role="region"
      aria-label="Treemap 2D de semestres e disciplinas por impacto no IRA"
    >
      {layout.semesters.map(({ rect, semester, innerCells }) => {
        const semPxW = (rect.w / 100) * estCanvasW;
        const semPxH = Math.max(40, (rect.h / 100) * estCanvasH - 28);
        const semDeltaPositive = semester.delta >= 0;

        return (
          <div
            key={semester.semester}
            style={{
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.w}%`,
              height: `${rect.h}%`,
            }}
            className="absolute p-1"
          >
            <div className="w-full h-full flex flex-col rounded-md border border-line bg-surface-raised/90 overflow-hidden shadow-xs">
              <div
                className={`shrink-0 px-2 py-1 border-b border-line flex items-center justify-between gap-1 text-10-5 ${
                  semester.simulated ? 'bg-accent-2-tint/60' : 'bg-surface-sunken'
                }`}
              >
                <div className="flex items-center gap-1 min-w-0">
                  {semester.simulated && (
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-accent-2-dark shrink-0"
                      title="Semestre com nota prevista"
                    />
                  )}
                  <span className="font-heading font-bold text-ink truncate">{semester.semester}</span>
                  <span className="text-10 font-heading font-semibold px-1 py-px rounded bg-surface text-ink-3 shrink-0">
                    {semester.weight}×
                  </span>
                </div>
                <span
                  className={`font-heading font-bold tabular-nums shrink-0 ${
                    semester.simulated
                      ? 'text-accent-2-dark'
                      : semDeltaPositive
                        ? 'text-good'
                        : 'text-danger'
                  }`}
                >
                  {semDeltaPositive ? '+' : ''}
                  {fmt(semester.delta, 3)}
                </span>
              </div>

              <div className="relative flex-1 min-h-0 m-0.5">
                {innerCells.map((cell) => {
                  const d = cell.data;
                  const isFocus = activeId === d.id;
                  const dimmed = activeId !== null && !isFocus;
                  const tone = impactTone(d.delta, layout.maxAbsDelta, d.simulated);
                  const tilePxW = (cell.w / 100) * semPxW;
                  const tilePxH = (cell.h / 100) * semPxH;

                  const showName = tilePxW >= 46 && tilePxH >= 20;
                  const showMetrics = tilePxW >= 62 && tilePxH >= 36;
                  const showMeta = tilePxW >= 95 && tilePxH >= 54;
                  const gradeText = d.situacao === 'trancado' ? 'Tranc.' : fmt(d.grade, 1);
                  const deltaText = `${d.delta >= 0 ? '+' : ''}${fmt(d.delta, large ? 4 : 3)}`;

                  return (
                    <div
                      key={d.id}
                      style={{
                        left: `${cell.x}%`,
                        top: `${cell.y}%`,
                        width: `${cell.w}%`,
                        height: `${cell.h}%`,
                      }}
                      className="absolute p-0.5"
                    >
                      <button
                        type="button"
                        onMouseEnter={() => onHover(d.id)}
                        onMouseLeave={() => onHover(null)}
                        onFocus={() => onHover(d.id)}
                        onBlur={() => onHover(null)}
                        onClick={() => onSelect(d.id)}
                        title={`${d.name} (${semester.semester}) · Nota ${gradeText} · ${d.workload}h (${semester.weight}×) · ${deltaText} no IRA`}
                        aria-label={`${d.name}, semestre ${semester.semester}, nota ${gradeText}, impacto ${deltaText} no IRA`}
                        style={{
                          background: tone.bg,
                          borderColor: isFocus ? tone.accentText : tone.border,
                        }}
                        className={`w-full h-full rounded-sm border text-left p-1.5 flex flex-col justify-between overflow-hidden cursor-pointer transition-opacity ${
                          isFocus ? 'ring-2 ring-ink z-10' : ''
                        } ${dimmed ? 'opacity-60 hover:opacity-100' : 'opacity-100'}`}
                      >
                        {showName && (
                          <div className="min-w-0">
                            <div
                              className={`font-heading font-semibold text-ink leading-tight truncate ${
                                large ? 'text-xs' : 'text-11'
                              }`}
                            >
                              {d.name}
                            </div>
                            {showMeta && (
                              <div className="text-10 text-ink-3 truncate mt-0.5 tabular-nums">
                                {d.workload}h · {semester.weight}×
                              </div>
                            )}
                          </div>
                        )}

                        {showMetrics && (
                          <div className="flex items-baseline justify-between gap-1 min-w-0 tabular-nums mt-auto pt-0.5">
                            <span className="text-10-5 font-medium text-ink-2 shrink-0">{gradeText}</span>
                            <span
                              className={`font-heading font-bold truncate ${large ? 'text-xs' : 'text-11'}`}
                              style={{ color: tone.accentText }}
                            >
                              {deltaText}
                            </span>
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
