'use client';

import { useId, useMemo, useState } from 'react';
import type { IraEntry } from '@/data/types';
import { computeDisciplineBubbles, computeEvolution, computeIra } from '@/lib/ira';
import { iraByStage } from '@/lib/iraCampus';
import { CAMPUS_STUDENTS, CAMPUS_UPDATED_AT } from '@/lib/iraCampusData';
import { EmptyChart } from './chartKit';
import { fmt, linePath } from './chartFormat';
import { dotColorByImpact } from './personalColors';

/**
 * Integrated Semester Bridge & Grade Dispersion:
 * - Upper canvas: floating Waterfall Bridge showing how each semester raised
 *   or dropped the cumulative IRA, overlaid on the course Q1–Q3 trajectory.
 * - Middle strip: recency leverage pills (`1×–6×`) illustrating how later
 *   semesters carry heavier IRA weight.
 * - Lower strip: interactive per-discipline grade dispersion (`0–10`) around
 *   the student's overall IRA line.
 */
export function SemesterBridgePlot({
  entries,
  course,
  activeId,
  onHover,
  onSelect,
  large = false,
}: {
  entries: IraEntry[];
  course: string | null;
  activeId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  large?: boolean;
}) {
  const gradId = useId();
  const [hoverSemIdx, setHoverSemIdx] = useState<number | null>(null);

  const points = useMemo(() => computeEvolution(entries), [entries]);
  const currentIra = useMemo(() => computeIra(entries), [entries]);
  const deltaById = useMemo(
    () => new Map(computeDisciplineBubbles(entries).map((b) => [b.id, b.delta])),
    [entries],
  );
  const courseStages = useMemo(() => {
    const pool = course ? CAMPUS_STUDENTS.filter((s) => s.course === course) : CAMPUS_STUDENTS;
    return new Map(iraByStage(pool, CAMPUS_UPDATED_AT, 14).map((s) => [s.stage, s]));
  }, [course]);

  if (points.length === 0 || currentIra === null) {
    return <EmptyChart>Adicione ou importe disciplinas com semestre para ver a ponte entre períodos.</EmptyChart>;
  }

  const W = large ? 1080 : 880;
  const H = large ? 500 : 360;
  const PAD_L = large ? 54 : 46;
  const PAD_R = large ? 28 : 22;
  const TOP_T = large ? 30 : 24;
  const TOP_B = large ? 274 : 194;
  const TOP_H = TOP_B - TOP_T;
  const PILL_Y = large ? 286 : 203;
  const PILL_H = large ? 22 : 18;
  const BOT_T = large ? 328 : 234;
  const BOT_B = large ? 468 : 332;
  const BOT_H = BOT_B - BOT_T;
  const LABEL_Y = large ? 488 : 349;
  const PW = W - PAD_L - PAD_R;

  const stageMatches = points.map((_, i) => courseStages.get(i + 1) ?? null);
  const allVals = [
    ...points.map((p) => p.cumulativeIra),
    ...stageMatches.flatMap((s) => (s ? [s.q1, s.q3] : [])),
  ];
  const minVal = Math.max(0, Math.floor((Math.min(...allVals) - 0.35) * 4) / 4);
  const maxVal = 10;
  const span = Math.max(1, maxVal - minVal);

  const slotW = PW / Math.max(1, points.length);
  const xAt = (i: number) => PAD_L + (i + 0.5) * slotW;
  const yAt = (v: number) => TOP_T + TOP_H - ((Math.max(minVal, Math.min(maxVal, v)) - minVal) / span) * TOP_H;
  const yGrade = (g: number) => BOT_T + BOT_H - (Math.max(0, Math.min(10, g)) / 10) * BOT_H;

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

  // Focus follows hovered column first, else semester of hovered/pinned discipline, else latest semester.
  const discSemIdx = activeId
    ? points.findIndex((pt) => pt.disciplines.some((d) => d.id === activeId))
    : -1;
  const activeIdx = hoverSemIdx !== null ? hoverSemIdx : discSemIdx >= 0 ? discSemIdx : points.length - 1;
  const active = points[activeIdx];
  const activeCourseStage = stageMatches[activeIdx];

  const activeGrades = active.disciplines.filter((d) => d.situacao !== 'trancado').map((d) => d.grade);
  const activeMinG = activeGrades.length > 0 ? Math.min(...activeGrades) : null;
  const activeMaxG = activeGrades.length > 0 ? Math.max(...activeGrades) : null;

  const yTicks = [minVal, Number(((minVal + maxVal) / 2).toFixed(1)), 10].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );
  const barW = Math.min(large ? 36 : 28, slotW * 0.44);
  const fontSizeAxis = large ? 10 : 9;

  return (
    <div className="flex flex-col gap-2">
      {/* Focused semester HUD */}
      <div className="rounded-md px-3 py-2 bg-surface-sunken flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-11-5">
        <div className="flex items-center gap-2 flex-wrap">
          <b className="font-heading text-ink">{active.semester}</b>
          <span className="text-10-5 font-heading font-semibold px-1.5 py-0.5 rounded bg-surface text-ink-2">
            peso {active.weight}×
          </span>
          {active.simulated && (
            <span className="text-10 font-heading font-semibold px-1.5 py-0.5 rounded bg-accent-2-tint text-accent-2-dark">
              Previsão
            </span>
          )}
          <span className="text-ink-2 tabular-nums">
            IRA acumulado{' '}
            <b className={active.simulated ? 'text-accent-2-dark' : 'text-accent-dark'}>
              {fmt(active.cumulativeIra, 4)}
            </b>
          </span>
          {active.deltaIra !== null && (
            <span className={`font-heading font-bold tabular-nums ${active.deltaIra >= 0 ? 'text-good' : 'text-danger'}`}>
              ({active.deltaIra >= 0 ? '+' : ''}
              {fmt(active.deltaIra, 4)} no período)
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
              {' · '}faixa Q1–Q3 do curso {fmt(activeCourseStage.q1, 1)}–{fmt(activeCourseStage.q3, 1)}
            </span>
          )}
        </div>
      </div>

      <svg
        role="img"
        aria-label="Ponte de evolução do IRA por semestre com barras waterfall, alavanca de peso e dispersão das notas"
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto select-none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Active semester column wash */}
        <rect
          x={xAt(activeIdx) - slotW * 0.45}
          y={TOP_T - 6}
          width={slotW * 0.9}
          height={BOT_B - TOP_T + 10}
          rx={6}
          fill={active.simulated ? 'var(--color-accent-2-tint)' : 'var(--color-accent-tint)'}
          opacity={hoverSemIdx !== null || discSemIdx >= 0 ? 0.5 : 0.25}
        />

        {/* Upper Y-axis grid */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L}
              y1={yAt(v)}
              x2={PAD_L + PW}
              y2={yAt(v)}
              stroke="var(--color-line)"
              strokeDasharray="2 3"
              opacity={0.65}
            />
            <text x={PAD_L - 7} y={yAt(v) + 3} textAnchor="end" fontSize={fontSizeAxis} fill="var(--color-ink-3)">
              {v}
            </text>
          </g>
        ))}

        {/* Course Q1–Q3 shaded reference band */}
        {bandFill && <path d={bandFill} fill="var(--color-surface-sunken)" opacity={0.9} />}
        {courseMeanLine && (
          <path
            d={courseMeanLine}
            fill="none"
            stroke="var(--color-ink-3)"
            strokeWidth={1.3}
            strokeDasharray="4 3"
            opacity={0.75}
          />
        )}

        {/* Area wash + trajectory line */}
        {iraArea && <path d={iraArea} fill={`url(#${gradId})`} />}

        {/* Waterfall floating bars + step connectors */}
        {points.map((p, i) => {
          const cx = xAt(i);
          const cy = yAt(p.cumulativeIra);

          if (i === 0) {
            return (
              <g key={`wf-${p.semester}`}>
                <rect
                  x={cx - barW / 2}
                  y={cy}
                  width={barW}
                  height={Math.max(4, TOP_B - cy)}
                  rx={3}
                  fill="var(--color-accent-tint)"
                  stroke="var(--color-accent)"
                  strokeWidth={1.2}
                />
                {slotW >= 48 && (
                  <text
                    x={cx}
                    y={Math.max(TOP_T + 10, cy - 6)}
                    textAnchor="middle"
                    fontSize={large ? 9.5 : 8.5}
                    fontWeight={700}
                    fill="var(--color-accent-dark)"
                  >
                    {fmt(p.cumulativeIra, 2)}
                  </text>
                )}
              </g>
            );
          }

          const prev = points[i - 1];
          const prevY = yAt(prev.cumulativeIra);
          const delta = p.deltaIra ?? 0;
          const isUp = delta >= 0;
          const rawH = Math.abs(cy - prevY);
          const barH = Math.max(4, rawH);
          const topY = rawH < 4 ? (prevY + cy) / 2 - 2 : Math.min(prevY, cy);
          const showStepLabel = slotW >= 54 || activeIdx === i;

          return (
            <g key={`wf-${p.semester}`}>
              <line
                x1={xAt(i - 1)}
                y1={prevY}
                x2={cx - barW / 2}
                y2={prevY}
                stroke="var(--color-line-strong)"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
              <rect
                x={cx - barW / 2}
                y={topY}
                width={barW}
                height={barH}
                rx={3}
                fill={
                  p.simulated
                    ? 'var(--color-accent-2-tint)'
                    : isUp
                      ? 'var(--color-good)'
                      : 'var(--color-danger)'
                }
                stroke={p.simulated ? 'var(--color-accent-2-dark)' : undefined}
                strokeWidth={p.simulated ? 1.4 : undefined}
                strokeDasharray={p.simulated ? '3 2' : undefined}
                opacity={0.86}
              />
              {showStepLabel && (
                <text
                  x={cx}
                  y={
                    isUp
                      ? Math.max(TOP_T + 10, topY - 5)
                      : Math.min(TOP_B - 4, topY + barH + (large ? 12 : 10))
                  }
                  textAnchor="middle"
                  fontSize={large ? 9.5 : 8.5}
                  fontWeight={700}
                  fill={
                    p.simulated
                      ? 'var(--color-accent-2-dark)'
                      : isUp
                        ? 'var(--color-good)'
                        : 'var(--color-danger)'
                  }
                >
                  {isUp ? '+' : ''}
                  {fmt(delta, large ? 3 : 2)}
                </text>
              )}
            </g>
          );
        })}

        {/* Trajectory segments + nodes */}
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
              strokeWidth={large ? 2.2 : 1.8}
              strokeDasharray={isSimSeg ? '4 2.5' : undefined}
            />
          );
        })}

        {points.map((p, i) => {
          const cx = xAt(i);
          const cy = yAt(p.cumulativeIra);
          const isFocus = activeIdx === i;
          return (
            <g key={`node-${p.semester}`}>
              <circle
                cx={cx}
                cy={cy}
                r={isFocus ? (large ? 5 : 4.2) : large ? 3.5 : 3}
                fill={p.simulated ? 'var(--color-accent-2-dark)' : 'var(--color-accent)'}
                stroke="var(--color-surface-raised)"
                strokeWidth={1.5}
              />
            </g>
          );
        })}

        <line x1={PAD_L} y1={TOP_B} x2={PAD_L + PW} y2={TOP_B} stroke="var(--color-line)" />

        {/* Middle Weight Lever Strip (`1×..6×`) */}
        <text
          x={PAD_L - 7}
          y={PILL_Y + PILL_H / 2 + 3}
          textAnchor="end"
          fontSize={large ? 9 : 8}
          fontWeight={600}
          fill="var(--color-ink-3)"
        >
          Peso
        </text>
        {points.map((p, i) => {
          const cx = xAt(i);
          const pillW = Math.min(large ? 44 : 36, slotW * 0.68);
          const fillW = (p.weight / 6) * pillW;
          return (
            <g key={`pill-${p.semester}`}>
              <rect
                x={cx - pillW / 2}
                y={PILL_Y}
                width={pillW}
                height={PILL_H}
                rx={4}
                fill="var(--color-surface-sunken)"
                stroke="var(--color-line)"
              />
              <rect
                x={cx - pillW / 2}
                y={PILL_Y}
                width={fillW}
                height={PILL_H}
                rx={4}
                fill={p.simulated ? 'var(--color-accent-2-tint)' : 'var(--color-accent-tint)'}
              />
              <text
                x={cx}
                y={PILL_Y + PILL_H / 2 + 3.5}
                textAnchor="middle"
                fontSize={large ? 9.5 : 8.5}
                fontWeight={700}
                fill={p.simulated ? 'var(--color-accent-2-dark)' : 'var(--color-ink-2)'}
              >
                {p.weight}×
              </text>
            </g>
          );
        })}

        {/* Lower Strip: Grade dispersion (0–10) vs student's overall IRA line */}
        <line x1={PAD_L} y1={BOT_T} x2={PAD_L + PW} y2={BOT_T} stroke="var(--color-line)" opacity={0.5} />
        <line x1={PAD_L} y1={BOT_B} x2={PAD_L + PW} y2={BOT_B} stroke="var(--color-line)" />

        <line
          x1={PAD_L}
          y1={yGrade(5)}
          x2={PAD_L + PW}
          y2={yGrade(5)}
          stroke="var(--color-danger)"
          strokeDasharray="2 3"
          opacity={0.35}
        />
        <line
          x1={PAD_L}
          y1={yGrade(currentIra)}
          x2={PAD_L + PW}
          y2={yGrade(currentIra)}
          stroke="var(--color-accent-3)"
          strokeWidth={1.3}
          strokeDasharray="4 2.5"
        />

        <text x={PAD_L - 7} y={yGrade(10) + 3} textAnchor="end" fontSize={fontSizeAxis} fill="var(--color-ink-3)">
          10
        </text>
        <text x={PAD_L - 7} y={yGrade(5) + 3} textAnchor="end" fontSize={fontSizeAxis} fill="var(--color-ink-3)">
          5
        </text>
        <text x={PAD_L - 7} y={yGrade(0) + 3} textAnchor="end" fontSize={fontSizeAxis} fill="var(--color-ink-3)">
          0
        </text>
        <text
          x={PAD_L + PW}
          y={Math.max(BOT_T + 9, yGrade(currentIra) - 4)}
          textAnchor="end"
          fontSize={large ? 9.5 : 8.5}
          fontWeight={700}
          fill="var(--color-accent-3)"
        >
          seu IRA {fmt(currentIra, 2)}
        </text>

        {/* Invisible column hover bands underneath interactive discipline dots */}
        {points.map((p, i) => (
          <rect
            key={`hover-${p.semester}`}
            x={PAD_L + i * slotW}
            y={TOP_T - 6}
            width={slotW}
            height={BOT_B - TOP_T + 10}
            fill="transparent"
            onMouseEnter={() => setHoverSemIdx(i)}
            onMouseLeave={() => setHoverSemIdx(null)}
          />
        ))}

        {/* Range stems + discipline grade dots */}
        {points.map((p, i) => {
          const cx = xAt(i);
          const numericGrades = p.disciplines.filter((d) => d.situacao !== 'trancado').map((d) => d.grade);
          const minG = numericGrades.length > 0 ? Math.min(...numericGrades) : null;
          const maxG = numericGrades.length > 0 ? Math.max(...numericGrades) : null;
          const spread = Math.min(slotW * 0.64, large ? 40 : 30);
          const count = p.disciplines.length;
          const showLabel = points.length <= 10 || i === 0 || i === points.length - 1 || i % 2 === 0;

          return (
            <g key={`strip-${p.semester}`}>
              {minG !== null && maxG !== null && minG < maxG && (
                <line
                  x1={cx}
                  y1={yGrade(maxG)}
                  x2={cx}
                  y2={yGrade(minG)}
                  stroke="var(--color-line-strong)"
                  strokeWidth={1.6}
                  opacity={0.7}
                />
              )}
              {p.semesterAverage !== null && (
                <line
                  x1={cx - 8}
                  y1={yGrade(p.semesterAverage)}
                  x2={cx + 8}
                  y2={yGrade(p.semesterAverage)}
                  stroke="var(--color-ink-2)"
                  strokeWidth={1.8}
                />
              )}

              {p.disciplines.map((d, j) => {
                const offset = count > 1 ? (j / (count - 1) - 0.5) * spread : 0;
                const dotX = cx + offset;
                const dotY = yGrade(d.situacao === 'trancado' ? 0.25 : d.grade);
                const r = d.workload >= 96 ? (large ? 5.2 : 4.4) : d.workload >= 64 ? (large ? 4.3 : 3.6) : large ? 3.5 : 3;
                const delta = deltaById.get(d.id) ?? 0;
                const color = dotColorByImpact(delta, d.simulated);
                const isDotActive = activeId === d.id;

                return (
                  <g
                    key={d.id}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => {
                      setHoverSemIdx(i);
                      onHover(d.id);
                    }}
                    onMouseLeave={() => {
                      setHoverSemIdx(null);
                      onHover(null);
                    }}
                    onClick={() => onSelect(d.id)}
                  >
                    {isDotActive && (
                      <circle cx={dotX} cy={dotY} r={r + 3.5} fill="none" stroke="var(--color-ink)" strokeWidth={1.6} />
                    )}
                    {d.situacao === 'trancado' ? (
                      <circle
                        cx={dotX}
                        cy={dotY}
                        r={r}
                        fill="var(--color-surface-raised)"
                        stroke="var(--color-danger)"
                        strokeWidth={1.8}
                      />
                    ) : (
                      <circle
                        cx={dotX}
                        cy={dotY}
                        r={isDotActive ? r + 1.2 : r}
                        fill={color}
                        stroke="var(--color-surface-raised)"
                        strokeWidth={1.1}
                        opacity={activeIdx === i || isDotActive ? 0.96 : 0.78}
                      />
                    )}
                  </g>
                );
              })}

              {showLabel && (
                <text
                  x={cx}
                  y={LABEL_Y}
                  textAnchor="middle"
                  fontSize={large ? 10 : 9}
                  fontWeight={activeIdx === i ? 700 : 500}
                  fill={activeIdx === i ? 'var(--color-ink)' : 'var(--color-ink-3)'}
                >
                  {p.semester}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
