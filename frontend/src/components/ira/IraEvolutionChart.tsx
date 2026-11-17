'use client';

import { Activity } from 'lucide-react';
import { useMemo } from 'react';
import { Card, CardKicker, CardTitle } from '@/components/Card';
import type { IraEntry } from '@/data/types';
import { computeEvolution } from '@/lib/ira';
import { EmptyChart } from './chartKit';
import { fmt, linePath } from './chartFormat';

const W = 340;
const H = 185;
const PAD_L = 28;
const PAD_R = 16;
const PAD_T = 22;
const PAD_B = 28;
const PW = W - PAD_L - PAD_R;
const PH = H - PAD_T - PAD_B;

/**
 * Personal semester-by-semester evolution: soft bars for each semester's own
 * grade average and a line on top for the cumulative IRA after that semester.
 */
export function IraEvolutionChart({ entries }: { entries: IraEntry[] }) {
  const points = useMemo(() => computeEvolution(entries), [entries]);

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

  const minVal = Math.max(0, Math.floor(Math.min(...points.map((p) => p.cumulativeIra), ...points.flatMap((p) => (p.semesterAverage !== null ? [p.semesterAverage] : []))) - 0.5));
  const maxVal = 10;
  const span = Math.max(1, maxVal - minVal);

  const slotW = PW / Math.max(1, points.length);
  const barW = Math.min(24, slotW * 0.52);
  const xAt = (i: number) => PAD_L + (i + 0.5) * slotW;
  const yAt = (v: number) => PAD_T + PH - ((Math.max(minVal, Math.min(maxVal, v)) - minVal) / span) * PH;

  const line = linePath(points.map((p, i) => ({ x: xAt(i), y: yAt(p.cumulativeIra) })));

  const last = points[points.length - 1];
  const prev = points.length >= 2 ? points[points.length - 2] : null;
  const delta = prev ? last.cumulativeIra - prev.cumulativeIra : null;

  const bestSem = points.reduce<{ sem: string; avg: number } | null>((best, p) => {
    if (p.semesterAverage === null) return best;
    return !best || p.semesterAverage > best.avg ? { sem: p.semester, avg: p.semesterAverage } : best;
  }, null);

  return (
    <Card padding="md" className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <CardKicker>Sua trajetória</CardKicker>
          <CardTitle>Evolução semestre a semestre</CardTitle>
        </div>
        <Activity size={20} className="text-accent shrink-0 mt-1" aria-hidden />
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-12 text-ink-2 mb-3">
        <span>
          Último ({last.semester}): <b className="text-ink tabular-nums">{fmt(last.cumulativeIra, 4)}</b>
          {delta !== null && (
            <span className={`ml-1 font-semibold tabular-nums ${delta >= 0 ? 'text-good' : 'text-danger'}`}>
              ({delta >= 0 ? '+' : ''}
              {fmt(delta, 4)})
            </span>
          )}
        </span>
        {bestSem && (
          <span className="text-ink-3">
            Melhor semestre: <b className="text-ink">{bestSem.sem}</b> ({fmt(bestSem.avg, 2)})
          </span>
        )}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto my-auto">
        {[minVal, Math.round((minVal + maxVal) / 2), 10]
          .filter((v, i, arr) => arr.indexOf(v) === i)
          .map((v) => (
            <g key={v}>
              <line x1={PAD_L} y1={yAt(v)} x2={PAD_L + PW} y2={yAt(v)} stroke="var(--color-line)" strokeDasharray="2 3" opacity={0.6} />
              <text x={PAD_L - 5} y={yAt(v) + 3} textAnchor="end" fontSize={8} fill="var(--color-ink-3)">
                {v}
              </text>
            </g>
          ))}

        {points.map((p, i) => {
          if (p.semesterAverage === null) return null;
          const y = yAt(p.semesterAverage);
          return (
            <rect
              key={`bar-${p.semester}`}
              x={xAt(i) - barW / 2}
              y={y}
              width={barW}
              height={Math.max(1, PAD_T + PH - y)}
              rx={2}
              fill={p.simulated ? 'var(--color-accent-2-tint)' : 'var(--color-accent-tint-2)'}
            />
          );
        })}

        {points.length > 1 && <path d={line} fill="none" stroke="var(--color-accent)" strokeWidth={2} />}

        {points.map((p, i) => (
          <g key={p.semester}>
            <circle
              cx={xAt(i)}
              cy={yAt(p.cumulativeIra)}
              r={p.simulated ? 3.5 : 3}
              fill={p.simulated ? 'var(--color-accent-2-dark)' : 'var(--color-accent)'}
              stroke="var(--color-surface-raised)"
              strokeWidth={1.2}
            />
            {(points.length <= 8 || i === 0 || i === points.length - 1 || i % 2 === 0) && (
              <text x={xAt(i)} y={PAD_T + PH + 14} textAnchor="middle" fontSize={7.5} fill="var(--color-ink-3)">
                {p.semester}
              </text>
            )}
          </g>
        ))}

        <line x1={PAD_L} y1={PAD_T + PH} x2={PAD_L + PW} y2={PAD_T + PH} stroke="var(--color-line)" />
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-11 text-ink-3 mt-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-accent-tint-2 inline-block" />
          Média do semestre
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 border-t-2 border-accent inline-block" />
          IRA acumulado
        </span>
      </div>
    </Card>
  );
}
