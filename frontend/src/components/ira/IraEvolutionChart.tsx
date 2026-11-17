'use client';

import { Activity } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';
import { Card, CardKicker, CardTitle } from '@/components/Card';
import type { IraEntry } from '@/data/types';
import { computeEvolution, type EvolutionDiscipline } from '@/lib/ira';
import { iraByStage } from '@/lib/iraCampus';
import { CAMPUS_STUDENTS, CAMPUS_UPDATED_AT } from '@/lib/iraCampusData';
import { EmptyChart } from './chartKit';
import { fmt, linePath } from './chartFormat';

const W = 380;
const H = 232;
const PAD_L = 30;
const PAD_R = 14;
const TOP_T = 24;
const TOP_B = 138;
const TOP_H = TOP_B - TOP_T;
const STRIP_T = 152;
const STRIP_B = 196;
const STRIP_H = STRIP_B - STRIP_T;
const PW = W - PAD_L - PAD_R;

function dotColor(d: EvolutionDiscipline): string {
  if (d.simulated) return 'var(--color-accent-2-dark)';
  if (d.situacao === 'trancado' || d.grade < 5) return 'var(--color-danger)';
  if (d.grade >= 7) return 'var(--color-good)';
  return 'var(--color-accent)';
}

/**
 * Rich semester-by-semester story chart:
 * - Upper plot: your cumulative IRA (solid blue for real, dashed brown for
 *   semesters with predictions) overlaid on the selected course's real Q1–Q3
 *   shaded band and mean trajectory.
 * - Lower plot (aligned on the same semesters): every graded discipline as a
 *   dot at its grade (0–10), sized by CH, plus the semester's IRA weight (1×–6×).
 */
export function IraEvolutionChart({
  entries,
  course,
}: {
  entries: IraEntry[];
  course: string | null;
}) {
  const gradId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const points = useMemo(() => computeEvolution(entries), [entries]);
  const courseStages = useMemo(() => {
    const pool = course ? CAMPUS_STUDENTS.filter((s) => s.course === course) : CAMPUS_STUDENTS;
    return new Map(iraByStage(pool, CAMPUS_UPDATED_AT, 14).map((s) => [s.stage, s]));
  }, [course]);

  if (points.length === 0) {
    return (
      <Card padding="md" className="h-full flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <CardKicker>Raio-X dos semestres</CardKicker>
            <CardTitle>Evolução e mapa de notas</CardTitle>
          </div>
          <Activity size={20} className="text-accent shrink-0 mt-1" aria-hidden />
        </div>
        <EmptyChart>Adicione ou importe disciplinas com semestre para ver sua evolução.</EmptyChart>
      </Card>
    );
  }

  const stageMatches = points.map((_, i) => courseStages.get(i + 1) ?? null);
  const allVals = [
    ...points.map((p) => p.cumulativeIra),
    ...stageMatches.flatMap((s) => (s ? [s.q1, s.q3] : [])),
  ];
  const minVal = Math.max(0, Math.floor((Math.min(...allVals) - 0.35) * 2) / 2);
  const maxVal = 10;
  const span = Math.max(1, maxVal - minVal);

  const slotW = PW / Math.max(1, points.length);
  const xAt = (i: number) => PAD_L + (i + 0.5) * slotW;
  const yAt = (v: number) => TOP_T + TOP_H - ((Math.max(minVal, Math.min(maxVal, v)) - minVal) / span) * TOP_H;
  const yGrade = (g: number) => STRIP_T + STRIP_H - (Math.max(0, Math.min(10, g)) / 10) * STRIP_H;

  // Course Q1–Q3 shaded band aligned with 1st, 2nd, 3rd semester...
  const bandPts = points
    .map((_, i) => ({ i, s: stageMatches[i] }))
    .filter((x): x is { i: number; s: NonNullable<typeof x.s> } => x.s !== null);

  const bandFill =
    bandPts.length >= 2
      ? `${linePath(bandPts.map(({ i, s }) => ({ x: xAt(i), y: yAt(s.q3) })))} ${[...bandPts]
          .reverse()
          .map(({ i, s }) => `L ${xAt(i).toFixed(2)} ${yAt(s.q1).toFixed(2)}`)
          .join(' ')} Z`
      : '';
  const courseMeanLine =
    bandPts.length >= 2 ? linePath(bandPts.map(({ i, s }) => ({ x: xAt(i), y: yAt(s.mean) }))) : '';

  const iraArea =
    points.length >= 2
      ? `${linePath(points.map((p, i) => ({ x: xAt(i), y: yAt(p.cumulativeIra) })))} L ${xAt(points.length - 1).toFixed(2)} ${TOP_B} L ${xAt(0).toFixed(2)} ${TOP_B} Z`
      : '';

  const activeIdx = hoverIdx !== null ? hoverIdx : points.length - 1;
  const active = points[activeIdx];
  const activeCourseStage = stageMatches[activeIdx];

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const localX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.min(points.length - 1, Math.max(0, Math.floor((localX - PAD_L) / slotW)));
    setHoverIdx(idx);
  }

  const yTicks = [minVal, Number(((minVal + maxVal) / 2).toFixed(1)), 10].filter((v, i, a) => a.indexOf(v) === i);
  const activeGrades = active.disciplines.filter((d) => d.situacao !== 'trancado').map((d) => d.grade);
  const activeMinG = activeGrades.length > 0 ? Math.min(...activeGrades) : null;
  const activeMaxG = activeGrades.length > 0 ? Math.max(...activeGrades) : null;

  return (
    <Card padding="md" className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <CardKicker>Raio-X dos semestres</CardKicker>
          <CardTitle>Evolução, peso e notas por período</CardTitle>
        </div>
        <Activity size={20} className="text-accent shrink-0 mt-1" aria-hidden />
      </div>

      {/* Rich HUD summarizing the focused (or latest) semester */}
      <div className="rounded-md px-3 py-2 mb-2 bg-surface-sunken flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-11-5">
        <div className="flex items-center gap-2 flex-wrap">
          <b className="font-heading text-ink">{active.semester}</b>
          <span className="text-10 font-heading font-semibold px-1.5 py-0.5 rounded bg-surface text-ink-2">
            peso {active.weight}×
          </span>
          {active.simulated && (
            <span className="text-10 font-heading font-semibold px-1.5 py-0.5 rounded bg-accent-2-tint text-accent-2-dark">
              previsão
            </span>
          )}
          <span className="text-ink-2 tabular-nums">
            IRA{' '}
            <b className={active.simulated ? 'text-accent-2-dark' : 'text-accent-dark'}>{fmt(active.cumulativeIra, 4)}</b>
          </span>
          {active.deltaIra !== null && (
            <span className={`font-semibold tabular-nums ${active.deltaIra >= 0 ? 'text-good' : 'text-danger'}`}>
              ({active.deltaIra >= 0 ? '+' : ''}
              {fmt(active.deltaIra, 4)})
            </span>
          )}
        </div>
        <div className="text-ink-3 tabular-nums">
          {active.semesterAverage !== null && (
            <>
              média <b className="text-ink">{fmt(active.semesterAverage, 2)}</b>
            </>
          )}
          {activeMinG !== null && activeMaxG !== null && (
            <span>
              {' · '}notas {fmt(activeMinG, 1)}–{fmt(activeMaxG, 1)}
            </span>
          )}
          {activeCourseStage && (
            <span>
              {' · '}curso {fmt(activeCourseStage.q1, 1)}–{fmt(activeCourseStage.q3, 1)}
            </span>
          )}
        </div>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto my-auto select-none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Focused column highlight */}
        <rect
          x={xAt(activeIdx) - slotW * 0.42}
          y={TOP_T - 4}
          width={slotW * 0.84}
          height={STRIP_B - TOP_T + 8}
          rx={4}
          fill={active.simulated ? 'var(--color-accent-2-tint)' : 'var(--color-accent-tint)'}
          opacity={hoverIdx !== null ? 0.55 : 0.3}
        />

        {/* Upper plot grid */}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD_L} y1={yAt(v)} x2={PAD_L + PW} y2={yAt(v)} stroke="var(--color-line)" strokeDasharray="2 3" opacity={0.6} />
            <text x={PAD_L - 5} y={yAt(v) + 2.5} textAnchor="end" fontSize={7.5} fill="var(--color-ink-3)">
              {v}
            </text>
          </g>
        ))}

        {/* Course Q1–Q3 shaded reference band */}
        {bandFill && <path d={bandFill} fill="var(--color-surface-sunken)" opacity={0.85} />}
        {courseMeanLine && (
          <path d={courseMeanLine} fill="none" stroke="var(--color-ink-3)" strokeWidth={1.1} strokeDasharray="3 2" opacity={0.75} />
        )}

        {/* Cumulative IRA area + segmented lines (dashed brown into predicted semesters) */}
        {iraArea && <path d={iraArea} fill={`url(#${gradId})`} />}
        {points.slice(1).map((p, i) => {
          const prev = points[i];
          const isSimSeg = p.simulated || prev.simulated;
          return (
            <line
              key={`seg-${p.semester}`}
              x1={xAt(i)}
              y1={yAt(prev.cumulativeIra)}
              x2={xAt(i + 1)}
              y2={yAt(p.cumulativeIra)}
              stroke={isSimSeg ? 'var(--color-accent-2-dark)' : 'var(--color-accent)'}
              strokeWidth={2.1}
              strokeDasharray={isSimSeg ? '4 2.5' : undefined}
            />
          );
        })}

        {/* Upper nodes + focused value */}
        {points.map((p, i) => {
          const cx = xAt(i);
          const cy = yAt(p.cumulativeIra);
          const isFocus = activeIdx === i;
          return (
            <g key={p.semester}>
              <circle
                cx={cx}
                cy={cy}
                r={isFocus ? 4 : 2.8}
                fill={p.simulated ? 'var(--color-accent-2-dark)' : 'var(--color-accent)'}
                stroke="var(--color-surface-raised)"
                strokeWidth={1.3}
              />
              {isFocus && (
                <text
                  x={cx}
                  y={Math.max(10, cy - 7)}
                  textAnchor="middle"
                  fontSize={7.5}
                  fontWeight={700}
                  fill={p.simulated ? 'var(--color-accent-2-dark)' : 'var(--color-accent-dark)'}
                >
                  {fmt(p.cumulativeIra, 4)}
                </text>
              )}
            </g>
          );
        })}

        <line x1={PAD_L} y1={TOP_B} x2={PAD_L + PW} y2={TOP_B} stroke="var(--color-line)" />

        {/* Lower constellation strip: each discipline's grade (0–10) sized by CH */}
        <text x={PAD_L - 5} y={yGrade(10) + 2} textAnchor="end" fontSize={6.5} fill="var(--color-ink-3)">
          10
        </text>
        <text x={PAD_L - 5} y={yGrade(5) + 2} textAnchor="end" fontSize={6.5} fill="var(--color-ink-3)">
          5
        </text>
        <text x={PAD_L - 5} y={yGrade(0) + 2} textAnchor="end" fontSize={6.5} fill="var(--color-ink-3)">
          0
        </text>
        <line x1={PAD_L} y1={yGrade(5)} x2={PAD_L + PW} y2={yGrade(5)} stroke="var(--color-danger)" strokeDasharray="2 3" opacity={0.35} />

        {points.map((p, i) => {
          const cx = xAt(i);
          const spread = Math.min(slotW * 0.58, 20);
          const count = p.disciplines.length;
          return (
            <g key={`strip-${p.semester}`}>
              {p.disciplines.map((d, j) => {
                const offset = count > 1 ? ((j / (count - 1)) - 0.5) * spread : 0;
                const r = d.workload >= 96 ? 3.2 : d.workload >= 64 ? 2.5 : 1.9;
                return (
                  <circle
                    key={d.id}
                    cx={cx + offset}
                    cy={yGrade(d.situacao === 'trancado' ? 0 : d.grade)}
                    r={r}
                    fill={dotColor(d)}
                    opacity={activeIdx === i ? 0.95 : 0.72}
                  />
                );
              })}
              <text x={cx} y={STRIP_B + 11} textAnchor="middle" fontSize={6.5} fontWeight={600} fill="var(--color-ink-3)">
                {p.weight}×
              </text>
              {(points.length <= 8 || i === 0 || i === points.length - 1 || i % 2 === 0) && (
                <text x={cx} y={STRIP_B + 22} textAnchor="middle" fontSize={7.2} fill={activeIdx === i ? 'var(--color-ink)' : 'var(--color-ink-3)'}>
                  {p.semester}
                </text>
              )}
            </g>
          );
        })}

        <rect
          x={PAD_L}
          y={TOP_T - 6}
          width={PW}
          height={STRIP_B - TOP_T + 10}
          fill="transparent"
          style={{ cursor: 'crosshair' }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        />
      </svg>

      <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-10-5 text-ink-3 mt-1.5">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 border-t-2 border-accent inline-block" />
          IRA real
        </span>
        {points.some((p) => p.simulated) && (
          <span className="inline-flex items-center gap-1.5 text-accent-2-dark font-medium">
            <span className="w-3 border-t-2 border-dashed border-[var(--color-accent-2-dark)] inline-block" />
            Com previsão
          </span>
        )}
        {bandFill && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 border-t border-dashed border-ink-3 inline-block" />
            Q1–Q3 de {course ?? 'campus'}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-good inline-block" /> ≥7
          <span className="w-2 h-2 rounded-full bg-accent inline-block ml-1" /> 5–6,9
          <span className="w-2 h-2 rounded-full bg-danger inline-block ml-1" /> &lt;5
        </span>
      </div>
    </Card>
  );
}
