'use client';

import { Activity } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';
import { Card, CardKicker, CardTitle } from '@/components/Card';
import type { IraEntry } from '@/data/types';
import { computeEvolution } from '@/lib/ira';
import { iraByStage } from '@/lib/iraCampus';
import { CAMPUS_STUDENTS, CAMPUS_UPDATED_AT } from '@/lib/iraCampusData';
import { EmptyChart } from './chartKit';
import { fmt, linePath } from './chartFormat';

const W = 360;
const H = 205;
const PAD_L = 30;
const PAD_R = 16;
const PAD_T = 28;
const PAD_B = 28;
const PW = W - PAD_L - PAD_R;
const PH = H - PAD_T - PAD_B;

/**
 * Rich personal trajectory chart: plots your cumulative IRA (gradient-shaded
 * area + crisp line), your per-semester average (bars), and — behind it — the
 * selected course's real Q1–Q3 interquartile band and median/mean trajectory
 * from the campus dataset, with interactive hover across semesters.
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
            <CardKicker>Sua trajetória</CardKicker>
            <CardTitle>Evolução semestre a semestre</CardTitle>
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
    ...points.flatMap((p) => (p.semesterAverage !== null ? [p.semesterAverage] : [])),
    ...stageMatches.flatMap((s) => (s ? [s.q1, s.q3] : [])),
  ];
  const minVal = Math.max(0, Math.floor((Math.min(...allVals) - 0.3) * 2) / 2);
  const maxVal = 10;
  const span = Math.max(1, maxVal - minVal);

  const slotW = PW / Math.max(1, points.length);
  const barW = Math.min(20, slotW * 0.44);
  const xAt = (i: number) => PAD_L + (i + 0.5) * slotW;
  const yAt = (v: number) => PAD_T + PH - ((Math.max(minVal, Math.min(maxVal, v)) - minVal) / span) * PH;

  // Course Q1–Q3 shaded band aligned with semester 1, 2, 3...
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

  const iraLine = linePath(points.map((p, i) => ({ x: xAt(i), y: yAt(p.cumulativeIra) })));
  const iraArea =
    points.length >= 2
      ? `${iraLine} L ${xAt(points.length - 1).toFixed(2)} ${PAD_T + PH} L ${xAt(0).toFixed(2)} ${PAD_T + PH} Z`
      : '';

  const last = points[points.length - 1];
  const prev = points.length >= 2 ? points[points.length - 2] : null;
  const delta = prev ? last.cumulativeIra - prev.cumulativeIra : null;

  const activeIdx = hoverIdx !== null ? hoverIdx : points.length - 1;
  const active = points[activeIdx];
  const activePrev = activeIdx > 0 ? points[activeIdx - 1] : null;
  const activeDelta = activePrev ? active.cumulativeIra - activePrev.cumulativeIra : null;

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const localX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.min(points.length - 1, Math.max(0, Math.floor((localX - PAD_L) / slotW)));
    setHoverIdx(idx);
  }

  const yTicks = [minVal, Number(((minVal + maxVal) / 2).toFixed(1)), 10].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <Card padding="md" className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <CardKicker>Sua trajetória</CardKicker>
          <CardTitle>Evolução semestre a semestre</CardTitle>
        </div>
        <Activity size={20} className="text-accent shrink-0 mt-1" aria-hidden />
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-2 text-12 text-ink-2 mb-2">
        <span>
          {hoverIdx !== null ? active.semester : `Último (${last.semester})`}:{' '}
          <b className="text-ink tabular-nums">{fmt(active.cumulativeIra, 4)}</b>
          {(hoverIdx !== null ? activeDelta : delta) !== null && (
            <span
              className={`ml-1 font-semibold tabular-nums ${
                (hoverIdx !== null ? activeDelta! : delta!) >= 0 ? 'text-good' : 'text-danger'
              }`}
            >
              ({(hoverIdx !== null ? activeDelta! : delta!) >= 0 ? '+' : ''}
              {fmt(hoverIdx !== null ? activeDelta! : delta!, 4)})
            </span>
          )}
        </span>
        {active.semesterAverage !== null && (
          <span className="text-11-5 text-ink-3 tabular-nums">
            média no sem.: <b className="text-ink">{fmt(active.semesterAverage, 2)}</b>
          </span>
        )}
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto my-auto select-none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.24" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD_L} y1={yAt(v)} x2={PAD_L + PW} y2={yAt(v)} stroke="var(--color-line)" strokeDasharray="2 3" opacity={0.65} />
            <text x={PAD_L - 5} y={yAt(v) + 3} textAnchor="end" fontSize={8} fill="var(--color-ink-3)">
              {v}
            </text>
          </g>
        ))}

        {/* Course Q1–Q3 shaded reference band */}
        {bandFill && <path d={bandFill} fill="var(--color-surface-sunken)" opacity={0.9} />}
        {courseMeanLine && (
          <path d={courseMeanLine} fill="none" stroke="var(--color-ink-3)" strokeWidth={1.2} strokeDasharray="3 2" opacity={0.75} />
        )}

        {/* Per-semester average bars */}
        {points.map((p, i) => {
          if (p.semesterAverage === null) return null;
          const y = yAt(p.semesterAverage);
          const isHover = hoverIdx === i;
          return (
            <rect
              key={`bar-${p.semester}`}
              x={xAt(i) - barW / 2}
              y={y}
              width={barW}
              height={Math.max(1, PAD_T + PH - y)}
              rx={2}
              fill={p.simulated ? 'var(--color-accent-2-tint)' : 'var(--color-accent-tint-2)'}
              opacity={isHover ? 1 : 0.7}
            />
          );
        })}

        {/* Cumulative IRA area + line */}
        {iraArea && <path d={iraArea} fill={`url(#${gradId})`} />}
        {points.length > 1 && <path d={iraLine} fill="none" stroke="var(--color-accent)" strokeWidth={2.2} />}

        {/* Hover crosshair */}
        {hoverIdx !== null && (
          <line
            x1={xAt(hoverIdx)}
            y1={PAD_T - 4}
            x2={xAt(hoverIdx)}
            y2={PAD_T + PH}
            stroke="var(--color-accent-3)"
            strokeWidth={1.2}
            strokeDasharray="2 2"
          />
        )}

        {/* Nodes + labels */}
        {points.map((p, i) => {
          const cx = xAt(i);
          const cy = yAt(p.cumulativeIra);
          const isFocus = hoverIdx === i || (hoverIdx === null && i === points.length - 1);
          return (
            <g key={p.semester}>
              <circle
                cx={cx}
                cy={cy}
                r={isFocus ? 4.2 : 3}
                fill={p.simulated ? 'var(--color-accent-2-dark)' : 'var(--color-accent)'}
                stroke="var(--color-surface-raised)"
                strokeWidth={1.4}
              />
              {isFocus && (
                <text
                  x={cx}
                  y={Math.max(11, cy - 8)}
                  textAnchor="middle"
                  fontSize={8}
                  fontWeight={700}
                  fill={p.simulated ? 'var(--color-accent-2-dark)' : 'var(--color-accent-dark)'}
                >
                  {fmt(p.cumulativeIra, 4)}
                </text>
              )}
              {(points.length <= 8 || i === 0 || i === points.length - 1 || i % 2 === 0) && (
                <text x={cx} y={PAD_T + PH + 14} textAnchor="middle" fontSize={7.5} fill="var(--color-ink-3)">
                  {p.semester}
                </text>
              )}
            </g>
          );
        })}

        <line x1={PAD_L} y1={PAD_T + PH} x2={PAD_L + PW} y2={PAD_T + PH} stroke="var(--color-line)" />

        <rect
          x={PAD_L}
          y={PAD_T - 6}
          width={PW}
          height={PH + 10}
          fill="transparent"
          style={{ cursor: 'crosshair' }}
          onMouseMove={handleMove}
          onMouseLeave={() => setHoverIdx(null)}
        />
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-10-5 text-ink-3 mt-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 border-t-2 border-accent inline-block" />
          Seu IRA acumulado
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-accent-tint-2 inline-block" />
          Média do semestre
        </span>
        {bandFill && (
          <span className="inline-flex items-center gap-1.5">
            <span className="w-3 border-t border-dashed border-ink-3 inline-block" />
            Faixa Q1–Q3 de {course ?? 'campus'}
          </span>
        )}
      </div>
    </Card>
  );
}
