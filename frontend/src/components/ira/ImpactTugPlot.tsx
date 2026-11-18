'use client';

import { Expand, RotateCcw } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { IraEntry } from '@/data/types';
import {
  computeIra,
  computeSemesterComposition,
  type DisciplineBubble,
} from '@/lib/ira';
import { fmt } from './chartFormat';
import { dotColorByImpact, type TugScope } from './personalColors';

/**
 * Diverging Balance + Live Counterfactual Simulator ("E se sem?"):
 * Compares what pulled IRA down (left) vs up (right) by discipline or
 * semester, letting the student exclude any subset to measure the exact
 * resulting IRA without altering saved entries.
 */
export function ImpactTugPlot({
  ira,
  entries,
  bubbles,
  scope,
  activeId,
  onHover,
  onSelect,
  onRequestExpand,
  large = false,
}: {
  ira: number;
  entries: IraEntry[];
  bubbles: DisciplineBubble[];
  scope: TugScope;
  activeId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onRequestExpand?: () => void;
  large?: boolean;
}) {
  const [excluded, setExcluded] = useState<{ scope: TugScope; ids: string[] }>({ scope, ids: [] });
  const excludedIds = useMemo(
    () => (excluded.scope === scope ? excluded.ids : []),
    [excluded, scope],
  );

  function toggleExclude(id: string) {
    setExcluded((cur) => {
      const baseIds = cur.scope === scope ? cur.ids : [];
      const exists = baseIds.includes(id);
      return {
        scope,
        ids: exists ? baseIds.filter((x) => x !== id) : [...baseIds, id],
      };
    });
  }

  function clearExcluded() {
    setExcluded({ scope, ids: [] });
  }

  const counterfactualIra = useMemo(() => {
    if (excludedIds.length === 0) return null;
    const set = new Set(excludedIds);
    const filtered =
      scope === 'disciplinas'
        ? entries.filter((e) => !set.has(e.id))
        : entries.filter((e) => !set.has(e.semester ?? ''));
    return { computed: computeIra(filtered) };
  }, [entries, excludedIds, scope]);

  const sortedDisciplines = useMemo(
    () => [...bubbles].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.delta - a.delta),
    [bubbles],
  );

  const semesters = useMemo(() => computeSemesterComposition(entries), [entries]);

  const visibleDisciplines = large ? sortedDisciplines : sortedDisciplines.slice(0, 12);
  const maxDiscDelta = Math.max(0.001, ...bubbles.map((b) => Math.abs(b.delta)));
  const maxSemSide = Math.max(
    0.01,
    ...semesters.map((s) => s.disciplines.filter((d) => d.delta > 0).reduce((a, d) => a + d.delta, 0)),
    ...semesters.map((s) => s.disciplines.filter((d) => d.delta < 0).reduce((a, d) => a + Math.abs(d.delta), 0)),
  );

  const counterDiff =
    counterfactualIra?.computed !== null && counterfactualIra?.computed !== undefined
      ? Number((counterfactualIra.computed - ira).toFixed(4))
      : null;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Live counterfactual result banner */}
      {excludedIds.length > 0 && (
        <div className="rounded-md px-3 py-2 bg-accent-tint border border-accent/30 flex items-center justify-between gap-2 flex-wrap text-xs">
          {counterfactualIra?.computed !== null && counterfactualIra?.computed !== undefined && counterDiff !== null ? (
            <div className="flex items-center gap-2 flex-wrap tabular-nums">
              <span className="text-ink-2">
                IRA atual: <b className="font-heading text-ink">{fmt(ira, 4)}</b>
              </span>
              <span className="text-ink-3" aria-hidden="true">
                →
              </span>
              <span className="text-ink-2">
                Sem {excludedIds.length}{' '}
                {scope === 'disciplinas'
                  ? excludedIds.length === 1
                    ? 'disciplina'
                    : 'disciplinas'
                  : excludedIds.length === 1
                    ? 'semestre'
                    : 'semestres'}
                : <b className="font-heading text-accent-dark">{fmt(counterfactualIra.computed, 4)}</b>
              </span>
              <span
                className={`font-heading font-bold px-1.5 py-0.5 rounded ${
                  counterDiff >= 0 ? 'bg-good-tint text-good' : 'bg-danger-tint text-danger'
                }`}
              >
                {counterDiff >= 0 ? '+' : ''}
                {fmt(counterDiff, 4)}
              </span>
            </div>
          ) : (
            <span className="text-ink-2">Todas as disciplinas com nota foram removidas da simulação.</span>
          )}
          <button
            type="button"
            onClick={clearExcluded}
            className="inline-flex items-center gap-1 font-heading font-semibold text-11 text-accent-dark hover:underline cursor-pointer shrink-0"
          >
            <RotateCcw size={12} aria-hidden="true" />
            Limpar
          </button>
        </div>
      )}

      {/* Diverging axis legend */}
      <div className="hidden sm:grid sm:grid-cols-[minmax(0,1.25fr)_minmax(120px,1.5fr)_auto_auto] items-center gap-2 px-2 text-10-5 font-heading font-semibold text-ink-3">
        <span>{scope === 'disciplinas' ? 'Disciplina' : 'Semestre'}</span>
        <div className="flex items-center justify-between">
          <span className="text-danger">← Puxou p/ baixo</span>
          <span>0</span>
          <span className="text-good">Puxou p/ cima →</span>
        </div>
        <span className="text-right min-w-[66px]">Impacto</span>
        <span className="text-right min-w-[76px]">Simular</span>
      </div>

      {/* Scrollable diverging list */}
      <div
        className={`flex flex-col gap-1.5 ${
          large ? 'max-h-[430px] lg:max-h-[470px] overflow-y-auto pr-1' : 'max-h-[380px] overflow-y-auto pr-0.5'
        }`}
      >
        {scope === 'disciplinas'
          ? visibleDisciplines.map((b) => {
              const isFocus = activeId === b.id;
              const isExcluded = excludedIds.includes(b.id);
              const pct = Math.min(50, (Math.abs(b.delta) / maxDiscDelta) * 50);
              const isPos = b.delta >= 0;
              const barColor = dotColorByImpact(b.delta, b.simulated);

              return (
                <div
                  key={b.id}
                  onMouseEnter={() => onHover(b.id)}
                  onMouseLeave={() => onHover(null)}
                  onClick={() => onSelect(b.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(b.id);
                    }
                  }}
                  className={`grid grid-cols-1 sm:grid-cols-[minmax(0,1.25fr)_minmax(120px,1.5fr)_auto_auto] items-stretch sm:items-center gap-2 px-2.5 py-2 sm:py-1.5 rounded-md border text-left transition-colors cursor-pointer ${
                    isExcluded
                      ? 'border-dashed border-accent bg-accent-tint/35 opacity-65'
                      : isFocus
                        ? 'border-accent bg-accent-tint/60'
                        : 'border-line bg-surface hover:bg-surface-sunken'
                  }`}
                >
                  <div className="min-w-0">
                    <div className={`text-xs font-medium text-ink truncate ${isExcluded ? 'line-through' : ''}`}>
                      {b.name}
                    </div>
                    <div className="text-10 text-ink-3 tabular-nums truncate">
                      {b.semester} · {b.situacao === 'trancado' ? 'Tranc.' : `nota ${fmt(b.grade, 1)}`} · {b.workload}h ({b.weight}×)
                    </div>
                  </div>

                  {/* Diverging bar around 50% centerline */}
                  <div className="relative h-5 rounded-sm bg-surface-sunken overflow-hidden">
                    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-line-strong z-10" />
                    {Math.abs(b.delta) > 0 && (
                      <div
                        style={{
                          background: barColor,
                          width: `${pct}%`,
                          minWidth: '3px',
                          ...(isPos ? { left: '50%' } : { right: '50%' }),
                        }}
                        className={`absolute top-1 bottom-1 opacity-90 ${isPos ? 'rounded-r-sm' : 'rounded-l-sm'}`}
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:contents">
                    <span
                      className={`font-heading font-bold text-11-5 tabular-nums sm:text-right sm:min-w-[66px] ${
                        b.simulated ? 'text-accent-2-dark' : isPos ? 'text-good' : 'text-danger'
                      }`}
                    >
                      {isPos ? '+' : ''}
                      {fmt(b.delta, 4)}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExclude(b.id);
                      }}
                      className={`text-10-5 font-heading font-semibold px-2.5 py-1 rounded-full border min-w-[82px] text-center cursor-pointer transition-colors ${
                        isExcluded
                          ? 'bg-accent text-accent-ink border-accent'
                          : 'bg-surface-raised text-ink-2 border-line hover:border-accent hover:text-ink'
                      }`}
                    >
                      {isExcluded ? 'Excluída' : 'Simular sem'}
                    </button>
                  </div>
                </div>
              );
            })
          : semesters.map((sem) => {
              const isExcluded = excludedIds.includes(sem.semester);
              const negDiscs = sem.disciplines.filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta);
              const posDiscs = sem.disciplines.filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta);
              const semPos = sem.delta >= 0;

              let negOffsetPct = 0;
              let posOffsetPct = 0;

              return (
                <div
                  key={sem.semester}
                  className={`grid grid-cols-1 sm:grid-cols-[minmax(0,1.25fr)_minmax(120px,1.5fr)_auto_auto] items-stretch sm:items-center gap-2 px-2.5 py-2 rounded-md border transition-colors ${
                    isExcluded
                      ? 'border-dashed border-accent bg-accent-tint/35 opacity-65'
                      : 'border-line bg-surface hover:bg-surface-sunken/70'
                  }`}
                >
                  <div className="min-w-0">
                    <div className={`text-xs font-heading font-semibold text-ink truncate ${isExcluded ? 'line-through' : ''}`}>
                      {sem.semester}{' '}
                      <span className="text-10 font-semibold px-1 py-px rounded bg-surface-sunken text-ink-3 ml-1">
                        {sem.weight}×
                      </span>
                    </div>
                    <div className="text-10 text-ink-3 tabular-nums truncate">
                      {sem.disciplines.length} {sem.disciplines.length === 1 ? 'disciplina' : 'disciplinas'}
                      {sem.average !== null ? ` · média ${fmt(sem.average, 2)}` : ''}
                    </div>
                  </div>

                  {/* Stacked diverging bar by discipline segment */}
                  <div className="relative h-6 rounded-sm bg-surface-sunken overflow-hidden">
                    <div className="absolute top-0 bottom-0 left-1/2 w-px bg-line-strong z-10" />
                    {negDiscs.map((d) => {
                      const wPct = Math.max(0.8, (Math.abs(d.delta) / maxSemSide) * 48);
                      const rightFromCenter = negOffsetPct;
                      negOffsetPct += wPct;
                      const isFocus = activeId === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onMouseEnter={() => onHover(d.id)}
                          onMouseLeave={() => onHover(null)}
                          onClick={() => onSelect(d.id)}
                          aria-label={`${d.name} (${sem.semester}): ${fmt(d.delta, 4)} no IRA`}
                          title={`${d.name}: ${fmt(d.delta, 4)}`}
                          style={{
                            right: `${50 + rightFromCenter}%`,
                            width: `${Math.min(50 - rightFromCenter, wPct)}%`,
                            background: d.simulated ? 'var(--color-accent-2-dark)' : 'var(--color-danger)',
                          }}
                          className={`absolute top-1 bottom-1 border-r border-surface-raised cursor-pointer ${
                            isFocus ? 'ring-1 ring-ink z-20 opacity-100' : 'opacity-85 hover:opacity-100'
                          }`}
                        />
                      );
                    })}
                    {posDiscs.map((d) => {
                      const wPct = Math.max(0.8, (d.delta / maxSemSide) * 48);
                      const leftFromCenter = posOffsetPct;
                      posOffsetPct += wPct;
                      const isFocus = activeId === d.id;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onMouseEnter={() => onHover(d.id)}
                          onMouseLeave={() => onHover(null)}
                          onClick={() => onSelect(d.id)}
                          aria-label={`${d.name} (${sem.semester}): +${fmt(d.delta, 4)} no IRA`}
                          title={`${d.name}: +${fmt(d.delta, 4)}`}
                          style={{
                            left: `${50 + leftFromCenter}%`,
                            width: `${Math.min(50 - leftFromCenter, wPct)}%`,
                            background: d.simulated ? 'var(--color-accent-2-dark)' : 'var(--color-good)',
                          }}
                          className={`absolute top-1 bottom-1 border-l border-surface-raised cursor-pointer ${
                            isFocus ? 'ring-1 ring-ink z-20 opacity-100' : 'opacity-85 hover:opacity-100'
                          }`}
                        />
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-2 sm:contents">
                    <span
                      className={`font-heading font-bold text-11-5 tabular-nums sm:text-right sm:min-w-[66px] ${
                        sem.simulated ? 'text-accent-2-dark' : semPos ? 'text-good' : 'text-danger'
                      }`}
                    >
                      {semPos ? '+' : ''}
                      {fmt(sem.delta, 4)}
                    </span>

                    <button
                      type="button"
                      onClick={() => toggleExclude(sem.semester)}
                      className={`text-10-5 font-heading font-semibold px-2.5 py-1 rounded-full border min-w-[82px] text-center cursor-pointer transition-colors ${
                        isExcluded
                          ? 'bg-accent text-accent-ink border-accent'
                          : 'bg-surface-raised text-ink-2 border-line hover:border-accent hover:text-ink'
                      }`}
                    >
                      {isExcluded ? 'Excluído' : 'Simular sem'}
                    </button>
                  </div>
                </div>
              );
            })}
      </div>

      {scope === 'disciplinas' && !large && sortedDisciplines.length > 12 && onRequestExpand && (
        <button
          type="button"
          onClick={onRequestExpand}
          className="inline-flex items-center justify-center gap-1.5 text-11-5 font-heading font-semibold text-accent-dark bg-accent-tint/60 hover:bg-accent-tint border border-accent/25 rounded-md py-1.5 px-3 cursor-pointer transition-colors"
        >
          <Expand size={13} aria-hidden="true" />
          Ver todas as {sortedDisciplines.length} disciplinas na visão ampliada
        </button>
      )}
    </div>
  );
}
