'use client';

import { useRef, useState } from 'react';
import { StatBar } from '@/components/StatBar';
import { clampIra, normalPdf, truncatedNormalCdf, zScore } from '@/lib/statistics';

const PLOT_WIDTH = 300;
// Breathing room reserved on each side of the plot so center-anchored
// labels at the domain edges (e.g. the "máx" tick at grade 10) never get
// clipped by the viewBox — this is what keeps edge labels visually aligned
// under their tick instead of having to right/left-anchor them.
const MARGIN = 34;
const WIDTH = PLOT_WIDTH + MARGIN * 2;
const HEIGHT = 200;
const BASELINE_Y = 150;
const TOP_Y = 20;
const CURVE_HEIGHT = BASELINE_Y - TOP_Y;
const CAP = 10;
const SAMPLES = 60;

// Low percentile reads cool/blue, high percentile reads warm/red — lets the
// hover marker communicate "how good" without relying on the tooltip text.
function percentileColor(percentile: number) {
  const hue = 210 - (Math.min(100, Math.max(0, percentile)) / 100) * 210;
  return `hsl(${hue}, 70%, 45%)`;
}

function StatBadge({ value, label, tone, tint }: { value: string; label: string; tone: string; tint: string }) {
  return (
    <div className="rounded-md px-4 py-3 text-center min-w-[110px] flex-1" style={{ background: tint }}>
      <div className="font-heading font-extrabold text-19" style={{ color: tone }}>
        {value}
      </div>
      <div className="text-10 text-ink-3 mt-0.5">{label}</div>
    </div>
  );
}

export function IraDistributionChart({
  ira,
  mean,
  std,
  students,
  courseName,
}: {
  ira: number;
  mean: number;
  std: number;
  students?: number;
  courseName?: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverGrade, setHoverGrade] = useState<number | null>(null);

  const displayIra = clampIra(ira);
  const truncated = ira > 10;
  const peak = normalPdf(mean, mean, std);

  // Crop the flat, mostly-empty tail below -2.5 std devs so the plot zooms
  // in on the range that actually matters, instead of always drawing the
  // full 0-10 domain. Extended to cover the student's own grade in the
  // rare case they sit further below the mean than that.
  const domainMin = Math.max(0, Math.min(mean - 2.5 * std, displayIra) - 0.3);

  function xToSvg(x: number) {
    return MARGIN + ((x - domainMin) / (CAP - domainMin)) * PLOT_WIDTH;
  }

  function svgToX(svgX: number) {
    return domainMin + ((svgX - MARGIN) / PLOT_WIDTH) * (CAP - domainMin);
  }

  function yToSvg(pdfValue: number) {
    return BASELINE_Y - (pdfValue / peak) * CURVE_HEIGHT;
  }

  const samples = Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const x = domainMin + (i / SAMPLES) * (CAP - domainMin);
    return { x, y: normalPdf(x, mean, std) };
  });

  const curvePath = samples.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xToSvg(p.x)} ${yToSvg(p.y)}`).join(' ');

  const fillSamples = samples.filter((p) => p.x <= displayIra);
  fillSamples.push({ x: displayIra, y: normalPdf(displayIra, mean, std) });
  const fillPath =
    fillSamples.length > 0
      ? `M ${xToSvg(domainMin)} ${BASELINE_Y} ` +
        fillSamples.map((p) => `L ${xToSvg(p.x)} ${yToSvg(p.y)}`).join(' ') +
        ` L ${xToSvg(displayIra)} ${BASELINE_Y} Z`
      : '';

  const meanX = xToSvg(mean);
  const markerX = xToSvg(displayIra);
  const markerY = yToSvg(normalPdf(displayIra, mean, std));
  const z = zScore(displayIra, mean, std);
  const percentileRaw = truncatedNormalCdf(displayIra, mean, std, CAP);
  const percentile = percentileRaw * 100;
  const rank = students ? Math.max(1, Math.ceil((1 - percentileRaw) * students)) : null;
  // IRA Geral: rescales the z-score so the course mean lands at 6 and each
  // std dev is worth 2 points, keeping the number comparable across courses
  // whose raw IRA distributions differ.
  const iraGeral = 6 + 2 * z;

  // Stagger labels onto a second row when adjacent ticks sit close enough
  // in pixel space that their text would overlap (e.g. +1dp landing right
  // next to the domain cap for low-std courses).
  const MIN_LABEL_GAP = 26;
  const referencePoints = [
    { x: Math.max(domainMin, mean - 2 * std), caption: '-2dp' },
    { x: Math.max(domainMin, mean - std), caption: '-1dp' },
    { x: mean, caption: 'média' },
    { x: Math.min(CAP, mean + std), caption: '+1dp' },
    { x: CAP, caption: 'máx' },
  ]
    .sort((a, b) => a.x - b.x)
    .reduce<{ x: number; caption: string; row: number }[]>((acc, p) => {
      const prev = acc[acc.length - 1];
      const px = xToSvg(p.x);
      const row = prev && px - xToSvg(prev.x) < MIN_LABEL_GAP ? (prev.row === 0 ? 1 : 0) : 0;
      acc.push({ ...p, row });
      return acc;
    }, []);

  function handleHoverMove(e: React.MouseEvent<SVGRectElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const localX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    setHoverGrade(Math.min(CAP, Math.max(domainMin, svgToX(localX))));
  }

  const hoverPercentile = hoverGrade !== null ? truncatedNormalCdf(hoverGrade, mean, std, CAP) * 100 : null;
  const hoverColor = hoverPercentile !== null ? percentileColor(hoverPercentile) : null;
  const hoverX = hoverGrade !== null ? xToSvg(hoverGrade) : null;
  const hoverY = hoverGrade !== null ? yToSvg(normalPdf(hoverGrade, mean, std)) : null;

  return (
    <div className="flex gap-6 flex-wrap md:flex-nowrap items-start">
      <div className="w-full md:w-1/2 shrink-0 flex justify-center">
        <div className="w-full">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto"
            role="img"
            aria-label="Distribuição de IRA do curso — passe o mouse para ver o percentil em cada nota"
          >
            <line x1={MARGIN} y1={BASELINE_Y} x2={MARGIN + PLOT_WIDTH} y2={BASELINE_Y} stroke="var(--color-line)" strokeWidth={1} />

            {fillPath && <path d={fillPath} fill="var(--color-accent-tint)" />}
            <path d={curvePath} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} />

            <line
              x1={meanX}
              y1={TOP_Y}
              x2={meanX}
              y2={BASELINE_Y}
              stroke="var(--color-ink-3)"
              strokeWidth={1}
              strokeDasharray="2 2"
            />

            {referencePoints.map((p) => {
              const x = xToSvg(p.x);
              const rowOffset = p.row * 16;
              return (
                <g key={p.caption}>
                  <line x1={x} y1={BASELINE_Y} x2={x} y2={BASELINE_Y + 3} stroke="var(--color-ink-3)" strokeWidth={1} />
                  <text x={x} y={BASELINE_Y + 12 + rowOffset} textAnchor="middle" fontSize={7} fill="var(--color-ink-2)">
                    {p.x.toFixed(2)}
                  </text>
                  <text x={x} y={BASELINE_Y + 20 + rowOffset} textAnchor="middle" fontSize={6} fill="var(--color-ink-3)">
                    {p.caption}
                  </text>
                </g>
              );
            })}

            <line x1={markerX} y1={markerY} x2={markerX} y2={BASELINE_Y} stroke="var(--color-accent-3)" strokeWidth={1.5} />
            <circle cx={markerX} cy={markerY} r={3} fill="var(--color-accent-3)" />
            <text x={markerX} y={markerY - 6} textAnchor="middle" fontSize={8} fontWeight={700} fill="var(--color-accent-3)">
              você {displayIra.toFixed(2)}
            </text>

            {hoverGrade !== null && hoverX !== null && hoverY !== null && hoverColor !== null && (
              <g pointerEvents="none">
                <line x1={hoverX} y1={TOP_Y} x2={hoverX} y2={BASELINE_Y} stroke={hoverColor} strokeWidth={1} strokeDasharray="1.5 1.5" />
                <circle cx={hoverX} cy={hoverY} r={3.5} fill={hoverColor} stroke="var(--color-surface)" strokeWidth={1} />
                <text x={hoverX} y={TOP_Y - 4} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={hoverColor}>
                  {hoverGrade.toFixed(2)} · {hoverPercentile!.toFixed(2)}%
                </text>
              </g>
            )}

            <rect
              x={MARGIN}
              y={TOP_Y}
              width={PLOT_WIDTH}
              height={BASELINE_Y - TOP_Y}
              fill="transparent"
              style={{ cursor: 'crosshair' }}
              onMouseMove={handleHoverMove}
              onMouseLeave={() => setHoverGrade(null)}
            />
          </svg>

          {truncated && (
            <p className="text-10 text-ink-3 mt-1">Truncado em 10 (valor calculado: {ira.toFixed(4)}).</p>
          )}

          <div className="mt-2">
            <StatBar
              label="Percentil no curso"
              value={`${percentile.toFixed(2)}%`}
              percent={Math.min(100, Math.max(0, percentile))}
              tone="var(--color-accent-3)"
            />
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/2">
        {courseName && (
          <div
            className="rounded-md pl-3 pr-4 py-2.5 mb-4 border-l-[3px]"
            style={{ borderColor: 'var(--color-accent)', background: 'var(--color-surface-sunken)' }}
          >
            <div className="text-10 text-ink-3 uppercase tracking-wide">Curso</div>
            <div className="font-heading font-bold text-15 text-ink leading-tight">{courseName}</div>
            <div className="flex gap-4 text-11-5 text-ink-2 mt-1">
              <span>
                média <b className="text-ink">{mean.toFixed(4)}</b>
              </span>
              <span>
                desvio padrão <b className="text-ink">{std.toFixed(4)}</b>
              </span>
            </div>
          </div>
        )}

        {/* IRA individual is the primary stat on this screen — sized and
            weighted well above everything else so it reads first. */}
        <div className="rounded-md px-5 py-4 mb-3" style={{ background: 'var(--color-accent-tint)' }}>
          <div className="font-heading font-extrabold text-28 leading-none" style={{ color: 'var(--color-accent)' }}>
            {displayIra.toFixed(4)}
          </div>
          <div className="text-11-5 text-ink-3 mt-1 uppercase tracking-wide">IRA individual</div>
        </div>

        <div className="flex gap-3 flex-wrap mb-3">
          <StatBadge
            value={iraGeral.toFixed(4)}
            label="IRA Geral"
            tone="var(--color-accent-3)"
            tint="var(--color-accent-3-tint)"
          />
          <StatBadge
            value={`${percentile.toFixed(2)}%`}
            label="Percentil no curso"
            tone="var(--color-accent-2-dark)"
            tint="var(--color-accent-2-tint)"
          />
        </div>

        {rank !== null && (
          <p className="text-13 text-ink">
            <b>~{rank}º</b> <span className="text-ink-3">de {students} alunos · posição estimada</span>
          </p>
        )}
      </div>
    </div>
  );
}
