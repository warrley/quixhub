'use client';

import { GraduationCap, Layers, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { Card, CardKicker, CardTitle } from '@/components/Card';
import {
  MIN_GROUP_SIZE,
  iraByStage,
  kde,
  percentileBelow,
  semestersAttended,
  summarize,
} from '@/lib/iraCampus';
import { CAMPUS_COURSES, CAMPUS_STUDENTS, CAMPUS_UPDATED_AT, groupIras } from '@/lib/iraCampusData';
import { clampIra } from '@/lib/statistics';
import { EmptyChart } from './chartKit';
import { fmt, linePath, pct } from './chartFormat';

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

const SHORT_COURSE: Record<string, string> = {
  'Ciência da Computação': 'Ciência Comp.',
  'Design Digital': 'Design Digital',
  'Engenharia de Computação': 'Eng. Comp.',
  'Engenharia de Software': 'Eng. Software',
  'Inteligência Artificial': 'Intel. Artif.',
  'Redes de Computadores': 'Redes Comp.',
  'Sistemas de Informação': 'Sist. Info.',
};

function CourseCampusBenchmarkCard({ ira, course }: { ira: number; course: string | null }) {
  const displayIra = clampIra(ira);
  const rows = useMemo(() => {
    return CAMPUS_COURSES.map((c) => {
      const vals = groupIras(c, 'ativos');
      const s = summarize(vals);
      return {
        course: c,
        short: SHORT_COURSE[c] ?? c,
        n: s?.n ?? 0,
        q1: s?.q1 ?? 0,
        median: s?.median ?? 0,
        q3: s?.q3 ?? 0,
        pct: vals.length > 0 ? percentileBelow(vals, displayIra) : 0,
      };
    }).sort((a, b) => b.median - a.median);
  }, [displayIra]);

  return (
    <Card padding="md" className="flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <CardKicker>Panorama dos ativos</CardKicker>
          <CardTitle>Seu IRA nos cursos do campus</CardTitle>
        </div>
        <Layers size={18} className="text-accent-3 shrink-0 mt-1" aria-hidden />
      </div>

      <p className="text-11-5 text-ink-3 mb-2.5">Faixa central (Q1–Q3) e mediana dos ativos com sua nota marcada.</p>

      <div className="flex flex-col gap-2 flex-1 justify-center">
        {rows.map((r) => {
          const active = r.course === course;
          return (
            <div key={r.course} className="grid grid-cols-[92px_1fr_36px] items-center gap-2 text-11">
              <span className={`truncate ${active ? 'font-heading font-bold text-accent-dark' : 'text-ink-2'}`} title={r.course}>
                {r.short}
              </span>
              <div className="relative h-3 rounded-full bg-surface-sunken overflow-hidden">
                <div
                  className="absolute top-0.5 bottom-0.5 rounded-full"
                  style={{
                    left: `${r.q1 * 10}%`,
                    width: `${Math.max(4, (r.q3 - r.q1) * 10)}%`,
                    background: active ? 'var(--color-accent-tint-2)' : 'var(--color-line-strong)',
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5"
                  style={{ left: `${r.median * 10}%`, background: 'var(--color-ink-2)' }}
                  title={`Mediana: ${fmt(r.median, 2)}`}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5"
                  style={{ left: `${displayIra * 10}%`, background: 'var(--color-accent-3)' }}
                />
              </div>
              <span className={`text-right tabular-nums ${active ? 'font-bold text-accent-dark' : 'text-ink-3'}`}>
                {pct(r.pct)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export function IraInsightsGrid({
  ira,
  course,
  ingresso,
}: {
  ira: number;
  course: string | null;
  ingresso: string | null;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <SurvivalCard ira={ira} course={course} />
      <StageTimelineCard ira={ira} course={course} ingresso={ingresso} />
      <CourseCampusBenchmarkCard ira={ira} course={course} />
    </div>
  );
}
