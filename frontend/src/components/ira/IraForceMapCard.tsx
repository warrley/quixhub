'use client';

import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, CardKicker, CardTitle } from '@/components/Card';
import { Segmented } from '@/components/Segmented';
import type { IraEntry } from '@/data/types';
import { computeDisciplineBubbles, computeEvolution, type DisciplineBubble } from '@/lib/ira';
import { clampIra } from '@/lib/statistics';
import { EmptyChart } from './chartKit';
import { fmt } from './chartFormat';

const W = 420;
const H = 236;
const PAD_L = 38;
const PAD_R = 16;
const PAD_T = 26;
const PAD_B = 34;
const PW = W - PAD_L - PAD_R;
const PH = H - PAD_T - PAD_B;

function bubbleColor(b: DisciplineBubble): string {
  if (b.simulated) return 'var(--color-accent-2-dark)';
  return b.delta >= 0 ? 'var(--color-good)' : 'var(--color-danger)';
}

/**
 * Interactive Discipline & Semester Force Map (occupies the wide card beside
 * Ranking):
 * - Bolhas (Nota × Peso no IRA): plots EVERY graded/trancado discipline across
 *   4 quadrants (Pilares, Âncoras, Bônus, Leves), with semester filter, click
 *   to pin + hover to inspect exact impact, CH, and weight.
 * - Cascata (Semestres): step-by-step waterfall showing how each semester moved
 *   your cumulative IRA up or down.
 */
export function IraForceMapCard({
  ira,
  entries,
}: {
  ira: number;
  entries: IraEntry[];
}) {
  const [view, setView] = useState<'bolhas' | 'cascata'>('bolhas');
  const [focusSemester, setFocusSemester] = useState<string>('todos');
  const [hoverBubbleId, setHoverBubbleId] = useState<string | null>(null);
  const [pinnedBubbleId, setPinnedBubbleId] = useState<string | null>(null);
  const [hoverSem, setHoverSem] = useState<string | null>(null);

  const bubbles = useMemo(() => computeDisciplineBubbles(entries), [entries]);
  const evolution = useMemo(() => computeEvolution(entries), [entries]);

  const semesters = useMemo(() => {
    const s = new Set(bubbles.map((b) => b.semester).filter((x) => x !== '—'));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [bubbles]);

  // Small deterministic jitter keeps identical (grade, weight) bubbles clickable
  const plotted = useMemo(() => {
    const seen = new Map<string, number>();
    return bubbles.map((b) => {
      const key = `${b.grade.toFixed(1)}|${b.effectiveWeight}`;
      const idx = seen.get(key) ?? 0;
      seen.set(key, idx + 1);
      const angle = idx * 2.39996;
      const dist = idx === 0 ? 0 : Math.min(7, 2.5 + idx * 1.4);
      return {
        ...b,
        jx: Math.cos(angle) * dist,
        jy: Math.sin(angle) * dist,
      };
    });
  }, [bubbles]);

  const activeBubbleId = hoverBubbleId ?? pinnedBubbleId;
  const activeBubble = plotted.find((b) => b.id === activeBubbleId) ?? null;
  const hoveredEvo = evolution.find((e) => e.semester === hoverSem) ?? null;

  const displayIra = clampIra(ira);
  const maxEffWeight = Math.max(64, ...bubbles.map((b) => b.effectiveWeight));
  const maxDelta = Math.max(0.001, ...bubbles.map((b) => Math.abs(b.delta)));
  const minGrade = Math.max(0, Math.floor(Math.min(...bubbles.map((b) => b.grade), displayIra - 1)));

  const bxTo = (g: number) => PAD_L + ((Math.max(minGrade, Math.min(10, g)) - minGrade) / Math.max(1, 10 - minGrade)) * PW;
  const byTo = (w: number) => PAD_T + PH - (w / maxEffWeight) * (PH - 10);
  const iraX = bxTo(displayIra);
  const midWeightY = byTo(maxEffWeight * 0.5);

  const topHelper = useMemo(
    () => [...bubbles].filter((b) => b.delta > 0).sort((a, b) => b.delta - a.delta)[0] ?? null,
    [bubbles],
  );
  const topAnchor = useMemo(
    () => [...bubbles].filter((b) => b.delta < 0).sort((a, b) => a.delta - b.delta)[0] ?? null,
    [bubbles],
  );

  // Waterfall geometry
  const wfVals = evolution.map((e) => e.cumulativeIra);
  const wfMin = Math.max(0, Math.floor((Math.min(...wfVals, 10) - 0.45) * 2) / 2);
  const wfSpan = Math.max(1, 10 - wfMin);
  const wfSlotW = PW / Math.max(1, evolution.length);
  const wfBarW = Math.min(28, wfSlotW * 0.58);
  const wxAt = (i: number) => PAD_L + (i + 0.5) * wfSlotW;
  const wyAt = (v: number) => PAD_T + PH - ((Math.max(wfMin, Math.min(10, v)) - wfMin) / wfSpan) * PH;

  return (
    <Card padding="md" className="h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <CardKicker>Mapa de força</CardKicker>
          <CardTitle>
            {bubbles.length > 0
              ? `Impacto das suas ${bubbles.length} disciplinas`
              : 'Impacto das disciplinas e semestres'}
          </CardTitle>
        </div>
        <Sparkles size={20} className="text-accent-3 shrink-0 mt-1" aria-hidden />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
        <Segmented<'bolhas' | 'cascata'>
          size="sm"
          ariaLabel="Modo de visualização do mapa de força"
          value={view}
          onChange={setView}
          options={[
            { value: 'bolhas', label: 'Disciplinas (Nota × Peso)' },
            { value: 'cascata', label: 'Semestres (Cascata)' },
          ]}
        />

        {view === 'bolhas' && semesters.length > 1 && (
          <select
            value={focusSemester}
            onChange={(e) => {
              setFocusSemester(e.target.value);
              setPinnedBubbleId(null);
            }}
            aria-label="Filtrar semestre no mapa"
            className="font-heading font-semibold text-11-5 text-ink bg-surface border border-line rounded-md py-1 px-2 cursor-pointer hover:border-accent focus:border-accent outline-none"
          >
            <option value="todos">Todos os semestres ({bubbles.length})</option>
            {semesters.map((s) => (
              <option key={s} value={s}>
                Semestre {s}
              </option>
            ))}
          </select>
        )}
      </div>

      {bubbles.length >= 2 ? (
        view === 'bolhas' ? (
          <>
            {/* Interactive inspector strip */}
            <div className="rounded-md px-3 py-2 mb-2 bg-surface-sunken text-12 flex items-center justify-between gap-2 flex-wrap min-h-[38px]">
              {activeBubble ? (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: bubbleColor(activeBubble) }}
                    />
                    <b className="font-heading text-ink truncate">{activeBubble.name}</b>
                    <span className="text-11 text-ink-3 shrink-0">
                      {activeBubble.semester} · {activeBubble.workload}h × peso {activeBubble.weight}×
                    </span>
                    {activeBubble.simulated && (
                      <span className="text-10 font-heading font-semibold px-1.5 py-0.5 rounded bg-accent-2-tint text-accent-2-dark shrink-0">
                        Previsão
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 tabular-nums">
                    <span className="text-ink-2">
                      nota <b className="text-ink">{activeBubble.situacao === 'trancado' ? 'Tranc.' : fmt(activeBubble.grade, 1)}</b>
                    </span>
                    <span className={`font-heading font-bold ${activeBubble.delta >= 0 ? 'text-good' : 'text-danger'}`}>
                      {activeBubble.delta >= 0 ? '+' : ''}
                      {fmt(activeBubble.delta, 4)} no IRA
                    </span>
                  </div>
                </>
              ) : (
                <span className="text-11-5 text-ink-3">
                  Passe o mouse ou clique em qualquer bolha para inspecionar a disciplina e o peso dela no IRA.
                </span>
              )}
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto my-auto select-none">
              {/* 4 Quadrant tints */}
              <rect
                x={PAD_L}
                y={PAD_T}
                width={Math.max(0, iraX - PAD_L)}
                height={Math.max(0, midWeightY - PAD_T)}
                fill="var(--color-danger-tint)"
                opacity={0.38}
              />
              <rect
                x={iraX}
                y={PAD_T}
                width={Math.max(0, PAD_L + PW - iraX)}
                height={Math.max(0, midWeightY - PAD_T)}
                fill="var(--color-good-tint)"
                opacity={0.38}
              />
              <line x1={PAD_L} y1={midWeightY} x2={PAD_L + PW} y2={midWeightY} stroke="var(--color-line)" strokeDasharray="2 3" opacity={0.6} />

              {/* Quadrant captions */}
              <text x={PAD_L + 5} y={PAD_T + 11} fontSize={7.5} fontWeight={600} fill="var(--color-danger)" opacity={0.9}>
                Âncoras · nota baixa e peso alto
              </text>
              <text x={PAD_L + PW - 5} y={PAD_T + 11} textAnchor="end" fontSize={7.5} fontWeight={600} fill="var(--color-good)" opacity={0.95}>
                Pilares · nota alta e peso alto
              </text>
              <text x={PAD_L + 5} y={PAD_T + PH - 6} fontSize={7} fill="var(--color-ink-3)">
                Peso leve ↓
              </text>
              <text x={PAD_L + PW - 5} y={PAD_T + PH - 6} textAnchor="end" fontSize={7} fill="var(--color-ink-3)">
                Bônus leves ↑
              </text>

              {/* Y-axis ticks */}
              {[0.25, 0.5, 0.75, 1].map((frac) => {
                const w = Math.round(maxEffWeight * frac);
                const y = byTo(w);
                return (
                  <g key={frac}>
                    <line x1={PAD_L - 3} y1={y} x2={PAD_L} y2={y} stroke="var(--color-ink-3)" />
                    <text x={PAD_L - 5} y={y + 2.5} textAnchor="end" fontSize={7.5} fill="var(--color-ink-3)">
                      {w}
                    </text>
                  </g>
                );
              })}
              <text x={PAD_L - 4} y={PAD_T - 8} textAnchor="end" fontSize={7} fontWeight={600} fill="var(--color-ink-3)">
                Peso
              </text>

              {/* Vertical IRA threshold */}
              <line x1={iraX} y1={PAD_T} x2={iraX} y2={PAD_T + PH} stroke="var(--color-accent-3)" strokeWidth={1.4} strokeDasharray="3 2" />
              <text x={iraX} y={PAD_T - 7} textAnchor="middle" fontSize={8} fontWeight={700} fill="var(--color-accent-3)">
                seu IRA {fmt(displayIra, 2)}
              </text>

              {/* Crosshair for hovered/pinned bubble */}
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

              {/* All discipline bubbles */}
              {plotted.map((b) => {
                const cx = bxTo(b.grade) + b.jx;
                const cy = byTo(b.effectiveWeight) + b.jy;
                const r = 3.2 + Math.sqrt(Math.abs(b.delta) / maxDelta) * 6.5;
                const isActive = activeBubbleId === b.id;
                const dimmed = focusSemester !== 'todos' && b.semester !== focusSemester && !isActive;

                return (
                  <g
                    key={b.id}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoverBubbleId(b.id)}
                    onMouseLeave={() => setHoverBubbleId(null)}
                    onClick={() => setPinnedBubbleId((cur) => (cur === b.id ? null : b.id))}
                  >
                    {isActive && (
                      <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke={bubbleColor(b)} strokeWidth={1.5} opacity={0.6} />
                    )}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isActive ? r + 1.2 : r}
                      fill={bubbleColor(b)}
                      opacity={dimmed ? 0.16 : isActive ? 1 : 0.76}
                      stroke="var(--color-surface-raised)"
                      strokeWidth={isActive ? 1.6 : 0.9}
                    />
                  </g>
                );
              })}

              {/* X-axis */}
              <line x1={PAD_L} y1={PAD_T + PH} x2={PAD_L + PW} y2={PAD_T + PH} stroke="var(--color-line)" />
              {Array.from({ length: 10 - minGrade + 1 }, (_, i) => minGrade + i)
                .filter((g) => 10 - minGrade <= 6 || g % 2 === 0 || g === 10)
                .map((g) => (
                  <g key={g}>
                    <line x1={bxTo(g)} y1={PAD_T + PH} x2={bxTo(g)} y2={PAD_T + PH + 3} stroke="var(--color-ink-3)" />
                    <text x={bxTo(g)} y={PAD_T + PH + 13} textAnchor="middle" fontSize={8} fill="var(--color-ink-2)">
                      {g}
                    </text>
                  </g>
                ))}
              <text x={PAD_L + PW / 2} y={H - 4} textAnchor="middle" fontSize={8} fontWeight={600} fill="var(--color-ink-3)">
                Nota na disciplina →
              </text>
            </svg>

            {/* Clear legend + quick clickable top helper / top anchor pills */}
            <div className="mt-2 pt-2 border-t border-line flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-11-5 text-ink-2">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-good inline-block" /> Puxou p/ cima
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" /> Puxou p/ baixo
                </span>
                {bubbles.some((b) => b.simulated) && (
                  <span className="inline-flex items-center gap-1.5 text-accent-2-dark font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-2-dark)] inline-block" /> Previsão
                  </span>
                )}
                <span className="text-ink-3">Tamanho = força no IRA · clique para fixar</span>
              </div>

              {(topHelper || topAnchor) && (
                <div className="flex flex-wrap gap-2 text-11">
                  {topHelper && (
                    <button
                      type="button"
                      onClick={() => setPinnedBubbleId(topHelper.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-good-tint text-good font-semibold cursor-pointer hover:opacity-90"
                    >
                      Maior pilar: {topHelper.name} (+{fmt(topHelper.delta, 4)})
                    </button>
                  )}
                  {topAnchor && (
                    <button
                      type="button"
                      onClick={() => setPinnedBubbleId(topAnchor.id)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger-tint text-danger font-semibold cursor-pointer hover:opacity-90"
                    >
                      Maior âncora: {topAnchor.name} ({fmt(topAnchor.delta, 4)})
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="rounded-md px-3 py-2 mb-2 bg-surface-sunken text-12 flex items-center justify-between gap-2 min-h-[38px]">
              {hoveredEvo ? (
                <>
                  <span>
                    <b className="font-heading text-ink">Semestre {hoveredEvo.semester}</b> (peso {hoveredEvo.weight}×)
                  </span>
                  <span className="tabular-nums">
                    IRA <b className="text-ink">{fmt(hoveredEvo.cumulativeIra, 4)}</b>
                    {hoveredEvo.deltaIra !== null && (
                      <b className={`ml-1.5 ${hoveredEvo.deltaIra >= 0 ? 'text-good' : 'text-danger'}`}>
                        ({hoveredEvo.deltaIra >= 0 ? '+' : ''}
                        {fmt(hoveredEvo.deltaIra, 4)})
                      </b>
                    )}
                  </span>
                </>
              ) : (
                <span className="text-11-5 text-ink-3">Passe o mouse nas colunas para ver quanto cada semestre moveu seu IRA.</span>
              )}
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto my-auto select-none">
              {[wfMin, Number(((wfMin + 10) / 2).toFixed(1)), 10]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((v) => (
                  <g key={v}>
                    <line x1={PAD_L} y1={wyAt(v)} x2={PAD_L + PW} y2={wyAt(v)} stroke="var(--color-line)" strokeDasharray="2 3" opacity={0.6} />
                    <text x={PAD_L - 5} y={wyAt(v) + 3} textAnchor="end" fontSize={8} fill="var(--color-ink-3)">
                      {v}
                    </text>
                  </g>
                ))}

              {evolution.map((e, i) => {
                const prevVal = i === 0 ? wfMin : evolution[i - 1].cumulativeIra;
                const y1 = wyAt(prevVal);
                const y2 = wyAt(e.cumulativeIra);
                const top = Math.min(y1, y2);
                const barH = Math.max(4, Math.abs(y2 - y1));
                const isFirst = i === 0;
                const up = (e.deltaIra ?? 0) >= 0;
                const fill = e.simulated
                  ? 'var(--color-accent-2-dark)'
                  : isFirst
                    ? 'var(--color-accent)'
                    : up
                      ? 'var(--color-good)'
                      : 'var(--color-danger)';
                const cx = wxAt(i);
                const isHover = hoverSem === e.semester;

                return (
                  <g
                    key={e.semester}
                    onMouseEnter={() => setHoverSem(e.semester)}
                    onMouseLeave={() => setHoverSem(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {i > 0 && (
                      <line
                        x1={wxAt(i - 1) + wfBarW / 2}
                        y1={y1}
                        x2={cx - wfBarW / 2}
                        y2={y1}
                        stroke="var(--color-ink-3)"
                        strokeDasharray="2 2"
                      />
                    )}
                    <rect
                      x={cx - wfBarW / 2}
                      y={top}
                      width={wfBarW}
                      height={barH}
                      rx={2.5}
                      fill={fill}
                      opacity={isHover ? 1 : 0.85}
                    />
                    {e.deltaIra !== null && (
                      <text
                        x={cx}
                        y={up ? top - 5 : top + barH + 9}
                        textAnchor="middle"
                        fontSize={7}
                        fontWeight={700}
                        fill={fill}
                      >
                        {e.deltaIra >= 0 ? '+' : ''}
                        {fmt(e.deltaIra, 2)}
                      </text>
                    )}
                    {(evolution.length <= 8 || i === 0 || i === evolution.length - 1 || isHover) && (
                      <text x={cx} y={PAD_T + PH + 14} textAnchor="middle" fontSize={7.5} fill="var(--color-ink-2)">
                        {e.semester}
                      </text>
                    )}
                  </g>
                );
              })}

              <line x1={PAD_L} y1={PAD_T + PH} x2={PAD_L + PW} y2={PAD_T + PH} stroke="var(--color-line)" />
            </svg>

            <div className="mt-2 pt-2 border-t border-line flex flex-wrap items-center gap-x-4 gap-y-1 text-11-5 text-ink-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-accent inline-block" /> Base inicial
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-good inline-block" /> Subiu o IRA
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-danger inline-block" /> Desceu o IRA
              </span>
              {evolution.some((e) => e.simulated) && (
                <span className="inline-flex items-center gap-1.5 text-accent-2-dark font-medium">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[var(--color-accent-2-dark)] inline-block" /> Previsão
                </span>
              )}
            </div>
          </>
        )
      ) : (
        <EmptyChart>Adicione pelo menos 2 disciplinas com nota para ver o mapa de força.</EmptyChart>
      )}
    </Card>
  );
}
