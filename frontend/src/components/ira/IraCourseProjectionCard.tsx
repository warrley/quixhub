'use client';

import { Compass } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, CardKicker, CardTitle } from '@/components/Card';
import { Segmented } from '@/components/Segmented';
import type { IraEntry } from '@/data/types';
import { useCampusSnapshot } from '@/lib/campusSnapshotContext';
import { computeIraSensitivity } from '@/lib/ira';
import { clampIra } from '@/lib/statistics';
import { EmptyChart } from './chartKit';
import { fmt, linePath, pct } from './chartFormat';

const W = 400;
const H = 225;
const PAD_L = 48;
const PAD_R = 16;
const PAD_T = 24;
const PAD_B = 28;
const PW = W - PAD_L - PAD_R;
const PH = H - PAD_T - PAD_B;

/**
 * Course-level projection & cohort comparison card (sits next to Ranking):
 * - Projeção no curso: places your current relative percentile along the
 *   course's stage trajectory (1–2º sem → Formados) alongside the mathematical
 *   convergence from your recent semester average.
 * - Turmas do curso: compares active `.1` cohorts (Q1–Q3 box + median) with
 *   your IRA line so you see how freshmen vs veterans score.
 */
export function IraCourseProjectionCard({
  ira,
  entries,
  course,
  ingresso,
}: {
  ira: number;
  entries: IraEntry[];
  course: string | null;
  ingresso: string | null;
}) {
  const [tab, setTab] = useState<'projecao' | 'turmas'>('projecao');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hoverCohort, setHoverCohort] = useState<string | null>(null);

  const snapshot = useCampusSnapshot();
  const displayIra = clampIra(ira);
  const sensitivity = useMemo(() => computeIraSensitivity(entries), [entries]);

  const proj = snapshot?.available ? snapshot.projection : null;
  const pct01 = proj?.pct01 ?? 0;
  const stageLabel = proj?.stageLabel ?? 'curso';
  const trajectory = useMemo(
    () => proj?.trajectory ?? { stages: [], graduated: null },
    [proj],
  );
  const cohorts = useMemo(() => proj?.cohorts ?? [], [proj]);

  const allPoints = useMemo(
    () => (trajectory.graduated ? [...trajectory.stages, trajectory.graduated] : trajectory.stages),
    [trajectory],
  );

  // Trajectory SVG coordinates
  const minVal = Math.max(
    0,
    Math.floor((Math.min(...allPoints.map((p) => p.p25), displayIra, 6) - 0.4) * 2) / 2,
  );
  const span = Math.max(1, 10 - minVal);
  const slotW = PW / Math.max(1, allPoints.length);
  const txAt = (i: number) => PAD_L + (i + 0.5) * slotW;
  const tyAt = (v: number) => PAD_T + PH - ((Math.max(minVal, Math.min(10, v)) - minVal) / span) * PH;

  const band25_75 =
    allPoints.length >= 2
      ? `${linePath(allPoints.map((p, i) => ({ x: txAt(i), y: tyAt(p.p75) })))} ${[...allPoints]
          .reverse()
          .map((p, ri) => `L ${txAt(allPoints.length - 1 - ri).toFixed(2)} ${tyAt(p.p25).toFixed(2)}`)
          .join(' ')} Z`
      : '';
  const lineP90 = allPoints.length >= 2 ? linePath(allPoints.map((p, i) => ({ x: txAt(i), y: tyAt(p.p90) }))) : '';
  const lineP50 = allPoints.length >= 2 ? linePath(allPoints.map((p, i) => ({ x: txAt(i), y: tyAt(p.p50) }))) : '';
  const lineMyPct = allPoints.length >= 2 ? linePath(allPoints.map((p, i) => ({ x: txAt(i), y: tyAt(p.atMyPct) }))) : '';

  const activePoint = hoverIdx !== null ? allPoints[hoverIdx] : trajectory.graduated ?? allPoints[allPoints.length - 1];

  // Cohorts SVG coordinates (horizontal boxplots)
  const visibleCohorts = cohorts.slice(0, 8);
  const cMin = Math.max(0, Math.floor(Math.min(...visibleCohorts.map((c) => c.min), displayIra, 4)));
  const cxTo = (v: number) => PAD_L + ((Math.max(cMin, Math.min(10, v)) - cMin) / Math.max(1, 10 - cMin)) * PW;
  const rowH = PH / Math.max(1, visibleCohorts.length);
  const hoveredCohortObj = visibleCohorts.find((c) => c.ingresso === hoverCohort) ?? null;

  return (
    <Card padding="md" className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <CardKicker>Projeção no curso</CardKicker>
          <CardTitle>Onde seu ritmo leva em {course ?? 'Quixadá'}</CardTitle>
        </div>
        <Compass size={20} className="text-accent shrink-0 mt-1" aria-hidden />
      </div>

      <div className="mb-2.5">
        <Segmented<'projecao' | 'turmas'>
          size="sm"
          ariaLabel="Visão do curso"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'projecao', label: 'Projeção por percentil' },
            { value: 'turmas', label: 'Turmas do curso' },
          ]}
        />
      </div>

      {tab === 'projecao' ? (
        allPoints.length >= 2 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2.5">
              <div className="rounded-md px-3 py-2 bg-accent-tint/70 border border-accent/25">
                <div className="text-10 text-ink-3 uppercase font-bold">
                  Pelo seu percentil ({pct(pct01 * 100)} no {stageLabel})
                </div>
                <div className="font-heading font-extrabold text-17 text-accent-dark tabular-nums">
                  {trajectory.graduated ? fmt(trajectory.graduated.atMyPct, 4) : '—'}
                </div>
                <div className="text-10-5 text-ink-2">
                  {trajectory.graduated ? `entre ${trajectory.graduated.n} formados` : 'curso sem formados ainda'}
                </div>
              </div>

              <div className="rounded-md px-3 py-2 bg-surface-sunken border border-line">
                <div className="text-10 text-ink-3 uppercase font-bold">Pelo seu ritmo recente</div>
                <div className="font-heading font-extrabold text-17 text-ink tabular-nums">
                  {sensitivity?.projectedAtGraduation !== null && sensitivity?.projectedAtGraduation !== undefined
                    ? fmt(sensitivity.projectedAtGraduation, 4)
                    : '—'}
                </div>
                <div className="text-10-5 text-ink-2">
                  {sensitivity?.recentAverage !== null && sensitivity?.recentAverage !== undefined
                    ? `mantendo média ${fmt(sensitivity.recentAverage, 2)} até 3.200h`
                    : 'adicione mais semestres'}
                </div>
              </div>
            </div>

            <div className="text-11 text-ink-3 mb-1 min-h-[16px]">
              {activePoint && (
                <span>
                  <b className="text-ink">{activePoint.label}</b> ({activePoint.n} alunos) · seu percentil:{' '}
                  <b className="text-accent-dark tabular-nums">{fmt(activePoint.atMyPct, 2)}</b> · mediana:{' '}
                  <b className="text-ink tabular-nums">{fmt(activePoint.p50, 2)}</b>
                </span>
              )}
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto my-auto select-none">
              {[minVal, Number(((minVal + 10) / 2).toFixed(1)), 10]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((v) => (
                  <g key={v}>
                    <line x1={PAD_L} y1={tyAt(v)} x2={PAD_L + PW} y2={tyAt(v)} stroke="var(--color-line)" strokeDasharray="2 3" opacity={0.6} />
                    <text x={PAD_L - 6} y={tyAt(v) + 3} textAnchor="end" fontSize={8} fill="var(--color-ink-3)">
                      {v}
                    </text>
                  </g>
                ))}

              {/* Shaded P25–P75 */}
              {band25_75 && <path d={band25_75} fill="var(--color-surface-sunken)" opacity={0.95} />}
              {lineP90 && <path d={lineP90} fill="none" stroke="var(--color-good)" strokeWidth={1.1} strokeDasharray="2 3" opacity={0.7} />}
              {lineP50 && <path d={lineP50} fill="none" stroke="var(--color-ink-3)" strokeWidth={1.3} strokeDasharray="3 2" />}
              {lineMyPct && <path d={lineMyPct} fill="none" stroke="var(--color-accent)" strokeWidth={2.2} />}

              {allPoints.map((p, i) => {
                const cx = txAt(i);
                const cy = tyAt(p.atMyPct);
                const isGrad = p.label === 'Formados';
                const isHover = hoverIdx === i;
                return (
                  <g
                    key={p.label}
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect x={cx - slotW / 2} y={PAD_T} width={slotW} height={PH} fill="transparent" />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isHover ? 4.4 : isGrad ? 3.8 : 3}
                      fill={isGrad ? 'var(--color-accent-3)' : 'var(--color-accent)'}
                      stroke="var(--color-surface-raised)"
                      strokeWidth={1.3}
                    />
                    {(isHover || isGrad) && (
                      <text
                        x={cx}
                        y={Math.max(11, cy - 8)}
                        textAnchor="middle"
                        fontSize={7.5}
                        fontWeight={700}
                        fill={isGrad ? 'var(--color-accent-3)' : 'var(--color-accent-dark)'}
                      >
                        {fmt(p.atMyPct, 2)}
                      </text>
                    )}
                    <text x={cx} y={PAD_T + PH + 14} textAnchor="middle" fontSize={7.5} fontWeight={isGrad ? 700 : 400} fill={isGrad ? 'var(--color-ink)' : 'var(--color-ink-3)'}>
                      {p.label}
                    </text>
                  </g>
                );
              })}

              <line x1={PAD_L} y1={PAD_T + PH} x2={PAD_L + PW} y2={PAD_T + PH} stroke="var(--color-line)" />
            </svg>

            <div className="mt-2 pt-2 border-t border-line flex flex-wrap gap-x-4 gap-y-1 text-11 text-ink-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 border-t-2 border-accent inline-block" /> Seu percentil ao longo do curso
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 border-t border-dashed border-ink-3 inline-block" /> Mediana (P50)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 border-t border-dashed border-good inline-block" /> Top 10% (P90)
              </span>
            </div>
          </>
        ) : (
          <EmptyChart>Poucos dados longitudinais neste recorte para traçar projeção.</EmptyChart>
        )
      ) : visibleCohorts.length > 0 ? (
        <>
          <div className="text-11-5 text-ink-3 mb-2 min-h-[18px]">
            {hoveredCohortObj ? (
              <span>
                <b className="text-ink">Turma {hoveredCohortObj.ingresso}</b> ({hoveredCohortObj.n} ativos) · Q1{' '}
                <b className="text-ink tabular-nums">{fmt(hoveredCohortObj.q1, 2)}</b> · mediana{' '}
                <b className="text-ink tabular-nums">{fmt(hoveredCohortObj.median, 2)}</b> · Q3{' '}
                <b className="text-ink tabular-nums">{fmt(hoveredCohortObj.q3, 2)}</b>
              </span>
            ) : (
              'Faixa interquartil (Q1–Q3) e mediana de cada turma ativa vs. seu IRA'
            )}
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto my-auto select-none">
            <line x1={cxTo(displayIra)} y1={PAD_T - 4} x2={cxTo(displayIra)} y2={PAD_T + PH} stroke="var(--color-accent-3)" strokeWidth={1.4} strokeDasharray="3 2" />
            <text x={cxTo(displayIra)} y={PAD_T - 8} textAnchor="middle" fontSize={7.5} fontWeight={700} fill="var(--color-accent-3)">
              você {fmt(displayIra, 2)}
            </text>

            {visibleCohorts.map((c, idx) => {
              const cy = PAD_T + idx * rowH + rowH / 2;
              const isHover = hoverCohort === c.ingresso;
              const isMine = ingresso === c.ingresso;
              return (
                <g
                  key={c.ingresso}
                  onMouseEnter={() => setHoverCohort(c.ingresso)}
                  onMouseLeave={() => setHoverCohort(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {isHover && <rect x={0} y={cy - rowH / 2} width={W} height={rowH} fill="var(--color-surface-sunken)" opacity={0.7} rx={3} />}
                  <text
                    x={PAD_L - 6}
                    y={cy + 3}
                    textAnchor="end"
                    fontSize={8}
                    fontWeight={isMine || isHover ? 700 : 500}
                    fill={isMine ? 'var(--color-accent-dark)' : 'var(--color-ink-2)'}
                  >
                    {c.ingresso}
                  </text>
                  <line x1={cxTo(c.min)} y1={cy} x2={cxTo(c.max)} y2={cy} stroke="var(--color-line-strong)" strokeWidth={1.2} />
                  <rect
                    x={cxTo(c.q1)}
                    y={cy - 4.5}
                    width={Math.max(3, cxTo(c.q3) - cxTo(c.q1))}
                    height={9}
                    rx={2}
                    fill={isMine ? 'var(--color-accent-tint-2)' : 'var(--color-accent-tint)'}
                    stroke={isMine ? 'var(--color-accent)' : 'var(--color-accent-dark)'}
                    strokeWidth={isMine ? 1.2 : 0.7}
                  />
                  <circle cx={cxTo(c.median)} cy={cy} r={2.5} fill="var(--color-accent-dark)" />
                </g>
              );
            })}

            <line x1={PAD_L} y1={PAD_T + PH} x2={PAD_L + PW} y2={PAD_T + PH} stroke="var(--color-line)" />
            {[cMin, Math.round((cMin + 10) / 2), 10]
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((g) => (
                <text key={g} x={cxTo(g)} y={PAD_T + PH + 14} textAnchor="middle" fontSize={8} fill="var(--color-ink-3)">
                  {g}
                </text>
              ))}
          </svg>
        </>
      ) : (
        <EmptyChart>Sem turmas suficientes neste curso.</EmptyChart>
      )}
    </Card>
  );
}
