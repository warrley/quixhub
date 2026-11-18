'use client';

import { useMemo } from 'react';
import type { IraEntry } from '@/data/types';
import type { DisciplineBubble } from '@/lib/ira';
import { clampIra } from '@/lib/statistics';
import { fmt, linePath } from './chartFormat';
import { dotColorByImpact } from './personalColors';

const ISO_DELTAS = [-0.1, -0.05, -0.02, 0.02, 0.05, 0.1];

const SEMANTIC_WEIGHT_TICKS: { weight: number; label: string }[] = [
  { weight: 64, label: '64 (1×64h)' },
  { weight: 128, label: '128 (2×64h)' },
  { weight: 192, label: '192 (3×64h)' },
  { weight: 384, label: '384 (6×64h)' },
  { weight: 576, label: '576 (6×96h)' },
];

/**
 * Leverage Bubble Map (`Nota × Peso efetivo`):
 * Plots every graded or withdrawn discipline with dashed iso-impact contours
 * (`±0.02`, `±0.05`, `±0.10`), semantic workload-weight axis labels, and
 * collision-free callout annotations on the strongest drivers.
 */
export function BubblesPlot({
  ira,
  entries,
  bubbles,
  focusSemester,
  activeId,
  onHover,
  onSelect,
  large = false,
}: {
  ira: number;
  entries: IraEntry[];
  bubbles: DisciplineBubble[];
  focusSemester: string;
  activeId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  large?: boolean;
}) {
  const plotted = useMemo(() => {
    const seen = new Map<string, number>();
    return bubbles.map((b) => {
      const key = `${b.grade.toFixed(1)}|${b.effectiveWeight}`;
      const idx = seen.get(key) ?? 0;
      seen.set(key, idx + 1);
      const angle = idx * 2.39996;
      const dist = idx === 0 ? 0 : Math.min(11, 3.6 + idx * 1.9);
      return { ...b, jx: Math.cos(angle) * dist, jy: Math.sin(angle) * dist };
    });
  }, [bubbles]);

  const W = large ? 1080 : 880;
  const H = large ? 500 : 360;
  const PAD_L = large ? 86 : 80;
  const PAD_R = 26;
  const PAD_T = 32;
  const PAD_B = 42;
  const PW = W - PAD_L - PAD_R;
  const PH = H - PAD_T - PAD_B;

  const displayIra = clampIra(ira);
  const maxEffWeight = Math.max(64, ...bubbles.map((b) => b.effectiveWeight));
  const yMax = Math.max(128, Math.ceil((maxEffWeight * 1.12) / 32) * 32);
  const maxDelta = Math.max(0.001, ...bubbles.map((b) => Math.abs(b.delta)));
  const minGrade = Math.max(0, Math.floor(Math.min(...bubbles.map((b) => b.grade), displayIra - 1.2)));

  const bxTo = (g: number) =>
    PAD_L + ((Math.max(minGrade, Math.min(10, g)) - minGrade) / Math.max(1, 10 - minGrade)) * PW;
  const byTo = (w: number) => PAD_T + PH - (w / yMax) * PH;
  const iraX = bxTo(displayIra);
  const midWeightY = byTo(yMax * 0.5);
  const activeBubble = plotted.find((b) => b.id === activeId) ?? null;

  // Iso-impact contours computed from exact weighted hours and trancado penalty in entries.
  const isoCurves = useMemo(() => {
    const gradedBubbles = bubbles.filter((b) => b.situacao !== 'trancado' && b.effectiveWeight > 0);
    const totalEff = gradedBubbles.reduce((s, b) => s + b.effectiveWeight, 0);
    const gradedHours = gradedBubbles.reduce((s, b) => s + b.workload, 0);
    const lockedHours = entries
      .filter((e) => e.situacao === 'trancado')
      .reduce((s, e) => s + e.workload, 0);
    const totalHours = gradedHours + lockedHours;
    if (totalEff <= 0 || totalHours <= 0) return [];

    const lockedPenalty = 1 - (0.5 * lockedHours) / totalHours;
    const baseAvg = gradedBubbles.reduce((s, b) => s + b.effectiveWeight * b.grade, 0) / totalEff;

    const toX = (g: number) =>
      PAD_L + ((Math.max(minGrade, Math.min(10, g)) - minGrade) / Math.max(1, 10 - minGrade)) * PW;
    const toY = (w: number) => PAD_T + PH - (w / yMax) * PH;

    const curves: { delta: number; path: string; labelX: number; labelY: number }[] = [];
    for (const d of ISO_DELTAS) {
      const boundGrade = d > 0 ? 10 : minGrade;
      const gradeHeadroom = Math.abs(boundGrade - baseAvg);
      if (gradeHeadroom < 0.05) continue;

      const ratio = (gradeHeadroom * lockedPenalty) / Math.abs(d);
      const wStart = Math.max(16, totalEff / (1 + ratio));
      if (wStart >= yMax * 0.96 || wStart >= totalEff * 0.95) continue;

      const pts: { x: number; y: number }[] = [];
      const steps = 24;
      for (let i = 0; i <= steps; i++) {
        const w = wStart + ((yMax - wStart) * i) / steps;
        if (w >= totalEff - 1) break;
        const g = baseAvg + (d / lockedPenalty) * ((totalEff - w) / w);
        if (g >= minGrade - 0.01 && g <= 10.01) {
          pts.push({ x: toX(g), y: toY(w) });
        }
      }
      if (pts.length >= 2) {
        const top = pts[pts.length - 1];
        curves.push({
          delta: d,
          path: linePath(pts),
          labelX: top.x,
          labelY: Math.max(PAD_T + 18, top.y + 10),
        });
      }
    }
    return curves;
  }, [bubbles, entries, minGrade, yMax, PAD_L, PAD_T, PW, PH]);

  // Collision-free callouts for strongest positive & negative drivers.
  const callouts = useMemo(() => {
    const visible = plotted.filter((b) => focusSemester === 'todos' || b.semester === focusSemester);
    const limit = large ? 6 : 3;
    const topPos = visible
      .filter((b) => b.delta > 0.0005)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, limit);
    const topNeg = visible
      .filter((b) => b.delta < -0.0005)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, limit);

    const toX = (g: number) =>
      PAD_L + ((Math.max(minGrade, Math.min(10, g)) - minGrade) / Math.max(1, 10 - minGrade)) * PW;
    const toY = (w: number) => PAD_T + PH - (w / yMax) * PH;

    const placedBoxes: { x: number; y: number; w: number; h: number }[] = [];
    const results: { id: string; x: number; y: number; anchor: 'start' | 'end'; short: string; color: string }[] = [];

    for (const b of [...topPos, ...topNeg]) {
      const cx = toX(b.grade) + b.jx;
      const cy = toY(b.effectiveWeight) + b.jy;
      const r = (large ? 5 : 4) + Math.sqrt(Math.abs(b.delta) / maxDelta) * (large ? 10.5 : 8);
      const short = b.name.length > (large ? 22 : 16) ? `${b.name.slice(0, large ? 21 : 15)}…` : b.name;
      const lw = short.length * 5.6 + 8;
      const lh = 14;

      const preferRight = cx + r + 8 + lw <= PAD_L + PW;
      const anchor: 'start' | 'end' = preferRight ? 'start' : 'end';
      const lx = preferRight ? cx + r + 5 : cx - r - 5;
      const bx = preferRight ? lx : lx - lw;
      const by = Math.max(PAD_T + 14, Math.min(PAD_T + PH - lh - 2, cy - lh / 2));

      const collides = placedBoxes.some(
        (box) =>
          Math.min(bx + lw, box.x + box.w) > Math.max(bx, box.x) &&
          Math.min(by + lh, box.y + box.h) > Math.max(by, box.y),
      );
      if (!collides && bx >= PAD_L && bx + lw <= PAD_L + PW) {
        placedBoxes.push({ x: bx, y: by, w: lw, h: lh });
        results.push({
          id: b.id,
          x: lx,
          y: by + 10.5,
          anchor,
          short,
          color: dotColorByImpact(b.delta, b.simulated),
        });
      }
    }
    return results;
  }, [plotted, focusSemester, large, minGrade, yMax, maxDelta, PAD_L, PAD_T, PW, PH]);

  const yTicks = SEMANTIC_WEIGHT_TICKS.filter((t) => t.weight <= yMax && (yMax <= 260 || t.weight !== 128));
  const xTicks = Array.from({ length: 10 - minGrade + 1 }, (_, i) => minGrade + i).filter(
    (g) => 10 - minGrade <= 7 || g % 2 === 0 || g === 10,
  );

  return (
    <svg
      role="img"
      aria-label="Mapa de bolhas cruzando nota da disciplina, peso efetivo no IRA e curvas de iso-impacto"
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto select-none"
    >
      {/* Quadrant zones */}
      <rect
        x={PAD_L}
        y={PAD_T}
        width={Math.max(0, iraX - PAD_L)}
        height={Math.max(0, midWeightY - PAD_T)}
        fill="var(--color-danger-tint)"
        opacity={0.34}
      />
      <rect
        x={iraX}
        y={PAD_T}
        width={Math.max(0, PAD_L + PW - iraX)}
        height={Math.max(0, midWeightY - PAD_T)}
        fill="var(--color-good-tint)"
        opacity={0.34}
      />
      <line
        x1={PAD_L}
        y1={midWeightY}
        x2={PAD_L + PW}
        y2={midWeightY}
        stroke="var(--color-line)"
        strokeDasharray="2 3"
        opacity={0.65}
      />

      <text x={PAD_L + 8} y={PAD_T + 14} fontSize={large ? 10 : 9} fontWeight={600} fill="var(--color-danger)" opacity={0.9}>
        Âncoras · nota &lt; IRA e peso alto
      </text>
      <text
        x={PAD_L + PW - 8}
        y={PAD_T + 14}
        textAnchor="end"
        fontSize={large ? 10 : 9}
        fontWeight={600}
        fill="var(--color-good)"
        opacity={0.95}
      >
        Pilares · nota &gt; IRA e peso alto
      </text>

      {/* Iso-impact dashed contours */}
      {isoCurves.map((c) => {
        const isPos = c.delta > 0;
        const stroke = isPos ? 'var(--color-good)' : 'var(--color-danger)';
        const label = `${isPos ? '+' : '−'}${fmt(Math.abs(c.delta), 2)}`;
        return (
          <g key={`iso-${c.delta}`} opacity={Math.abs(c.delta) === 0.05 ? 0.55 : 0.36} pointerEvents="none">
            <path d={c.path} fill="none" stroke={stroke} strokeWidth={1.1} strokeDasharray="4 3" />
            <text
              x={Math.min(PAD_L + PW - 18, Math.max(PAD_L + 18, c.labelX))}
              y={c.labelY}
              textAnchor="middle"
              fontSize={large ? 9 : 8}
              fontWeight={600}
              fill={stroke}
            >
              {label}
            </text>
          </g>
        );
      })}

      {/* Semantic Y-axis ticks */}
      {yTicks.map((t) => {
        const y = byTo(t.weight);
        return (
          <g key={t.weight}>
            <line x1={PAD_L} y1={y} x2={PAD_L + PW} y2={y} stroke="var(--color-line)" opacity={0.45} />
            <line x1={PAD_L - 4} y1={y} x2={PAD_L} y2={y} stroke="var(--color-ink-3)" />
            <text x={PAD_L - 7} y={y + 3} textAnchor="end" fontSize={large ? 9.5 : 8.5} fill="var(--color-ink-2)">
              {t.label}
            </text>
          </g>
        );
      })}
      <text x={PAD_L - 7} y={PAD_T - 9} textAnchor="end" fontSize={large ? 9.5 : 8.5} fontWeight={600} fill="var(--color-ink-3)">
        Peso (CH×sem.)
      </text>

      {/* Student IRA vertical line */}
      <line
        x1={iraX}
        y1={PAD_T}
        x2={iraX}
        y2={PAD_T + PH}
        stroke="var(--color-accent-3)"
        strokeWidth={1.6}
        strokeDasharray="4 2.5"
      />
      <text x={iraX} y={PAD_T - 9} textAnchor="middle" fontSize={large ? 10.5 : 9.5} fontWeight={700} fill="var(--color-accent-3)">
        seu IRA {fmt(displayIra, 2)}
      </text>

      {/* Active crosshairs */}
      {activeBubble && (
        <g pointerEvents="none">
          <line
            x1={bxTo(activeBubble.grade) + activeBubble.jx}
            y1={PAD_T}
            x2={bxTo(activeBubble.grade) + activeBubble.jx}
            y2={PAD_T + PH}
            stroke="var(--color-ink-2)"
            strokeDasharray="2 2"
            opacity={0.7}
          />
          <line
            x1={PAD_L}
            y1={byTo(activeBubble.effectiveWeight) + activeBubble.jy}
            x2={PAD_L + PW}
            y2={byTo(activeBubble.effectiveWeight) + activeBubble.jy}
            stroke="var(--color-ink-2)"
            strokeDasharray="2 2"
            opacity={0.7}
          />
        </g>
      )}

      {/* Discipline bubbles */}
      {plotted.map((b) => {
        const cx = bxTo(b.grade) + b.jx;
        const cy = byTo(b.effectiveWeight) + b.jy;
        const r = (large ? 5 : 4) + Math.sqrt(Math.abs(b.delta) / maxDelta) * (large ? 10.5 : 8);
        const isActive = activeId === b.id;
        const dimmed = focusSemester !== 'todos' && b.semester !== focusSemester && !isActive;
        const color = dotColorByImpact(b.delta, b.simulated);

        return (
          <g
            key={b.id}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => onHover(b.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(b.id)}
          >
            {isActive && <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={color} strokeWidth={1.8} opacity={0.75} />}
            <circle
              cx={cx}
              cy={cy}
              r={isActive ? r + 1.5 : r}
              fill={color}
              opacity={dimmed ? 0.14 : isActive ? 1 : 0.8}
              stroke="var(--color-surface-raised)"
              strokeWidth={isActive ? 1.8 : 1.1}
            />
          </g>
        );
      })}

      {/* Collision-free automatic callouts */}
      {callouts.map((c) => (
        <text
          key={`lbl-${c.id}`}
          x={c.x}
          y={c.y}
          textAnchor={c.anchor}
          fontSize={large ? 9.5 : 8.5}
          fontWeight={600}
          fill={c.color}
          opacity={focusSemester === 'todos' ? 0.92 : 0.98}
          pointerEvents="none"
        >
          {c.short}
        </text>
      ))}

      {/* X-axis */}
      <line x1={PAD_L} y1={PAD_T + PH} x2={PAD_L + PW} y2={PAD_T + PH} stroke="var(--color-line)" />
      {xTicks.map((g) => (
        <g key={g}>
          <line x1={bxTo(g)} y1={PAD_T + PH} x2={bxTo(g)} y2={PAD_T + PH + 4} stroke="var(--color-ink-3)" />
          <text x={bxTo(g)} y={PAD_T + PH + 16} textAnchor="middle" fontSize={large ? 10 : 9} fill="var(--color-ink-2)">
            {g}
          </text>
        </g>
      ))}
      <text
        x={PAD_L + PW / 2}
        y={H - 6}
        textAnchor="middle"
        fontSize={large ? 10 : 9}
        fontWeight={600}
        fill="var(--color-ink-3)"
      >
        Nota na disciplina (tamanho da bolha = |impacto no IRA|, curvas = ±0,02 / ±0,05 / ±0,10) →
      </text>
    </svg>
  );
}
