'use client';

import { useId } from 'react';
import type { SimTrajectoryPoint } from '@/lib/iraSimulator';
import { EmptyChart } from './chartKit';
import { fmt, linePath } from './chartFormat';

const W = 440;
const H = 190;
const PAD_L = 36;
const PAD_R = 16;
const PAD_T = 22;
const PAD_B = 28;
const PW = W - PAD_L - PAD_R;
const PH = H - PAD_T - PAD_B;

/**
 * Compact SVG trajectory chart for the simulation panel:
 * connects consolidated real semesters (solid blue) with simulated future
 * semesters (dashed amber), optional saved scenarios A/B/C (dotted lines),
 * and an optional horizontal goal line.
 */
export function IraSimulatorTrajectory({
  points,
  comparedScenarios = [],
  goalIra,
}: {
  points: SimTrajectoryPoint[];
  comparedScenarios?: { slot: 'A' | 'B' | 'C'; points: SimTrajectoryPoint[]; color: string }[];
  goalIra?: number | null;
}) {
  const gradId = useId();

  if (points.length === 0) {
    return <EmptyChart>Adicione ou simule ao menos uma disciplina para visualizar a trajetória do IRA.</EmptyChart>;
  }

  const allVals = [
    ...points.map((p) => p.cumulativeIra),
    ...comparedScenarios.flatMap((s) => s.points.map((p) => p.cumulativeIra)),
    ...(goalIra !== null && goalIra !== undefined ? [goalIra] : []),
  ];
  const minVal = Math.max(0, Math.floor((Math.min(...allVals) - 0.35) * 4) / 4);
  const maxVal = Math.min(10, Math.ceil((Math.max(...allVals) + 0.2) * 4) / 4);
  const span = Math.max(0.5, maxVal - minVal);

  const count = Math.max(points.length, ...comparedScenarios.map((s) => s.points.length));
  const xAt = (i: number) => (count <= 1 ? PAD_L + PW / 2 : PAD_L + (i / (count - 1)) * PW);
  const yAt = (v: number) => PAD_T + PH - ((Math.max(minVal, Math.min(maxVal, v)) - minVal) / span) * PH;

  const yTicks = [minVal, Number(((minVal + maxVal) / 2).toFixed(2)), maxVal].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );

  const areaPath =
    points.length >= 2
      ? `${linePath(points.map((p, i) => ({ x: xAt(i), y: yAt(p.cumulativeIra) })))} L ${xAt(points.length - 1).toFixed(2)} ${PAD_T + PH} L ${xAt(0).toFixed(2)} ${PAD_T + PH} Z`
      : '';

  const lastRealIdx = points.reduce((acc, p, idx) => (!p.simulated ? idx : acc), -1);
  const lastIdx = points.length - 1;

  return (
    <div className="flex flex-col gap-1.5">
      <svg
        role="img"
        aria-label="Curva de trajetória do IRA conectando semestres reais aos semestres simulados"
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto select-none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent-2)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-accent-2)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L}
              y1={yAt(v)}
              x2={PAD_L + PW}
              y2={yAt(v)}
              stroke="var(--color-line)"
              strokeDasharray="2 3"
              opacity={0.7}
            />
            <text x={PAD_L - 5} y={yAt(v) + 3} textAnchor="end" fontSize={8} fill="var(--color-ink-3)">
              {fmt(v, 2)}
            </text>
          </g>
        ))}

        {goalIra !== null && goalIra !== undefined && goalIra >= minVal && goalIra <= maxVal && (
          <g>
            <line
              x1={PAD_L}
              y1={yAt(goalIra)}
              x2={PAD_L + PW}
              y2={yAt(goalIra)}
              stroke="var(--color-good)"
              strokeWidth={1.3}
              strokeDasharray="4 2.5"
            />
            <text
              x={PAD_L + 4}
              y={Math.max(PAD_T + 9, yAt(goalIra) - 4)}
              fontSize={8}
              fontWeight={700}
              fill="var(--color-good)"
            >
              Meta {fmt(goalIra, 2)}
            </text>
          </g>
        )}

        {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}

        {comparedScenarios.map(
          (sc) =>
            sc.points.length >= 2 && (
              <path
                key={sc.slot}
                d={linePath(sc.points.map((p, i) => ({ x: xAt(i), y: yAt(p.cumulativeIra) })))}
                fill="none"
                stroke={sc.color}
                strokeWidth={1.5}
                strokeDasharray="2 2.5"
                opacity={0.85}
              />
            ),
        )}

        {points.slice(1).map((p, i) => {
          const prev = points[i];
          const isSim = p.simulated || prev.simulated;
          return (
            <line
              key={`seg-${p.semester}`}
              x1={xAt(i)}
              y1={yAt(prev.cumulativeIra)}
              x2={xAt(i + 1)}
              y2={yAt(p.cumulativeIra)}
              stroke={isSim ? 'var(--color-accent-2-dark)' : 'var(--color-accent)'}
              strokeWidth={2}
              strokeDasharray={isSim ? '4 2.5' : undefined}
            />
          );
        })}

        {points.map((p, i) => {
          const cx = xAt(i);
          const cy = yAt(p.cumulativeIra);
          const showLabel = i === lastRealIdx || i === lastIdx;
          const labelAnchor = i >= lastIdx && count > 2 ? 'end' : i === 0 && count > 2 ? 'start' : 'middle';
          const showXTick = count <= 7 || i === 0 || i === lastIdx || i === lastRealIdx || i % 2 === 0;

          return (
            <g key={p.semester}>
              <circle
                cx={cx}
                cy={cy}
                r={i === lastIdx ? 4.2 : 3}
                fill={p.simulated ? 'var(--color-accent-2-dark)' : 'var(--color-accent)'}
                stroke="var(--color-surface-raised)"
                strokeWidth={1.3}
              />
              {showLabel && (
                <text
                  x={cx}
                  y={Math.max(PAD_T + 10, cy - 7)}
                  textAnchor={labelAnchor}
                  fontSize={8.5}
                  fontWeight={700}
                  fill={p.simulated ? 'var(--color-accent-2-dark)' : 'var(--color-accent-dark)'}
                >
                  {fmt(p.cumulativeIra, 4)}
                </text>
              )}
              {showXTick && (
                <text
                  x={cx}
                  y={H - 8}
                  textAnchor={i === 0 && count > 3 ? 'start' : i === count - 1 && count > 3 ? 'end' : 'middle'}
                  fontSize={7.5}
                  fontWeight={p.simulated ? 600 : 500}
                  fill={p.simulated ? 'var(--color-accent-2-dark)' : 'var(--color-ink-3)'}
                >
                  {p.semester}
                </text>
              )}
            </g>
          );
        })}

        <line x1={PAD_L} y1={PAD_T + PH} x2={PAD_L + PW} y2={PAD_T + PH} stroke="var(--color-line)" />
      </svg>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-10-5 text-ink-3">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 border-t-2 border-accent inline-block" /> Histórico real
        </span>
        <span className="inline-flex items-center gap-1.5 text-accent-2-dark font-medium">
          <span className="w-3 border-t-2 border-dashed border-[var(--color-accent-2-dark)] inline-block" /> Cenário ativo
        </span>
        {comparedScenarios.map(
          (sc) =>
            sc.points.length >= 2 && (
              <span key={sc.slot} className="inline-flex items-center gap-1.5">
                <span className="w-3 border-t-2 border-dotted inline-block" style={{ borderColor: sc.color }} />
                Cenário {sc.slot}
              </span>
            ),
        )}
      </div>
    </div>
  );
}
