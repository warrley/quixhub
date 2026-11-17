'use client';

import { BarChart3, GraduationCap, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, CardKicker, CardTitle } from '@/components/Card';
import { Segmented } from '@/components/Segmented';
import type { IraEntry } from '@/data/types';
import { computeDisciplineBubbles, computeEvolution, type DisciplineBubble } from '@/lib/ira';
import {
  MIN_GROUP_SIZE,
  iraByStage,
  kde,
  semestersAttended,
  summarize,
} from '@/lib/iraCampus';
import { CAMPUS_STUDENTS, CAMPUS_UPDATED_AT, groupIras } from '@/lib/iraCampusData';
import { clampIra } from '@/lib/statistics';
import { EmptyChart } from './chartKit';
import { fmt, linePath } from './chartFormat';

const W = 280;
const H = 135;
const PAD_L = 26;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 24;
const PW = W - PAD_L - PAD_R;
const PH = H - PAD_T - PAD_B;

// ── 1. Survival funnel (Ativos vs Formados) ─────────────────────────────

function SurvivalCard({ ira, course }: { ira: number; course: string | null }) {
  const displayIra = clampIra(ira);
  const ativos = useMemo(() => groupIras(course, 'ativos'), [course]);
  const formados = useMemo(() => groupIras(course, 'formados'), [course]);

  const sAtivos = useMemo(() => summarize(ativos), [ativos]);
  const sFormados = useMemo(() => summarize(formados), [formados]);
  const hasBoth =
    sAtivos !== null && sAtivos.n >= MIN_GROUP_SIZE && sFormados !== null && sFormados.n >= MIN_GROUP_SIZE;

  const DOMAIN_MIN = 3;
  const CAP = 10;
  const SAMPLES = 90;
  const xs = useMemo(
    () => Array.from({ length: SAMPLES + 1 }, (_, i) => DOMAIN_MIN + (i / SAMPLES) * (CAP - DOMAIN_MIN)),
    [],
  );

  const dAtivos = useMemo(() => (hasBoth ? kde(ativos, xs) : []), [hasBoth, ativos, xs]);
  const dFormados = useMemo(() => (hasBoth ? kde(formados, xs) : []), [hasBoth, formados, xs]);
  const peak = Math.max(1e-6, ...dAtivos, ...dFormados);

  const xTo = (x: number) => PAD_L + ((Math.max(DOMAIN_MIN, Math.min(CAP, x)) - DOMAIN_MIN) / (CAP - DOMAIN_MIN)) * PW;
  const yTo = (d: number) => PAD_T + PH - (d / peak) * (PH - 4);

  const pAtivos = linePath(xs.map((x, i) => ({ x: xTo(x), y: yTo(dAtivos[i] ?? 0) })));
  const pFormados = linePath(xs.map((x, i) => ({ x: xTo(x), y: yTo(dFormados[i] ?? 0) })));
  const fillFormados = hasBoth ? `${pFormados} L ${xTo(CAP)} ${PAD_T + PH} L ${xTo(DOMAIN_MIN)} ${PAD_T + PH} Z` : '';

  const gap = hasBoth ? sFormados!.mean - sAtivos!.mean : 0;

  return (
    <Card padding="md" className="flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <CardKicker>Ativos × Formados</CardKicker>
          <CardTitle>Funil de sobrevivência</CardTitle>
        </div>
        <GraduationCap size={18} className="text-good shrink-0 mt-1" aria-hidden />
      </div>

      {hasBoth ? (
        <>
          <p className="text-12 text-ink-3 mb-3">
            Em {course ?? 'todo o campus'}, quem se forma tem média <b className="text-ink">{fmt(sFormados!.mean)}</b> vs.{' '}
            <b className="text-ink">{fmt(sAtivos!.mean)}</b> dos ativos
            {Math.abs(gap) >= 0.15 && (
              <>
                {' '}
                (<span className={gap > 0 ? 'text-good font-semibold' : 'text-ink-2'}>{gap > 0 ? '+' : ''}{fmt(gap)}</span>)
              </>
            )}
            .
          </p>

          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
            <path d={fillFormados} fill="var(--color-good-tint)" opacity={0.7} />
            <path d={pAtivos} fill="none" stroke="var(--color-accent)" strokeWidth={1.6} strokeDasharray="3 2" />
            <path d={pFormados} fill="none" stroke="var(--color-good)" strokeWidth={1.8} />

            <line x1={xTo(displayIra)} y1={PAD_T - 2} x2={xTo(displayIra)} y2={PAD_T + PH} stroke="var(--color-accent-3)" strokeWidth={1.4} />
            <text x={xTo(displayIra)} y={PAD_T - 5} textAnchor="middle" fontSize={7} fontWeight={700} fill="var(--color-accent-3)">
              você
            </text>

            <line x1={PAD_L} y1={PAD_T + PH} x2={PAD_L + PW} y2={PAD_T + PH} stroke="var(--color-line)" />
            {[3, 5, 7, 9, 10].map((t) => (
              <text key={t} x={xTo(t)} y={PAD_T + PH + 12} textAnchor="middle" fontSize={7} fill="var(--color-ink-3)">
                {t}
              </text>
            ))}
          </svg>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-11 text-ink-2 mt-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 border-t-2 border-dashed border-accent inline-block" />
              Ativos ({sAtivos!.n})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 border-t-2 border-good inline-block" />
              Formados ({sFormados!.n})
            </span>
          </div>
        </>
      ) : (
        <EmptyChart>
          {course === 'Inteligência Artificial'
            ? 'Curso novo — ainda não há turmas formadas para comparar.'
            : `Poucos formados registrados em ${course ?? 'campus'} para comparar.`}
        </EmptyChart>
      )}
    </Card>
  );
}

// ── 2. IRA along the course (by semesters attended) ─────────────────────

function StageTimelineCard({
  ira,
  course,
  ingresso,
}: {
  ira: number;
  course: string | null;
  ingresso: string | null;
}) {
  const displayIra = clampIra(ira);
  const pool = useMemo(
    () => (course ? CAMPUS_STUDENTS.filter((s) => s.course === course) : CAMPUS_STUDENTS),
    [course],
  );
  const points = useMemo(() => iraByStage(pool, CAMPUS_UPDATED_AT, 12), [pool]);
  const myStage = ingresso ? semestersAttended(ingresso, CAMPUS_UPDATED_AT) : null;

  const minS = points[0]?.stage ?? 1;
  const maxS = Math.max(points[points.length - 1]?.stage ?? 10, minS + 1);
  const yMin = 3;
  const yMax = 10;

  const xTo = (s: number) => PAD_L + ((s - minS) / (maxS - minS)) * PW;
  const yTo = (v: number) => PAD_T + PH - ((Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin)) * PH;

  const meanLine = linePath(points.map((p) => ({ x: xTo(p.stage), y: yTo(p.mean) })));
  const bandPath =
    points.length > 1
      ? `${linePath(points.map((p) => ({ x: xTo(p.stage), y: yTo(p.q3) })))} ${[...points]
          .reverse()
          .map((p) => `L ${xTo(p.stage).toFixed(2)} ${yTo(p.q1).toFixed(2)}`)
          .join(' ')} Z`
      : '';

  const myClampedStage = myStage !== null ? Math.min(maxS, Math.max(minS, myStage)) : null;

  return (
    <Card padding="md" className="flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <CardKicker>Trajetória</CardKicker>
          <CardTitle>IRA ao longo do curso</CardTitle>
        </div>
        <TrendingUp size={18} className="text-accent shrink-0 mt-1" aria-hidden />
      </div>

      {points.length >= 2 ? (
        <>
          <p className="text-12 text-ink-3 mb-3">
            Média e faixa central (Q1–Q3) dos ativos por semestres cursados em {course ?? 'todo o campus'}.
          </p>

          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
            {[4, 6, 8, 10].map((v) => (
              <g key={v}>
                <line x1={PAD_L} y1={yTo(v)} x2={PAD_L + PW} y2={yTo(v)} stroke="var(--color-line)" strokeDasharray="2 3" opacity={0.6} />
                <text x={PAD_L - 5} y={yTo(v) + 2.5} textAnchor="end" fontSize={7} fill="var(--color-ink-3)">
                  {v}
                </text>
              </g>
            ))}

            {bandPath && <path d={bandPath} fill="var(--color-accent-tint)" opacity={0.85} />}
            <path d={meanLine} fill="none" stroke="var(--color-accent)" strokeWidth={1.8} />

            {points.map((p) => (
              <circle key={p.stage} cx={xTo(p.stage)} cy={yTo(p.mean)} r={2} fill="var(--color-accent)" />
            ))}

            {myClampedStage !== null && (
              <g>
                <circle
                  cx={xTo(myClampedStage)}
                  cy={yTo(displayIra)}
                  r={4}
                  fill="var(--color-accent-3)"
                  stroke="var(--color-surface-raised)"
                  strokeWidth={1.2}
                />
                <text
                  x={xTo(myClampedStage)}
                  y={yTo(displayIra) - 7}
                  textAnchor="middle"
                  fontSize={7}
                  fontWeight={700}
                  fill="var(--color-accent-3)"
                >
                  você ({myStage}º sem.)
                </text>
              </g>
            )}

            <line x1={PAD_L} y1={PAD_T + PH} x2={PAD_L + PW} y2={PAD_T + PH} stroke="var(--color-line)" />
            {points
              .filter((_, i) => i === 0 || i === points.length - 1 || points[i].stage % 2 === 0)
              .map((p) => (
                <text key={p.stage} x={xTo(p.stage)} y={PAD_T + PH + 12} textAnchor="middle" fontSize={7} fill="var(--color-ink-3)">
                  {p.stage === 12 ? '12+' : `${p.stage}º`}
                </text>
              ))}
          </svg>

          <p className="text-11 text-ink-3 mt-2">
            {myStage === null
              ? 'Informe seu ingresso no ranking ou importe seu histórico para marcar sua posição na curva.'
              : 'É normal o IRA oscilar nos primeiros semestres — a mediana costuma estabilizar a partir do 5º.'}
          </p>
        </>
      ) : (
        <EmptyChart>Sem semestres suficientes com ao menos {MIN_GROUP_SIZE} alunos neste recorte.</EmptyChart>
      )}
    </Card>
  );
}

// ── 3. Discipline bubble map (Grade × Effective Weight) & Semester waterfall

function bubbleColor(b: DisciplineBubble): string {
  if (b.simulated) return 'var(--color-accent-2-dark)';
  if (b.delta >= 0) return 'var(--color-good)';
  return 'var(--color-danger)';
}

function ImpactCard({ ira, entries }: { ira: number; entries: IraEntry[] }) {
  const [view, setView] = useState<'bolhas' | 'cascata'>('bolhas');
  const [hoverBubbleId, setHoverBubbleId] = useState<string | null>(null);
  const [hoverSem, setHoverSem] = useState<string | null>(null);

  const bubbles = useMemo(() => computeDisciplineBubbles(entries), [entries]);
  const evolution = useMemo(() => computeEvolution(entries), [entries]);
  const hoveredBubble = bubbles.find((b) => b.id === hoverBubbleId) ?? null;
  const hoveredEvo = evolution.find((e) => e.semester === hoverSem) ?? null;

  const displayIra = clampIra(ira);
  const maxEffWeight = Math.max(64, ...bubbles.map((b) => b.effectiveWeight));
  const maxDelta = Math.max(0.001, ...bubbles.map((b) => Math.abs(b.delta)));
  const minGrade = Math.max(0, Math.floor(Math.min(...bubbles.map((b) => b.grade), displayIra - 1)));

  // Bubble chart geometry (uses shared W, H, PAD_* from above)
  const bxTo = (g: number) => PAD_L + ((Math.max(minGrade, Math.min(10, g)) - minGrade) / Math.max(1, 10 - minGrade)) * PW;
  const byTo = (w: number) => PAD_T + PH - (w / maxEffWeight) * (PH - 6);
  const iraX = bxTo(displayIra);
  const midWeightY = byTo(maxEffWeight * 0.5);

  // Waterfall geometry
  const wfVals = evolution.map((e) => e.cumulativeIra);
  const wfMin = Math.max(0, Math.floor((Math.min(...wfVals, 10) - 0.5) * 2) / 2);
  const wfSpan = Math.max(1, 10 - wfMin);
  const wfSlotW = PW / Math.max(1, evolution.length);
  const wfBarW = Math.min(22, wfSlotW * 0.58);
  const wxAt = (i: number) => PAD_L + (i + 0.5) * wfSlotW;
  const wyAt = (v: number) => PAD_T + PH - ((Math.max(wfMin, Math.min(10, v)) - wfMin) / wfSpan) * PH;

  return (
    <Card padding="md" className="flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <CardKicker>Mapa de força</CardKicker>
          <CardTitle>Disciplinas e semestres no seu IRA</CardTitle>
        </div>
        <BarChart3 size={18} className="text-accent-3 shrink-0 mt-1" aria-hidden />
      </div>

      <div className="mb-2">
        <Segmented<'bolhas' | 'cascata'>
          size="sm"
          ariaLabel="Modo de visualização do impacto"
          value={view}
          onChange={setView}
          options={[
            { value: 'bolhas', label: 'Bolhas (Nota × Peso)' },
            { value: 'cascata', label: 'Cascata (Semestres)' },
          ]}
        />
      </div>

      {bubbles.length >= 2 ? (
        view === 'bolhas' ? (
          <>
            <div className="text-11 text-ink-3 min-h-[16px] mb-1 truncate">
              {hoveredBubble ? (
                <>
                  <b className="text-ink">{hoveredBubble.name}</b> ({hoveredBubble.semester}) · {hoveredBubble.workload}h ×{' '}
                  {hoveredBubble.weight}× · nota {fmt(hoveredBubble.grade, 1)} ·{' '}
                  <b className={hoveredBubble.delta >= 0 ? 'text-good' : 'text-danger'}>
                    {hoveredBubble.delta >= 0 ? '+' : ''}
                    {fmt(hoveredBubble.delta, 4)}
                  </b>
                </>
              ) : (
                'Tamanho = impacto no IRA · passe o mouse nas bolhas'
              )}
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto my-auto select-none">
              {/* Four quadrant tints divided at your IRA (X) and half weight (Y) */}
              <rect x={PAD_L} y={PAD_T} width={Math.max(0, iraX - PAD_L)} height={Math.max(0, midWeightY - PAD_T)} fill="var(--color-danger-tint)" opacity={0.35} />
              <rect x={iraX} y={PAD_T} width={Math.max(0, PAD_L + PW - iraX)} height={Math.max(0, midWeightY - PAD_T)} fill="var(--color-good-tint)" opacity={0.35} />

              <text x={PAD_L + 3} y={PAD_T + 9} fontSize={6} fill="var(--color-danger)" opacity={0.85}>
                Âncoras (peso alto, nota ↓)
              </text>
              <text x={PAD_L + PW - 3} y={PAD_T + 9} textAnchor="end" fontSize={6} fill="var(--color-good)" opacity={0.9}>
                Pilares (peso alto, nota ↑)
              </text>

              {/* Vertical IRA threshold */}
              <line x1={iraX} y1={PAD_T} x2={iraX} y2={PAD_T + PH} stroke="var(--color-accent-3)" strokeWidth={1.2} strokeDasharray="2.5 2" />
              <text x={iraX} y={PAD_T - 4} textAnchor="middle" fontSize={6.5} fontWeight={700} fill="var(--color-accent-3)">
                seu IRA {fmt(displayIra, 2)}
              </text>

              {/* Y-axis label */}
              <text x={PAD_L - 4} y={PAD_T + 6} textAnchor="end" fontSize={6} fill="var(--color-ink-3)">
                +peso
              </text>

              {/* Crosshair for hovered bubble */}
              {hoveredBubble && (
                <g pointerEvents="none">
                  <line x1={bxTo(hoveredBubble.grade)} y1={PAD_T} x2={bxTo(hoveredBubble.grade)} y2={PAD_T + PH} stroke="var(--color-ink-3)" strokeDasharray="1.5 2" />
                  <line x1={PAD_L} y1={byTo(hoveredBubble.effectiveWeight)} x2={PAD_L + PW} y2={byTo(hoveredBubble.effectiveWeight)} stroke="var(--color-ink-3)" strokeDasharray="1.5 2" />
                </g>
              )}

              {bubbles.map((b) => {
                const cx = bxTo(b.grade);
                const cy = byTo(b.effectiveWeight);
                const r = 2.6 + Math.sqrt(Math.abs(b.delta) / maxDelta) * 5.2;
                const isHover = hoverBubbleId === b.id;
                return (
                  <circle
                    key={b.id}
                    cx={cx}
                    cy={cy}
                    r={isHover ? r + 1.5 : r}
                    fill={bubbleColor(b)}
                    opacity={isHover ? 0.95 : 0.72}
                    stroke="var(--color-surface-raised)"
                    strokeWidth={isHover ? 1.5 : 0.8}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoverBubbleId(b.id)}
                    onMouseLeave={() => setHoverBubbleId(null)}
                  />
                );
              })}

              <line x1={PAD_L} y1={PAD_T + PH} x2={PAD_L + PW} y2={PAD_T + PH} stroke="var(--color-line)" />
              {[minGrade, Math.round((minGrade + 10) / 2), 10]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((g) => (
                  <text key={g} x={bxTo(g)} y={PAD_T + PH + 12} textAnchor="middle" fontSize={7} fill="var(--color-ink-3)">
                    {g}
                  </text>
                ))}
            </svg>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-10-5 text-ink-3 mt-1.5">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-good inline-block" /> puxou p/ cima
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-danger inline-block" /> puxou p/ baixo
              </span>
              {bubbles.some((b) => b.simulated) && (
                <span className="inline-flex items-center gap-1 text-accent-2-dark">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-accent-2-dark)] inline-block" /> previsão
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="text-11 text-ink-3 min-h-[16px] mb-1 truncate">
              {hoveredEvo ? (
                <>
                  <b className="text-ink">{hoveredEvo.semester}</b> · IRA {fmt(hoveredEvo.cumulativeIra, 4)}
                  {hoveredEvo.deltaIra !== null && (
                    <b className={`ml-1 ${hoveredEvo.deltaIra >= 0 ? 'text-good' : 'text-danger'}`}>
                      ({hoveredEvo.deltaIra >= 0 ? '+' : ''}
                      {fmt(hoveredEvo.deltaIra, 4)})
                    </b>
                  )}
                </>
              ) : (
                'Degraus de quanto cada semestre subiu ou desceu seu IRA'
              )}
            </div>

            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto my-auto select-none">
              {[wfMin, Number(((wfMin + 10) / 2).toFixed(1)), 10]
                .filter((v, i, a) => a.indexOf(v) === i)
                .map((v) => (
                  <g key={v}>
                    <line x1={PAD_L} y1={wyAt(v)} x2={PAD_L + PW} y2={wyAt(v)} stroke="var(--color-line)" strokeDasharray="2 3" opacity={0.6} />
                    <text x={PAD_L - 4} y={wyAt(v) + 2.5} textAnchor="end" fontSize={7} fill="var(--color-ink-3)">
                      {v}
                    </text>
                  </g>
                ))}

              {evolution.map((e, i) => {
                const prevVal = i === 0 ? wfMin : evolution[i - 1].cumulativeIra;
                const y1 = wyAt(prevVal);
                const y2 = wyAt(e.cumulativeIra);
                const top = Math.min(y1, y2);
                const barH = Math.max(3, Math.abs(y2 - y1));
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
                        strokeDasharray="1.5 1.5"
                      />
                    )}
                    <rect
                      x={cx - wfBarW / 2}
                      y={top}
                      width={wfBarW}
                      height={barH}
                      rx={2}
                      fill={fill}
                      opacity={isHover ? 1 : 0.85}
                    />
                    {(evolution.length <= 7 || i === 0 || i === evolution.length - 1 || isHover) && (
                      <text x={cx} y={PAD_T + PH + 12} textAnchor="middle" fontSize={6.5} fill="var(--color-ink-3)">
                        {e.semester}
                      </text>
                    )}
                  </g>
                );
              })}

              <line x1={PAD_L} y1={PAD_T + PH} x2={PAD_L + PW} y2={PAD_T + PH} stroke="var(--color-line)" />
            </svg>
          </>
        )
      ) : (
        <EmptyChart>Adicione pelo menos 2 disciplinas com nota para ver o mapa de força.</EmptyChart>
      )}
    </Card>
  );
}

export function IraInsightsGrid({
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
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <SurvivalCard ira={ira} course={course} />
      <StageTimelineCard ira={ira} course={course} ingresso={ingresso} />
      <ImpactCard ira={ira} entries={entries} />
    </div>
  );
}
