'use client';

import { Waves } from 'lucide-react';
import { useMemo } from 'react';
import { Card, CardKicker, CardTitle } from '@/components/Card';
import { MIN_GROUP_SIZE, kde, percentileBelow, summarize, type StatusGroup } from '@/lib/iraCampus';
import { CAMPUS_COURSES, groupIras } from '@/lib/iraCampusData';
import { clampIra } from '@/lib/statistics';
import { fmt, linePath, pct } from './chartFormat';

const SAMPLES = 100;
const DOMAIN_MIN = 3;
const CAP = 10;

// Short labels for compact alignment on mobile + desktop.
const SHORT_COURSE: Record<string, string> = {
  'Ciência da Computação': 'Ciência da Comp.',
  'Design Digital': 'Design Digital',
  'Engenharia de Computação': 'Eng. Computação',
  'Engenharia de Software': 'Eng. Software',
  'Inteligência Artificial': 'Inteligência Artif.',
  'Redes de Computadores': 'Redes de Comp.',
  'Sistemas de Informação': 'Sist. Informação',
};

/**
 * Ridgeline ("joyplot"): compares your IRA simultaneously across all 7
 * Quixadá programs using their real KDE curves, showing where you would sit
 * in each course. Clicking any row focuses that course in the main chart.
 */
export function IraCourseRidgeline({
  ira,
  selectedCourse,
  group,
  onSelectCourse,
}: {
  ira: number;
  selectedCourse: string | null;
  group: StatusGroup;
  onSelectCourse: (course: string) => void;
}) {
  const displayIra = clampIra(ira);
  const xs = useMemo(
    () => Array.from({ length: SAMPLES + 1 }, (_, i) => DOMAIN_MIN + (i / SAMPLES) * (CAP - DOMAIN_MIN)),
    [],
  );

  const rows = useMemo(() => {
    const raw = CAMPUS_COURSES.map((course) => {
      const values = groupIras(course, group);
      const sum = summarize(values);
      if (!sum || sum.n < MIN_GROUP_SIZE) {
        return { course, n: values.length, median: null, percentile: null, density: [] as number[] };
      }
      return {
        course,
        n: sum.n,
        median: sum.median,
        percentile: percentileBelow(values, displayIra),
        density: kde(values, xs),
      };
    });
    const peak = Math.max(1e-6, ...raw.flatMap((r) => r.density));
    return raw
      .map((r) => ({ ...r, peak }))
      .sort((a, b) => (b.median ?? -1) - (a.median ?? -1));
  }, [group, displayIra, xs]);

  const xPct = (x: number) => Math.max(0, Math.min(100, ((x - DOMAIN_MIN) / (CAP - DOMAIN_MIN)) * 100));
  const markerLeft = xPct(displayIra);

  return (
    <Card padding="md" className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <CardKicker>Panorama do campus</CardKicker>
          <CardTitle>E se você fosse de outro curso?</CardTitle>
        </div>
        <Waves size={20} className="text-accent shrink-0 mt-1" aria-hidden />
      </div>

      <p className="text-12 text-ink-3 mb-4">
        Seu IRA (<b className="text-ink tabular-nums">{fmt(displayIra, 4)}</b>) cruzando a distribuição real de cada curso. Clique em um curso para
        comparar no gráfico acima.
      </p>

      <div className="relative flex flex-col gap-1.5 flex-1 justify-center">
        {rows.map((r) => {
          const active = r.course === selectedCourse;
          const hasData = r.median !== null && r.percentile !== null;
          const W = 220;
          const H = 26;
          const pts = r.density.map((d, i) => ({
            x: (i / SAMPLES) * W,
            y: H - 2 - (d / r.peak) * (H - 5),
          }));
          const stroke = linePath(pts);
          const fill = pts.length > 0 ? `${stroke} L ${W} ${H - 2} L 0 ${H - 2} Z` : '';

          return (
            <button
              key={r.course}
              type="button"
              onClick={() => onSelectCourse(r.course)}
              className={`group grid grid-cols-[126px_1fr_54px] items-center gap-2.5 px-2 py-1 rounded-md text-left cursor-pointer transition-colors ${
                active ? 'bg-accent-tint/70' : 'hover:bg-surface-sunken'
              }`}
            >
              <div className="min-w-0">
                <div className={`text-12 truncate ${active ? 'font-heading font-bold text-accent-dark' : 'font-medium text-ink'}`}>
                  {SHORT_COURSE[r.course] ?? r.course}
                </div>
                <div className="text-10 text-ink-3">
                  {hasData ? `med. ${fmt(r.median!, 4)} · n=${r.n}` : `n=${r.n} (insuficiente)`}
                </div>
              </div>

              <div className="relative h-7">
                {hasData ? (
                  <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
                    <path d={fill} fill={active ? 'var(--color-accent-tint-2)' : 'var(--color-surface-sunken)'} />
                    <path
                      d={stroke}
                      fill="none"
                      stroke={active ? 'var(--color-accent)' : 'var(--color-ink-3)'}
                      strokeWidth={active ? 1.8 : 1.2}
                    />
                    <line
                      x1={(markerLeft / 100) * W}
                      y1={0}
                      x2={(markerLeft / 100) * W}
                      y2={H - 1}
                      stroke="var(--color-accent-3)"
                      strokeWidth={1.5}
                      strokeDasharray={active ? undefined : '2 2'}
                    />
                  </svg>
                ) : (
                  <div className="h-full flex items-center text-10 text-ink-3">poucos dados</div>
                )}
              </div>

              <div className="text-right tabular-nums">
                {hasData ? (
                  <span className={`font-heading font-bold text-12-5 ${active ? 'text-accent-dark' : 'text-ink-2'}`}>
                    {pct(r.percentile!)}
                  </span>
                ) : (
                  <span className="text-11 text-ink-3">—</span>
                )}
              </div>
            </button>
          );
        })}

        {/* Axis labels aligned with the ridgeline plot column */}
        <div className="grid grid-cols-[126px_1fr_54px] items-center gap-2.5 px-2 pt-1 text-10 text-ink-3">
          <span />
          <div className="flex justify-between">
            <span>{DOMAIN_MIN}</span>
            <span>5</span>
            <span>7</span>
            <span>9</span>
            <span>{CAP}</span>
          </div>
          <span className="text-right">supera</span>
        </div>
      </div>
    </Card>
  );
}
