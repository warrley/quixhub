'use client';

import { ChartColumn, ChartSpline, CircleDot } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { StatBar } from '@/components/StatBar';
import { Segmented } from '@/components/Segmented';
import { clampIra, normalPdf, truncatedNormalCdf } from '@/lib/statistics';
import { MIN_GROUP_SIZE, histogram, iraGeral, kde, percentileBelow, quantile, summarize, type StatusGroup } from '@/lib/iraCampus';
import { CAMPUS_COURSES, CAMPUS_UPDATED_AT, groupIras, groupSummary } from '@/lib/iraCampusData';
import { EmptyChart, StatBadge } from './chartKit';
import { MARGIN, PLOT_WIDTH, WIDTH, fmt, linePath, ordinal, pct, plural } from './chartFormat';

const HEIGHT = 210;
const TOP_Y = 30;
const BASELINE_Y = 165;
const CHART_H = BASELINE_Y - TOP_Y;
const CAP = 10;
const DOT_BIN = 0.2;
const BAR_BIN = 0.25;
const KDE_SAMPLES = 140;

export type DistributionMode = 'pontos' | 'histograma' | 'normal';

const GROUP_LABEL: Record<StatusGroup, string> = {
  ativos: 'alunos ativos',
  formados: 'formados',
  todos: 'alunos (ativos + formados)',
};

/**
 * The student's IRA against the *real* distribution of a course (or the
 * whole campus): every dot is a student — or a fixed group of students when
 * the stack would overflow — binned at 0.1, with a KDE silhouette on top.
 * Histogram mode swaps the dots for 0.25-wide bars.
 */
export function IraRealDistributionChart({
  ira,
  officialIra,
  ghostIra,
  course,
  group,
  onCourseChange,
}: {
  ira: number;
  /** Real IRA excluding predicted entries — kept side-by-side when predictions exist. */
  officialIra?: number | null;
  /** A simulated IRA (from the "e se" simulator), drawn as a brown dashed marker. */
  ghostIra?: number | null;
  /** null = whole campus. */
  course: string | null;
  group: StatusGroup;
  onCourseChange: (course: string | null) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mode, setMode] = useState<DistributionMode>('pontos');
  const [hoverGrade, setHoverGrade] = useState<number | null>(null);

  const hasPrediction = officialIra !== undefined && officialIra !== null && Math.abs(officialIra - ira) > 1e-6;
  const displayIra = clampIra(officialIra ?? ira);
  const predictedIra = hasPrediction ? clampIra(ira) : null;
  const brownMarkerIra = ghostIra !== null && ghostIra !== undefined ? clampIra(ghostIra) : predictedIra;
  const brownMarkerLabel = ghostIra !== null && ghostIra !== undefined ? 'simulado' : 'previsão';

  const values = useMemo(() => groupIras(course, group), [course, group]);
  const summary = useMemo(() => summarize(values), [values]);
  const ativos = course ? groupSummary(course, 'ativos') : null;

  const enough = summary !== null && summary.n >= MIN_GROUP_SIZE;

  // Zoom onto where the students actually are: crop the sparse bottom 2%
  // (shown as a "N abaixo" note instead), but always keep your own IRA in.
  const sortedAsc = useMemo(() => [...values].sort((a, b) => a - b), [values]);
  const domainMin = enough
    ? Math.max(0, Math.floor((Math.min(quantile(sortedAsc, 0.02), displayIra, brownMarkerIra ?? CAP) - 0.2) * 2) / 2)
    : 0;
  const inDomain = useMemo(() => values.filter((v) => v >= domainMin), [values, domainMin]);
  const belowDomain = values.length - inDomain.length;

  const xToSvg = (x: number) => MARGIN + ((x - domainMin) / (CAP - domainMin)) * PLOT_WIDTH;
  const svgToX = (svgX: number) => domainMin + ((svgX - MARGIN) / PLOT_WIDTH) * (CAP - domainMin);

  const binWidth = mode === 'pontos' ? DOT_BIN : BAR_BIN;
  const bins = useMemo(() => histogram(inDomain, binWidth, domainMin, CAP), [inDomain, binWidth, domainMin]);
  const maxCount = Math.max(1, ...bins.map((b) => b.count));

  // Dot geometry: one column per 0.2 bin; size dots up to fill the column
  // width and chart height, grouping into `perDot` students only when needed.
  const colW = PLOT_WIDTH / bins.length;
  const maxR = Math.min(colW * 0.44, 4.4);
  const minR = Math.min(maxR, 2.6);
  const gap = 0.8;
  const minPitch = 2 * minR + gap;
  const maxStacksAllowed = Math.max(1, Math.floor(CHART_H / minPitch));
  const perDot = Math.max(1, Math.ceil(maxCount / maxStacksAllowed));
  const tallestStack = Math.max(1, Math.ceil(maxCount / perDot));
  const r = Math.max(minR, Math.min(maxR, (CHART_H / tallestStack - gap) / 2));
  const pitch = 2 * r + gap;

  const xs = useMemo(
    () => Array.from({ length: KDE_SAMPLES + 1 }, (_, i) => domainMin + (i / KDE_SAMPLES) * (CAP - domainMin)),
    [domainMin],
  );
  const density = useMemo(() => kde(inDomain, xs), [inDomain, xs]);
  // Density → expected students per bin, on the same vertical scale as the
  // dots/bars, so the silhouette hugs them.
  const expected = density.map((d) => d * inDomain.length * binWidth);
  const barScale = CHART_H / Math.max(maxCount, ...expected);
  const countToY = (count: number) =>
    mode === 'pontos' ? BASELINE_Y - (count / perDot) * pitch : BASELINE_Y - count * barScale;
  const silhouette = linePath(xs.map((x, i) => ({ x: xToSvg(x), y: Math.max(TOP_Y - 6, countToY(expected[i])) })));
  const silhouetteFill = `${silhouette} L ${xToSvg(CAP)} ${BASELINE_Y} L ${xToSvg(domainMin)} ${BASELINE_Y} Z`;

  const normalPeak = summary && summary.std > 0 ? normalPdf(summary.mean, summary.mean, summary.std) : 1;
  const { normalLine, normalFill } = useMemo(() => {
    if (!summary || summary.std <= 0) return { normalLine: '', normalFill: '' };
    const toX = (x: number) => MARGIN + ((x - domainMin) / (CAP - domainMin)) * PLOT_WIDTH;
    const toY = (x: number) => BASELINE_Y - (normalPdf(x, summary.mean, summary.std) / normalPeak) * CHART_H;
    const line = linePath(xs.map((x) => ({ x: toX(x), y: toY(x) })));
    const below = xs.filter((x) => x <= displayIra);
    below.push(displayIra);
    const fill = `${linePath(below.map((x) => ({ x: toX(x), y: toY(x) })))} L ${toX(displayIra).toFixed(2)} ${BASELINE_Y} L ${toX(domainMin).toFixed(2)} ${BASELINE_Y} Z`;
    return { normalLine: line, normalFill: fill };
  }, [summary, xs, displayIra, normalPeak, domainMin]);

  const percentile = percentileBelow(values, displayIra);
  const rank = values.filter((v) => v > displayIra).length + 1;
  const predictedRank = predictedIra !== null ? values.filter((v) => v > predictedIra).length + 1 : null;
  const predictedPercentile = predictedIra !== null ? percentileBelow(values, predictedIra) : null;
  const normalGuess = summary && summary.std > 0 ? truncatedNormalCdf(displayIra, summary.mean, summary.std, CAP) * 100 : null;
  const geral = ativos ? iraGeral(displayIra, ativos.mean, ativos.std) : null;

  const hoverBin = hoverGrade !== null ? bins.find((b) => hoverGrade >= b.start && hoverGrade < b.end) ?? bins[bins.length - 1] : null;

  function handleMove(e: React.MouseEvent<SVGRectElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const localX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    setHoverGrade(Math.min(CAP - 1e-6, Math.max(domainMin, svgToX(localX))));
  }

  const ticks: number[] = [];
  for (let t = Math.ceil(domainMin); t <= CAP; t++) ticks.push(t);

  const youX = xToSvg(displayIra);
  const ghostX = brownMarkerIra !== null ? xToSvg(brownMarkerIra) : null;
  const scopeLabel = course ?? 'todo o campus';

  return (
    <div className="flex gap-6 flex-wrap md:flex-nowrap items-start">
      <div className="w-full md:w-1/2 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-11 text-ink-3">
            {enough ? (
              mode === 'pontos' ? (
                perDot === 1 ? (
                  <>
                    cada ponto = <b className="text-ink-2">1 aluno</b>
                  </>
                ) : (
                  <>
                    cada ponto = <b className="text-ink-2">{perDot} alunos</b>
                  </>
                )
              ) : mode === 'histograma' ? (
                <>faixas de {fmt(BAR_BIN)} ponto</>
              ) : (
                <>curva normal (média e desvio)</>
              )
            ) : null}
          </span>
          <Segmented
            size="sm"
            ariaLabel="Tipo de gráfico"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'pontos', label: <CircleDot size={13} aria-label="Pontos" />, title: 'Um ponto por aluno' },
              { value: 'histograma', label: <ChartColumn size={13} aria-label="Histograma" />, title: 'Histograma' },
              { value: 'normal', label: <ChartSpline size={13} aria-label="Curva normal" />, title: 'Curva normal (média e desvio padrão)' },
            ]}
          />
        </div>

        {enough ? (
          <>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="w-full h-auto select-none"
              role="img"
              aria-label={`Distribuição real de IRA — ${plural(values.length, 'aluno', 'alunos')} de ${scopeLabel}; você supera ${pct(percentile)}`}
            >
              {mode === 'normal' ? (
                <>
                  {normalFill && <path d={normalFill} fill="var(--color-accent-tint)" />}
                  {normalLine && <path d={normalLine} fill="none" stroke="var(--color-accent)" strokeWidth={1.6} />}
                </>
              ) : (
                <>
                  <path d={silhouetteFill} fill="var(--color-accent-tint)" opacity={0.45} />

                  {mode === 'pontos'
                    ? bins.flatMap((b, i) => {
                        const dots = Math.ceil(b.count / perDot);
                        const cx = xToSvg(b.start + DOT_BIN / 2);
                        const surpassed = b.end <= displayIra + 1e-9;
                        const hovered = hoverBin === b;
                        return Array.from({ length: dots }, (_, k) => (
                          <circle
                            key={`${i}-${k}`}
                            cx={cx}
                            cy={BASELINE_Y - r - 0.4 - k * pitch}
                            r={r}
                            fill={surpassed ? 'var(--color-accent)' : 'var(--color-line-strong)'}
                            opacity={hovered ? 1 : surpassed ? 0.85 : 0.75}
                          />
                        ));
                      })
                    : bins.map((b, i) => {
                        const x0 = xToSvg(b.start) + 0.6;
                        const w = Math.max(0.5, xToSvg(b.end) - xToSvg(b.start) - 1.2);
                        const h = b.count * barScale;
                        const surpassed = b.end <= displayIra + 1e-9;
                        return (
                          <rect
                            key={i}
                            x={x0}
                            y={BASELINE_Y - h}
                            width={w}
                            height={h}
                            rx={1.5}
                            fill={surpassed ? 'var(--color-accent)' : 'var(--color-line-strong)'}
                            opacity={hoverBin === b ? 1 : 0.8}
                          />
                        );
                      })}

                  <path d={silhouette} fill="none" stroke="var(--color-accent-dark)" strokeWidth={1.3} opacity={0.7} />
                </>
              )}

              <line x1={MARGIN} y1={BASELINE_Y} x2={MARGIN + PLOT_WIDTH} y2={BASELINE_Y} stroke="var(--color-line)" />
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={xToSvg(t)} y1={BASELINE_Y} x2={xToSvg(t)} y2={BASELINE_Y + 3} stroke="var(--color-ink-3)" />
                  <text x={xToSvg(t)} y={BASELINE_Y + 12} textAnchor="middle" fontSize={7} fill="var(--color-ink-2)">
                    {t}
                  </text>
                </g>
              ))}

              {summary && (
                <g>
                  <line
                    x1={xToSvg(summary.median)}
                    y1={TOP_Y}
                    x2={xToSvg(summary.median)}
                    y2={BASELINE_Y}
                    stroke="var(--color-ink-3)"
                    strokeDasharray="2 2"
                  />
                  <text x={xToSvg(summary.median)} y={BASELINE_Y + 21} textAnchor="middle" fontSize={6} fill="var(--color-ink-3)">
                    mediana {fmt(summary.median, 4)}
                  </text>
                </g>
              )}

              {belowDomain > 0 && (
                <text x={MARGIN} y={BASELINE_Y + 30} fontSize={6} fill="var(--color-ink-3)">
                  ← {plural(belowDomain, 'aluno', 'alunos')} abaixo de {fmt(domainMin, 1)}
                </text>
              )}

              {ghostX !== null && brownMarkerIra !== null && (
                <g>
                  <line x1={ghostX} y1={TOP_Y + 4} x2={ghostX} y2={BASELINE_Y} stroke="var(--color-accent-2-dark)" strokeWidth={1.5} strokeDasharray="3 2" />
                  <circle cx={ghostX} cy={TOP_Y + 4} r={2.4} fill="var(--color-accent-2-dark)" />
                  <text
                    x={ghostX + (ghostX >= youX ? 3 : -3)}
                    y={TOP_Y + 12}
                    textAnchor={ghostX >= youX ? 'start' : 'end'}
                    fontSize={7}
                    fontWeight={700}
                    fill="var(--color-accent-2-dark)"
                  >
                    {brownMarkerLabel} {fmt(brownMarkerIra, 4)}
                  </text>
                </g>
              )}

              <line x1={youX} y1={TOP_Y - 2} x2={youX} y2={BASELINE_Y} stroke="var(--color-accent-3)" strokeWidth={1.6} />
              <circle cx={youX} cy={TOP_Y - 2} r={2.6} fill="var(--color-accent-3)" />
              <text x={youX} y={TOP_Y - 7} textAnchor="middle" fontSize={8} fontWeight={700} fill="var(--color-accent-3)">
                {hasPrediction ? `real ${fmt(displayIra, 4)}` : `você ${fmt(displayIra, 4)}`}
              </text>

              {hoverBin && hoverGrade !== null && (
                <g pointerEvents="none">
                  <rect
                    x={xToSvg(hoverBin.start)}
                    y={TOP_Y}
                    width={xToSvg(hoverBin.end) - xToSvg(hoverBin.start)}
                    height={CHART_H}
                    fill="var(--color-accent-3)"
                    opacity={0.08}
                  />
                  <text x={WIDTH / 2} y={9} textAnchor="middle" fontSize={7.5} fontWeight={700} fill="var(--color-ink)">
                    {fmt(hoverBin.start)}–{fmt(Math.min(CAP, hoverBin.end - 0.01))} · {plural(hoverBin.count, 'aluno', 'alunos')} · com{' '}
                    {fmt(hoverBin.start)} você superaria {pct(percentileBelow(values, hoverBin.start))}
                  </text>
                </g>
              )}

              <rect
                x={MARGIN}
                y={TOP_Y - 10}
                width={PLOT_WIDTH}
                height={CHART_H + 10}
                fill="transparent"
                style={{ cursor: 'crosshair' }}
                onMouseMove={handleMove}
                onMouseLeave={() => setHoverGrade(null)}
              />
            </svg>
            {ira > CAP && <p className="text-10 text-ink-3 mt-1">Truncado em 10 (valor calculado: {ira.toFixed(4)}).</p>}
            <div className="mt-2">
              <StatBar
                label="Alunos que você supera"
                value={pct(percentile)}
                percent={Math.min(100, Math.max(0, percentile))}
                tone="var(--color-accent-3)"
              />
            </div>
          </>
        ) : (
          <EmptyChart>Poucos alunos neste recorte para mostrar a distribuição (mínimo {MIN_GROUP_SIZE}).</EmptyChart>
        )}
      </div>

      <div className="w-full md:w-1/2">
        <div
          className="rounded-md pl-3 pr-4 py-3 mb-4 border-l-[3px] shadow-sm"
          style={{ borderColor: 'var(--color-accent)', background: 'var(--color-surface-sunken)' }}
        >
          <div className="text-10 text-ink-3 uppercase tracking-wide font-bold mb-1">Comparar com</div>
          <div className="relative">
            <select
              value={course ?? ''}
              onChange={(e) => onCourseChange(e.target.value || null)}
              className="font-heading font-bold text-15 text-ink bg-surface border border-line rounded-md outline-none cursor-pointer w-full py-1.5 pl-2.5 pr-8 hover:border-accent focus:border-accent focus:ring-1 focus:ring-accent transition-all appearance-none"
            >
              <option value="">Todo o campus</option>
              {CAMPUS_COURSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-ink-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>
          {summary ? (
            <div className="flex gap-x-4 gap-y-1 flex-wrap text-11-5 text-ink-2 mt-2">
              <span>
                <b className="text-ink">{summary.n.toLocaleString('pt-BR')}</b> {GROUP_LABEL[group]}
              </span>
              <span>
                média <b className="text-ink tabular-nums">{fmt(summary.mean, 4)}</b>
              </span>
              <span>
                mediana <b className="text-ink tabular-nums">{fmt(summary.median, 4)}</b>
              </span>
              <span>
                desvio padrão <b className="text-ink tabular-nums">{fmt(summary.std, 4)}</b>
              </span>
            </div>
          ) : (
            <div className="text-11-5 text-ink-3 mt-2">Sem dados para este recorte</div>
          )}
        </div>

        <div className={`grid gap-3 mb-3 ${predictedIra !== null ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
          <div className="rounded-md px-5 py-4" style={{ background: 'var(--color-accent-tint)' }}>
            <div className="font-heading font-extrabold text-25 leading-none tabular-nums" style={{ color: 'var(--color-accent)' }}>
              {displayIra.toFixed(4)}
            </div>
            <div className="text-11 text-ink-3 mt-1.5 uppercase tracking-wide">
              {predictedIra !== null ? 'IRA individual (real)' : 'IRA individual'}
            </div>
          </div>

          {predictedIra !== null && (
            <div
              className="rounded-md px-5 py-4 border border-dashed"
              style={{ background: 'var(--color-accent-2-tint)', borderColor: 'var(--color-accent-2-dark)' }}
            >
              <div className="flex items-baseline gap-2">
                <span className="font-heading font-extrabold text-25 leading-none tabular-nums text-accent-2-dark">
                  {predictedIra.toFixed(4)}
                </span>
                <span className="text-11 font-bold tabular-nums text-accent-2-dark">
                  ({predictedIra - displayIra >= 0 ? '+' : ''}
                  {(predictedIra - displayIra).toFixed(4)})
                </span>
              </div>
              <div className="text-11 text-accent-2-dark mt-1.5 uppercase tracking-wide font-semibold">
                IRA previsto (estimativa)
              </div>
            </div>
          )}
        </div>

        {enough && (
          <>
            <div className="flex gap-3 flex-wrap mb-3">
              <StatBadge
                value={pct(percentile)}
                label={predictedPercentile !== null ? `Percentil real (prev.: ${pct(predictedPercentile)})` : 'Percentil real'}
                tone="var(--color-accent-2-dark)"
                tint="var(--color-accent-2-tint)"
              />
              {geral !== null && (
                <StatBadge
                  value={geral.toFixed(4)}
                  label="IRA Geral (real)"
                  tone="var(--color-accent-3)"
                  tint="var(--color-accent-3-tint)"
                  title="Mesma fórmula do IRA-G do SIGAA (média 6, 2 pontos por desvio padrão dos ativos do curso) — conferida contra o IRA-G real da planilha."
                />
              )}
            </div>
            <p className="text-13 text-ink">
              <b>{ordinal(rank)}</b>{' '}
              <span className="text-ink-3">
                de {(values.length + 1).toLocaleString('pt-BR')} · posição real entre {GROUP_LABEL[group]} · SIGAA {CAMPUS_UPDATED_AT}
              </span>
            </p>
            {predictedRank !== null && (
              <p className="text-12-5 text-accent-2-dark font-semibold mt-1">
                Com as notas previstas: <b>{ordinal(predictedRank)}</b>
                {predictedRank !== rank && (
                  <span>
                    {' '}
                    ({predictedRank < rank ? `+${rank - predictedRank} pos.` : `${rank - predictedRank} pos.`})
                  </span>
                )}
              </p>
            )}
            {normalGuess !== null && Math.abs(normalGuess - percentile) >= 0.5 && (
              <p className="text-11-5 text-ink-3 mt-1.5">
                A curva normal estimaria {pct(normalGuess)} — {normalGuess > percentile ? 'otimista' : 'pessimista'} em{' '}
                {Math.abs(normalGuess - percentile).toFixed(1)} pontos percentuais.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
