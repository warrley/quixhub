'use client';

import { Expand, Gauge, Scale, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, CardKicker, CardTitle } from '@/components/Card';
import { Segmented } from '@/components/Segmented';
import type { IraEntry } from '@/data/types';
import {
  computeDisciplineBubbles,
  computeIraSensitivity,
  computeSemesterComposition,
  type DisciplineBubble,
  type TreemapDiscipline,
} from '@/lib/ira';
import { clampIra } from '@/lib/statistics';
import { EmptyChart } from './chartKit';
import { fmt } from './chartFormat';
import { IraEvolutionChart } from './IraEvolutionChart';

type PersonalView = 'treemap' | 'bolhas' | 'cabo' | 'evolucao';

function tileBg(d: Pick<TreemapDiscipline, 'grade' | 'situacao' | 'simulated'>): string {
  if (d.simulated) return 'var(--color-accent-2-tint)';
  if (d.situacao === 'trancado' || d.grade < 5) return 'var(--color-danger-tint)';
  if (d.grade >= 7) return 'var(--color-good-tint)';
  return 'var(--color-accent-tint)';
}

function tileFg(d: Pick<TreemapDiscipline, 'grade' | 'situacao' | 'simulated'>): string {
  if (d.simulated) return 'var(--color-accent-2-dark)';
  if (d.situacao === 'trancado' || d.grade < 5) return 'var(--color-danger)';
  if (d.grade >= 7) return 'var(--color-good)';
  return 'var(--color-accent-dark)';
}

function bubbleColor(b: DisciplineBubble): string {
  if (b.simulated) return 'var(--color-accent-2-dark)';
  return b.delta >= 0 ? 'var(--color-good)' : 'var(--color-danger)';
}

// ── 1. Treemap by semester weight × discipline CH ───────────────────────

function TreemapPlot({
  entries,
  activeId,
  onHover,
  onSelect,
  large = false,
}: {
  entries: IraEntry[];
  activeId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  large?: boolean;
}) {
  const semesters = useMemo(() => computeSemesterComposition(entries), [entries]);
  const totalEff = Math.max(1, semesters.reduce((s, sem) => s + sem.effectiveWeight, 0));

  const W = large ? 620 : 440;
  const H = large ? 320 : 230;
  const headerH = 22;
  const gap = 3;

  let curX = 0;
  const semRects = semesters.map((sem) => {
    const rawW = (sem.effectiveWeight / totalEff) * W;
    const x = curX;
    curX += rawW;
    return { sem, x, w: Math.max(1, rawW - gap) };
  });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
      {semRects.map(({ sem, x, w }) => {
        const usableH = H - headerH;
        const semTotal = Math.max(1, sem.effectiveWeight);
        let curY = headerH;
        return (
          <g key={sem.semester}>
            <rect
              x={x}
              y={0}
              width={w}
              height={headerH - 2}
              rx={3}
              fill={sem.simulated ? 'var(--color-accent-2-tint)' : 'var(--color-surface-sunken)'}
            />
            {w >= 38 && (
              <text
                x={x + w / 2}
                y={13}
                textAnchor="middle"
                fontSize={large ? 9.5 : 8}
                fontWeight={700}
                fill={sem.simulated ? 'var(--color-accent-2-dark)' : 'var(--color-ink-2)'}
              >
                {w >= 64 ? `${sem.semester} · ${sem.weight}×` : sem.semester}
              </text>
            )}
            {sem.disciplines.map((d) => {
              const h = (d.effectiveWeight / semTotal) * usableH;
              const y = curY;
              curY += h;
              const dh = Math.max(2, h - 2);
              const isFocus = activeId === d.id;
              const fg = tileFg(d);
              const showText = w >= 52 && dh >= 22;
              const maxChars = Math.max(4, Math.floor((w - 8) / 5.5));
              const short = d.name.length > maxChars ? `${d.name.slice(0, maxChars - 1)}…` : d.name;
              return (
                <g
                  key={d.id}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => onHover(d.id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onSelect(d.id)}
                >
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={dh}
                    rx={3}
                    fill={tileBg(d)}
                    stroke={isFocus ? fg : 'var(--color-surface-raised)'}
                    strokeWidth={isFocus ? 2 : 0.8}
                    opacity={activeId && !isFocus ? 0.72 : 1}
                  />
                  {showText && (
                    <>
                      <text x={x + 5} y={y + 12} fontSize={large ? 9 : 7.5} fontWeight={600} fill={fg}>
                        {short}
                      </text>
                      {dh >= 32 && (
                        <text x={x + 5} y={y + 23} fontSize={large ? 8.5 : 7} fill="var(--color-ink-2)">
                          {d.situacao === 'trancado' ? 'Tranc.' : fmt(d.grade, 1)} · {d.delta >= 0 ? '+' : ''}
                          {fmt(d.delta, 3)}
                        </text>
                      )}
                    </>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

// ── 2. Bubble plot (Grade × Effective Weight) ───────────────────────────

function BubblesPlot({
  ira,
  bubbles,
  focusSemester,
  activeId,
  onHover,
  onSelect,
  large = false,
}: {
  ira: number;
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
      const dist = idx === 0 ? 0 : Math.min(8, 2.8 + idx * 1.5);
      return { ...b, jx: Math.cos(angle) * dist, jy: Math.sin(angle) * dist };
    });
  }, [bubbles]);

  const W = large ? 620 : 440;
  const H = large ? 320 : 235;
  const PAD_L = 38;
  const PAD_R = 16;
  const PAD_T = 26;
  const PAD_B = 34;
  const PW = W - PAD_L - PAD_R;
  const PH = H - PAD_T - PAD_B;

  const displayIra = clampIra(ira);
  const maxEffWeight = Math.max(64, ...bubbles.map((b) => b.effectiveWeight));
  const maxDelta = Math.max(0.001, ...bubbles.map((b) => Math.abs(b.delta)));
  const minGrade = Math.max(0, Math.floor(Math.min(...bubbles.map((b) => b.grade), displayIra - 1)));

  const bxTo = (g: number) => PAD_L + ((Math.max(minGrade, Math.min(10, g)) - minGrade) / Math.max(1, 10 - minGrade)) * PW;
  const byTo = (w: number) => PAD_T + PH - (w / maxEffWeight) * (PH - 10);
  const iraX = bxTo(displayIra);
  const midWeightY = byTo(maxEffWeight * 0.5);
  const activeBubble = plotted.find((b) => b.id === activeId) ?? null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
      <rect x={PAD_L} y={PAD_T} width={Math.max(0, iraX - PAD_L)} height={Math.max(0, midWeightY - PAD_T)} fill="var(--color-danger-tint)" opacity={0.36} />
      <rect x={iraX} y={PAD_T} width={Math.max(0, PAD_L + PW - iraX)} height={Math.max(0, midWeightY - PAD_T)} fill="var(--color-good-tint)" opacity={0.36} />
      <line x1={PAD_L} y1={midWeightY} x2={PAD_L + PW} y2={midWeightY} stroke="var(--color-line)" strokeDasharray="2 3" opacity={0.6} />

      <text x={PAD_L + 5} y={PAD_T + 11} fontSize={7.5} fontWeight={600} fill="var(--color-danger)" opacity={0.9}>
        Âncoras · nota baixa e peso alto
      </text>
      <text x={PAD_L + PW - 5} y={PAD_T + 11} textAnchor="end" fontSize={7.5} fontWeight={600} fill="var(--color-good)" opacity={0.95}>
        Pilares · nota alta e peso alto
      </text>

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

      <line x1={iraX} y1={PAD_T} x2={iraX} y2={PAD_T + PH} stroke="var(--color-accent-3)" strokeWidth={1.4} strokeDasharray="3 2" />
      <text x={iraX} y={PAD_T - 7} textAnchor="middle" fontSize={8} fontWeight={700} fill="var(--color-accent-3)">
        seu IRA {fmt(displayIra, 2)}
      </text>

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

      {plotted.map((b) => {
        const cx = bxTo(b.grade) + b.jx;
        const cy = byTo(b.effectiveWeight) + b.jy;
        const r = (large ? 4 : 3.2) + Math.sqrt(Math.abs(b.delta) / maxDelta) * (large ? 8 : 6.2);
        const isActive = activeId === b.id;
        const dimmed = focusSemester !== 'todos' && b.semester !== focusSemester && !isActive;
        return (
          <g
            key={b.id}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => onHover(b.id)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(b.id)}
          >
            {isActive && <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke={bubbleColor(b)} strokeWidth={1.5} opacity={0.65} />}
            <circle
              cx={cx}
              cy={cy}
              r={isActive ? r + 1.2 : r}
              fill={bubbleColor(b)}
              opacity={dimmed ? 0.16 : isActive ? 1 : 0.78}
              stroke="var(--color-surface-raised)"
              strokeWidth={isActive ? 1.6 : 0.9}
            />
          </g>
        );
      })}

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
  );
}

// ── 3. Tug-of-war by semester (diverging stacked discipline impacts) ────

function TugOfWarPlot({
  entries,
  activeId,
  onHover,
  onSelect,
  large = false,
}: {
  entries: IraEntry[];
  activeId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  large?: boolean;
}) {
  const semesters = useMemo(() => computeSemesterComposition(entries), [entries]);
  const maxSide = Math.max(
    0.01,
    ...semesters.map((s) => s.disciplines.filter((d) => d.delta > 0).reduce((a, d) => a + d.delta, 0)),
    ...semesters.map((s) => s.disciplines.filter((d) => d.delta < 0).reduce((a, d) => a + Math.abs(d.delta), 0)),
  );

  const W = large ? 620 : 440;
  const rowH = large ? 28 : 24;
  const padT = 18;
  const padB = 14;
  const H = Math.max(150, padT + semesters.length * rowH + padB);
  const labelW = 68;
  const rightPad = 56;
  const plotW = W - labelW - rightPad;
  const midX = labelW + plotW / 2;
  const halfW = plotW / 2 - 6;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none">
      <rect x={labelW} y={padT} width={midX - labelW} height={semesters.length * rowH} fill="var(--color-danger-tint)" opacity={0.28} rx={3} />
      <rect x={midX} y={padT} width={labelW + plotW - midX} height={semesters.length * rowH} fill="var(--color-good-tint)" opacity={0.28} rx={3} />
      <text x={midX - 6} y={11} textAnchor="end" fontSize={7.5} fill="var(--color-danger)" fontWeight={600}>
        ← Puxou p/ baixo
      </text>
      <text x={midX + 6} y={11} textAnchor="start" fontSize={7.5} fill="var(--color-good)" fontWeight={600}>
        Puxou p/ cima →
      </text>
      <line x1={midX} y1={padT - 2} x2={midX} y2={padT + semesters.length * rowH} stroke="var(--color-line-strong)" strokeWidth={1.2} />

      {semesters.map((sem, idx) => {
        const y = padT + idx * rowH + 4;
        const barH = rowH - 8;
        const pos = sem.disciplines.filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta);
        const neg = sem.disciplines.filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta);

        let posX = midX;
        let negX = midX;

        return (
          <g key={sem.semester}>
            <text x={labelW - 6} y={y + barH / 2 + 3} textAnchor="end" fontSize={8} fontWeight={600} fill="var(--color-ink-2)">
              {sem.semester} ({sem.weight}×)
            </text>

            {pos.map((d) => {
              const bw = Math.max(2, (d.delta / maxSide) * halfW);
              const x = posX;
              posX += bw;
              const isFocus = activeId === d.id;
              return (
                <rect
                  key={d.id}
                  x={x}
                  y={y}
                  width={Math.max(1.5, bw - 1)}
                  height={barH}
                  rx={2}
                  fill={d.simulated ? 'var(--color-accent-2-dark)' : 'var(--color-good)'}
                  stroke={isFocus ? 'var(--color-ink)' : 'var(--color-surface-raised)'}
                  strokeWidth={isFocus ? 1.5 : 0.6}
                  opacity={activeId && !isFocus ? 0.5 : 0.9}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => onHover(d.id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onSelect(d.id)}
                />
              );
            })}

            {neg.map((d) => {
              const bw = Math.max(2, (Math.abs(d.delta) / maxSide) * halfW);
              negX -= bw;
              const isFocus = activeId === d.id;
              return (
                <rect
                  key={d.id}
                  x={negX + 1}
                  y={y}
                  width={Math.max(1.5, bw - 1)}
                  height={barH}
                  rx={2}
                  fill={d.simulated ? 'var(--color-accent-2-dark)' : 'var(--color-danger)'}
                  stroke={isFocus ? 'var(--color-ink)' : 'var(--color-surface-raised)'}
                  strokeWidth={isFocus ? 1.5 : 0.6}
                  opacity={activeId && !isFocus ? 0.5 : 0.9}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => onHover(d.id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onSelect(d.id)}
                />
              );
            })}

            <text
              x={W - 4}
              y={y + barH / 2 + 3}
              textAnchor="end"
              fontSize={7.5}
              fontWeight={700}
              fill={sem.delta >= 0 ? 'var(--color-good)' : 'var(--color-danger)'}
            >
              {sem.delta >= 0 ? '+' : ''}
              {fmt(sem.delta, 3)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Main Section + Expanded Modal ───────────────────────────────────────

export function IraPersonalAnalytics({
  ira,
  entries,
  course,
}: {
  ira: number;
  entries: IraEntry[];
  course: string | null;
}) {
  const [view, setView] = useState<PersonalView>('treemap');
  const [focusSemester, setFocusSemester] = useState('todos');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const bubbles = useMemo(() => computeDisciplineBubbles(entries), [entries]);
  const sensitivity = useMemo(() => computeIraSensitivity(entries), [entries]);
  const sortedByImpact = useMemo(() => [...bubbles].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)), [bubbles]);

  const semesters = useMemo(() => {
    const s = new Set(bubbles.map((b) => b.semester).filter((x) => x !== '—'));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [bubbles]);

  const activeId = hoverId ?? pinnedId;
  const activeBubble = bubbles.find((b) => b.id === activeId) ?? null;

  const togglePin = (id: string) => setPinnedId((cur) => (cur === id ? null : id));

  const renderChart = (large = false) => {
    if (bubbles.length < 2) {
      return <EmptyChart>Adicione pelo menos 2 disciplinas com nota para liberar os gráficos do seu histórico.</EmptyChart>;
    }
    if (view === 'treemap') {
      return <TreemapPlot entries={entries} activeId={activeId} onHover={setHoverId} onSelect={togglePin} large={large} />;
    }
    if (view === 'bolhas') {
      return (
        <BubblesPlot
          ira={ira}
          bubbles={bubbles}
          focusSemester={focusSemester}
          activeId={activeId}
          onHover={setHoverId}
          onSelect={togglePin}
          large={large}
        />
      );
    }
    if (view === 'cabo') {
      return <TugOfWarPlot entries={entries} activeId={activeId} onHover={setHoverId} onSelect={togglePin} large={large} />;
    }
    return <IraEvolutionChart entries={entries} course={course} />;
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="font-heading font-bold text-15 text-ink">Suas disciplinas e semestres</h2>
          <p className="text-12 text-ink-3">Como cada matéria, peso de período e trancamento compõem o seu IRA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-4 items-stretch">
        <Card padding="md" className="flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-2.5 flex-wrap">
            <div>
              <CardKicker>Análise do seu histórico</CardKicker>
              <CardTitle>
                {view === 'treemap'
                  ? 'Composição por peso dos semestres'
                  : view === 'bolhas'
                    ? `Mapa de força (${bubbles.length} disciplinas)`
                    : view === 'cabo'
                      ? 'Cabo de guerra por semestre'
                      : 'Evolução e mapa de notas'}
              </CardTitle>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-1.5 text-11-5 font-heading font-semibold text-ink-2 hover:text-ink bg-surface-sunken border border-line rounded-full px-2.5 py-1 cursor-pointer transition-colors"
              title="Abrir visualização ampliada com lista interativa"
            >
              <Expand size={13} aria-hidden />
              Ampliar
            </button>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2 mb-2.5">
            <Segmented<PersonalView>
              size="sm"
              ariaLabel="Visualização do seu histórico"
              value={view}
              onChange={setView}
              options={[
                { value: 'treemap', label: 'Treemap' },
                { value: 'bolhas', label: 'Bolhas' },
                { value: 'cabo', label: 'Cabo de guerra' },
                { value: 'evolucao', label: 'Raio-X' },
              ]}
            />
            {view === 'bolhas' && semesters.length > 1 && (
              <select
                value={focusSemester}
                onChange={(e) => {
                  setFocusSemester(e.target.value);
                  setPinnedId(null);
                }}
                aria-label="Filtrar semestre no mapa"
                className="font-heading font-semibold text-11-5 text-ink bg-surface border border-line rounded-md py-1 px-2 cursor-pointer hover:border-accent outline-none"
              >
                <option value="todos">Todos os semestres</option>
                {semesters.map((s) => (
                  <option key={s} value={s}>
                    Semestre {s}
                  </option>
                ))}
              </select>
            )}
          </div>

          {view !== 'evolucao' && bubbles.length >= 2 && (
            <div className="rounded-md px-3 py-2 mb-2 bg-surface-sunken text-12 flex items-center justify-between gap-2 flex-wrap min-h-[36px]">
              {activeBubble ? (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: bubbleColor(activeBubble) }} />
                    <b className="font-heading text-ink truncate">{activeBubble.name}</b>
                    <span className="text-11 text-ink-3 shrink-0">
                      {activeBubble.semester} · {activeBubble.workload}h ({activeBubble.weight}×)
                    </span>
                    {activeBubble.simulated && (
                      <span className="text-10 font-heading font-semibold px-1.5 py-0.5 rounded bg-accent-2-tint text-accent-2-dark shrink-0">
                        Previsão
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 tabular-nums">
                    <span>
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
                  Passe o mouse ou clique em um bloco/bolha para inspecionar · clique em Ampliar para ver em tela cheia.
                </span>
              )}
            </div>
          )}

          <div className="my-auto">{renderChart(false)}</div>

          {view !== 'evolucao' && bubbles.length >= 2 && (
            <div className="mt-2 pt-2 border-t border-line flex flex-wrap items-center gap-x-4 gap-y-1 text-11 text-ink-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-good inline-block" /> Puxou p/ cima (≥7)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" /> Puxou p/ baixo
              </span>
              {bubbles.some((b) => b.simulated) && (
                <span className="inline-flex items-center gap-1.5 text-accent-2-dark font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-2-dark)] inline-block" /> Previsão
                </span>
              )}
            </div>
          )}
        </Card>

        {/* Sensitivity & Inertia panel */}
        <Card padding="md" className="flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <CardKicker>Sensibilidade e inércia</CardKicker>
                <CardTitle>Quanto seu IRA ainda mexe</CardTitle>
              </div>
              <Gauge size={18} className="text-accent shrink-0 mt-1" aria-hidden />
            </div>

            {sensitivity ? (
              <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md p-2.5 bg-good-tint text-center">
                    <div className="font-heading font-extrabold text-14-5 text-good tabular-nums">
                      {sensitivity.deltaGrade10_64h >= 0 ? '+' : ''}
                      {fmt(sensitivity.deltaGrade10_64h, 4)}
                    </div>
                    <div className="text-10 text-ink-2 mt-0.5">10 em 64h</div>
                  </div>
                  <div className="rounded-md p-2.5 bg-surface-sunken text-center">
                    <div className="font-heading font-extrabold text-14-5 text-ink tabular-nums">
                      {sensitivity.deltaGrade8_64h >= 0 ? '+' : ''}
                      {fmt(sensitivity.deltaGrade8_64h, 4)}
                    </div>
                    <div className="text-10 text-ink-2 mt-0.5">8 em 64h</div>
                  </div>
                  <div className="rounded-md p-2.5 bg-danger-tint text-center">
                    <div className="font-heading font-extrabold text-14-5 text-danger tabular-nums">
                      {fmt(sensitivity.deltaLock64h, 4)}
                    </div>
                    <div className="text-10 text-ink-2 mt-0.5">Trancar 64h</div>
                  </div>
                </div>

                <div className="rounded-md p-3 bg-surface-sunken border border-line text-12">
                  <div className="font-heading font-bold text-11 text-ink-3 uppercase mb-1">Meta de +0,1000</div>
                  {sensitivity.neededAvgForTarget !== null ? (
                    <p className="text-ink-2">
                      Para subir <b className="text-ink">+0,1000</b> no próximo semestre (256h), você precisa fechar média{' '}
                      <b className="text-accent-dark font-heading tabular-nums">{fmt(sensitivity.neededAvgForTarget, 2)}</b>.
                    </p>
                  ) : (
                    <p className="text-ink-2">
                      Como seu IRA já está muito alto e acumulado ({sensitivity.gradedHours}h), nem média 10 em 256h sobe +0,1000 de uma
                      vez.
                    </p>
                  )}
                </div>

                {sensitivity.iraWithoutLocks !== null && (
                  <div className="rounded-md p-3 bg-danger-tint/70 border border-danger/20 text-12 flex items-start gap-2">
                    <Scale size={15} className="text-danger shrink-0 mt-0.5" aria-hidden />
                    <span className="text-ink-2">
                      Sem os <b className="text-ink">{sensitivity.lockedHours}h</b> de trancamento, seu IRA seria{' '}
                      <b className="text-ink tabular-nums">{fmt(sensitivity.iraWithoutLocks, 4)}</b> (custo de{' '}
                      <b className="text-danger tabular-nums">{fmt(sensitivity.lockPenaltyCost, 4)}</b>).
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <EmptyChart>Adicione disciplinas com nota para calcular a sensibilidade.</EmptyChart>
            )}
          </div>

          {sensitivity && (
            <p className="text-11 text-ink-3 pt-2 border-t border-line">
              Total contabilizado: <b className="text-ink">{sensitivity.gradedHours}h</b> cursadas
              {sensitivity.lockedHours > 0 ? ` · ${sensitivity.lockedHours}h trancadas` : ''}.
            </p>
          )}
        </Card>
      </div>

      {/* Expanded modal */}
      {expanded && (
        <div
          className="fixed inset-0 bg-[oklch(15%_0.02_262/55%)] backdrop-blur-md flex items-center justify-center p-4 z-[100] [animation:fadeIn_0.15s_ease]"
          onClick={() => setExpanded(false)}
        >
          <div
            className="w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-surface-raised rounded-lg border border-line shadow-lg p-6 [animation:pop_0.18s_ease]"
            role="dialog"
            aria-modal="true"
            aria-label="Análise detalhada das suas disciplinas"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="font-heading font-bold text-11 uppercase text-accent-2-ink">Visão ampliada</div>
                <h3 className="font-heading font-bold text-19 text-ink">Impacto detalhado no seu IRA</h3>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Fechar visualização ampliada"
                className="p-2 rounded-full hover:bg-surface-sunken text-ink-2 hover:text-ink cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <Segmented<PersonalView>
                size="sm"
                ariaLabel="Visualização ampliada"
                value={view}
                onChange={setView}
                options={[
                  { value: 'treemap', label: 'Treemap (Composição)' },
                  { value: 'bolhas', label: 'Bolhas (Nota × Peso)' },
                  { value: 'cabo', label: 'Cabo de guerra (Semestres)' },
                  { value: 'evolucao', label: 'Raio-X (Evolução)' },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
              <div className="lg:col-span-3">{renderChart(true)}</div>
              <div className="lg:col-span-2 flex flex-col gap-1.5 max-h-[360px] overflow-y-auto pr-1">
                <div className="font-heading font-bold text-11-5 text-ink-2 mb-1">
                  Todas as disciplinas por impacto ({sortedByImpact.length})
                </div>
                {sortedByImpact.map((b) => {
                  const isFocus = activeId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onMouseEnter={() => setHoverId(b.id)}
                      onMouseLeave={() => setHoverId(null)}
                      onClick={() => togglePin(b.id)}
                      className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-md border text-left text-12 cursor-pointer transition-colors ${
                        isFocus ? 'border-accent bg-accent-tint' : 'border-line bg-surface hover:bg-surface-sunken'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-ink truncate">{b.name}</div>
                        <div className="text-10-5 text-ink-3">
                          {b.semester} · {b.workload}h · peso {b.weight}× ·{' '}
                          {b.situacao === 'trancado' ? 'Trancado' : `nota ${fmt(b.grade, 1)}`}
                        </div>
                      </div>
                      <span
                        className={`font-heading font-bold tabular-nums shrink-0 ${
                          b.simulated ? 'text-accent-2-dark' : b.delta >= 0 ? 'text-good' : 'text-danger'
                        }`}
                      >
                        {b.delta >= 0 ? '+' : ''}
                        {fmt(b.delta, 4)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
