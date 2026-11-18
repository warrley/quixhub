'use client';

import { Anchor, ArrowUpRight, Compass, Expand, Gauge, HelpCircle, Layers, Scale, Target, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Card, CardKicker, CardTitle } from '@/components/Card';
import { Segmented } from '@/components/Segmented';
import type { IraEntry } from '@/data/types';
import { computeDisciplineBubbles, computeIraSensitivity } from '@/lib/ira';
import { EmptyChart } from './chartKit';
import { fmt } from './chartFormat';
import { BubblesPlot } from './BubblesPlot';
import { ChartGuideDialog } from './ChartGuideDialog';
import { ImpactTugPlot } from './ImpactTugPlot';
import {
  dotColorByImpact,
  type PersonalView,
  type TreemapSizing,
  type TugScope,
} from './personalColors';
import { SemesterBridgePlot } from './SemesterBridgePlot';
import { TreemapPlot } from './TreemapPlot';

type SidebarFilter = 'todas' | 'subiram' | 'cairam';

/**
 * Personal discipline & semester IRA analytics:
 * 1. Top 4-card horizontal sensitivity & inertia strip.
 * 2. Full-width 4-mode interactive chart card (2D Squarified Treemap,
 *    Waterfall Semester Bridge, Iso-Impact Bubbles, and Counterfactual Tug).
 * 3. Near-fullscreen native <dialog> modal synced with a filterable sidebar.
 */
export function IraPersonalAnalytics({
  ira,
  entries,
}: {
  ira: number;
  entries: IraEntry[];
}) {
  const [view, setView] = useState<PersonalView>('treemap');
  const [treemapSizing, setTreemapSizing] = useState<TreemapSizing>('impacto');
  const [tugScope, setTugScope] = useState<TugScope>('disciplinas');
  const [focusSemester, setFocusSemester] = useState('todos');
  const [targetDelta, setTargetDelta] = useState<number>(0.1);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [listFilter, setListFilter] = useState<SidebarFilter>('todas');
  const [guideOpen, setGuideOpen] = useState(false);
  const [seenGuides, setSeenGuides] = useState<PersonalView[]>([]);
  const [skipAutoGuide, setSkipAutoGuide] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTitleId = useId();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('quixhub-ira-chart-guides');
      if (raw) {
        const parsed = JSON.parse(raw) as { seen?: PersonalView[]; skipAuto?: boolean };
        if (Array.isArray(parsed.seen)) setSeenGuides(parsed.seen);
        if (typeof parsed.skipAuto === 'boolean') setSkipAutoGuide(parsed.skipAuto);
      }
    } catch {
      // ignore invalid storage
    }
  }, []);

  function persistGuides(seen: PersonalView[], skipAuto: boolean) {
    try {
      localStorage.setItem('quixhub-ira-chart-guides', JSON.stringify({ seen, skipAuto }));
    } catch {
      // ignore storage errors
    }
  }

  function handleSelectView(nextView: PersonalView) {
    setView(nextView);
    if (!skipAutoGuide && !seenGuides.includes(nextView)) {
      const nextSeen = [...seenGuides, nextView];
      setSeenGuides(nextSeen);
      persistGuides(nextSeen, skipAutoGuide);
      setGuideOpen(true);
    }
  }

  function handleOpenGuide() {
    if (!seenGuides.includes(view)) {
      const nextSeen = [...seenGuides, view];
      setSeenGuides(nextSeen);
      persistGuides(nextSeen, skipAutoGuide);
    }
    setGuideOpen(true);
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (expanded) {
      if (!dialog.open) dialog.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      if (dialog.open) dialog.close();
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [expanded]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || 'closedBy' in HTMLDialogElement.prototype) return;
    const onBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isInside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isInside) dialog.close();
    };
    dialog.addEventListener('click', onBackdropClick);
    return () => dialog.removeEventListener('click', onBackdropClick);
  }, []);

  const bubbles = useMemo(() => computeDisciplineBubbles(entries), [entries]);
  const sensitivity = useMemo(() => computeIraSensitivity(entries), [entries]);
  const sortedByImpact = useMemo(
    () => [...bubbles].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || b.delta - a.delta),
    [bubbles],
  );

  const strongestPillar = useMemo(() => {
    const positives = bubbles.filter((b) => b.delta > 0.0005).sort((a, b) => b.delta - a.delta);
    return positives[0] ?? null;
  }, [bubbles]);

  const heaviestAnchor = useMemo(() => {
    const negatives = bubbles.filter((b) => b.delta < -0.0005).sort((a, b) => a.delta - b.delta);
    return negatives[0] ?? null;
  }, [bubbles]);

  const semesters = useMemo(() => {
    const s = new Set(bubbles.map((b) => b.semester).filter((x) => x !== '—'));
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [bubbles]);

  const sidebarList = useMemo(() => {
    if (listFilter === 'subiram') return sortedByImpact.filter((b) => b.delta > 0.0005);
    if (listFilter === 'cairam') return sortedByImpact.filter((b) => b.delta < -0.0005);
    return sortedByImpact;
  }, [sortedByImpact, listFilter]);

  const activeId = hoverId ?? pinnedId;
  const activeBubble = bubbles.find((b) => b.id === activeId) ?? null;

  const togglePin = (id: string) => setPinnedId((cur) => (cur === id ? null : id));

  const selectedTarget =
    sensitivity?.targets.find((t) => Math.abs(t.delta - targetDelta) < 0.001) ??
    sensitivity?.targets[1] ??
    null;

  const viewTitle =
    view === 'treemap'
      ? 'Mapa 2D dos semestres e disciplinas'
      : view === 'ponte'
        ? 'Ponte dos semestres e dispersão das notas'
        : view === 'bolhas'
          ? `Mapa de força e iso-impacto (${bubbles.length} disciplinas)`
          : 'Balança de Impacto · Simulação de Exclusão';

  const renderControls = (isModal: boolean) => (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <Segmented<PersonalView>
        size="sm"
        ariaLabel={isModal ? 'Visualização ampliada' : 'Visualização do seu histórico'}
        value={view}
        onChange={handleSelectView}
        options={[
          { value: 'treemap', label: 'Treemap' },
          { value: 'ponte', label: 'Ponte dos semestres' },
          { value: 'bolhas', label: 'Bolhas' },
          { value: 'balanca', label: 'Balança de Impacto' },
        ]}
      />

      {view === 'treemap' && (
        <Segmented<TreemapSizing>
          size="sm"
          ariaLabel="Tamanho dos blocos no treemap"
          value={treemapSizing}
          onChange={setTreemapSizing}
          options={[
            { value: 'impacto', label: 'Tamanho: Impacto |Δ|' },
            { value: 'notaPeso', label: 'Tamanho: Nota × Peso' },
          ]}
        />
      )}

      {view === 'bolhas' && semesters.length > 1 && (
        <select
          value={focusSemester}
          onChange={(e) => {
            setFocusSemester(e.target.value);
            setPinnedId(null);
          }}
          aria-label="Filtrar semestre no mapa de bolhas"
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

      {view === 'balanca' && (
        <Segmented<TugScope>
          size="sm"
          ariaLabel="Agrupamento da balança"
          value={tugScope}
          onChange={setTugScope}
          options={[
            { value: 'disciplinas', label: 'Por disciplina' },
            { value: 'semestres', label: 'Por semestre' },
          ]}
        />
      )}
    </div>
  );

  const renderInspector = () =>
    bubbles.length >= 2 && (
      <div className="rounded-md px-3 py-2 bg-surface-sunken text-xs flex items-center justify-between gap-2 flex-wrap min-h-[38px]">
        {activeBubble ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: dotColorByImpact(activeBubble.delta, activeBubble.simulated) }}
              />
              <b className="font-heading text-ink truncate">{activeBubble.name}</b>
              <span className="text-11 text-ink-3 shrink-0 tabular-nums">
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
                nota{' '}
                <b className="text-ink">
                  {activeBubble.situacao === 'trancado' ? 'Tranc.' : fmt(activeBubble.grade, 1)}
                </b>
              </span>
              <span
                className={`font-heading font-bold ${
                  activeBubble.simulated
                    ? 'text-accent-2-dark'
                    : activeBubble.delta >= 0
                      ? 'text-good'
                      : 'text-danger'
                }`}
              >
                {activeBubble.delta >= 0 ? '+' : ''}
                {fmt(activeBubble.delta, 4)} no IRA
              </span>
              {pinnedId && (
                <button
                  type="button"
                  onClick={() => setPinnedId(null)}
                  className="text-10-5 font-heading font-semibold text-ink-3 hover:text-ink underline cursor-pointer"
                >
                  Soltar
                </button>
              )}
            </div>
          </>
        ) : (
          <span className="text-11-5 text-ink-3">
            Passe o mouse ou clique em um bloco/ponto para inspecionar seu impacto real no IRA · clique em Ampliar para explorar em tela quase cheia.
          </span>
        )}
      </div>
    );

  const renderLegend = () =>
    bubbles.length >= 2 && (
      <div className="mt-2 pt-2 border-t border-line flex flex-wrap items-center justify-between gap-2 text-11 text-ink-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-good inline-block" /> Subiu o IRA (+Δ)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" /> Baixou o IRA (−Δ)
          </span>
          {bubbles.some((b) => b.simulated) && (
            <span className="inline-flex items-center gap-1.5 text-accent-2-dark font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-accent-2-dark)] inline-block" /> Previsão
            </span>
          )}
        </div>
        {view === 'treemap' && (
          <span className="text-10-5 text-ink-3">
            Mesmo notas ≥ 7 ficam em vermelho se estiverem abaixo do seu IRA e puxarem a média para baixo.
          </span>
        )}
      </div>
    );

  const renderChart = (large = false) => {
    if (bubbles.length < 2) {
      return <EmptyChart>Adicione pelo menos 2 disciplinas com nota para liberar os gráficos do seu histórico.</EmptyChart>;
    }
    if (view === 'treemap') {
      return (
        <TreemapPlot
          entries={entries}
          sizing={treemapSizing}
          activeId={activeId}
          onHover={setHoverId}
          onSelect={togglePin}
          large={large}
        />
      );
    }
    if (view === 'ponte') {
      return (
        <SemesterBridgePlot
          entries={entries}
          activeId={activeId}
          onHover={setHoverId}
          onSelect={togglePin}
          large={large}
        />
      );
    }
    if (view === 'bolhas') {
      return (
        <BubblesPlot
          ira={ira}
          entries={entries}
          bubbles={bubbles}
          focusSemester={focusSemester}
          activeId={activeId}
          onHover={setHoverId}
          onSelect={togglePin}
          large={large}
        />
      );
    }
    return (
      <ImpactTugPlot
        ira={ira}
        entries={entries}
        bubbles={bubbles}
        scope={tugScope}
        activeId={activeId}
        onHover={setHoverId}
        onSelect={togglePin}
        onRequestExpand={() => setExpanded(true)}
        large={large}
      />
    );
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h2 className="font-heading font-bold text-15 text-ink">Suas disciplinas e semestres</h2>
          <p className="text-xs text-ink-3">Como cada matéria, peso de período e trancamento compõem o seu IRA</p>
        </div>
      </div>

      {/* Top 4-Card Horizontal Sensitivity & Inertia Strip */}
      {sensitivity && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
          {/* Card 1: Marginal 64h balance */}
          <Card padding="sm" className="flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-heading font-bold text-10-5 uppercase tracking-wide text-ink-3">
                Balança de 1 matéria (64h · {sensitivity.nextWeight}×)
              </div>
              <Gauge size={14} className="text-accent shrink-0" aria-hidden="true" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-sm px-2 py-1.5 bg-good-tint">
                <div className="font-heading font-extrabold text-13 text-good tabular-nums">
                  {sensitivity.deltaGrade10_64h >= 0 ? '+' : ''}
                  {fmt(sensitivity.deltaGrade10_64h, 4)}
                </div>
                <div className="text-10 text-ink-2">Nota 10</div>
              </div>
              <div
                className={`rounded-sm px-2 py-1.5 ${
                  sensitivity.deltaGrade8_64h >= 0 ? 'bg-good-tint/60' : 'bg-danger-tint/70'
                }`}
              >
                <div
                  className={`font-heading font-extrabold text-13 tabular-nums ${
                    sensitivity.deltaGrade8_64h >= 0 ? 'text-good' : 'text-danger'
                  }`}
                >
                  {sensitivity.deltaGrade8_64h >= 0 ? '+' : ''}
                  {fmt(sensitivity.deltaGrade8_64h, 4)}
                </div>
                <div className="text-10 text-ink-2">Nota 8</div>
              </div>
              <div className="rounded-sm px-2 py-1.5 bg-danger-tint/75">
                <div className="font-heading font-extrabold text-13 text-danger tabular-nums">
                  {sensitivity.deltaGrade5_64h >= 0 ? '+' : ''}
                  {fmt(sensitivity.deltaGrade5_64h, 4)}
                </div>
                <div className="text-10 text-ink-2">Nota 5</div>
              </div>
              <div className="rounded-sm px-2 py-1.5 bg-danger-tint">
                <div className="font-heading font-extrabold text-13 text-danger tabular-nums">
                  {fmt(sensitivity.deltaLock64h, 4)}
                </div>
                <div className="text-10 text-ink-2">Trancar 64h</div>
              </div>
            </div>
          </Card>

          {/* Card 2: Interactive target average in 256h */}
          <Card padding="sm" className="flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-heading font-bold text-10-5 uppercase tracking-wide text-ink-3">
                Meta p/ próximo semestre (256h)
              </div>
              <Target size={14} className="text-accent shrink-0" aria-hidden="true" />
            </div>
            <div className="flex gap-1">
              {sensitivity.targets.map((t) => {
                const active = Math.abs(t.delta - targetDelta) < 0.001;
                return (
                  <button
                    key={t.delta}
                    type="button"
                    onClick={() => setTargetDelta(t.delta)}
                    className={`flex-1 py-1 px-1.5 rounded-sm text-11 font-heading font-bold cursor-pointer border transition-colors tabular-nums ${
                      active
                        ? 'bg-accent text-accent-ink border-accent'
                        : 'bg-surface-sunken text-ink-2 border-line hover:text-ink'
                    }`}
                  >
                    +{fmt(t.delta, 2).replace('.', ',')}
                  </button>
                );
              })}
            </div>
            {selectedTarget && selectedTarget.neededAvg !== null ? (
              <p className="text-xs text-ink-2 leading-snug">
                Para subir <b className="text-ink tabular-nums">+{fmt(selectedTarget.delta, 2)}</b> em 256h, feche média{' '}
                <b className="font-heading text-accent-dark text-sm tabular-nums">{fmt(selectedTarget.neededAvg, 2)}</b>.
              </p>
            ) : (
              <p className="text-xs text-ink-2 leading-snug">
                Mesmo com média 10 em 256h, seu ganho máximo no próximo período é{' '}
                <b className="font-heading text-accent-dark tabular-nums">+{fmt(sensitivity.maxGainNextSemester, 4)}</b>.
              </p>
            )}
          </Card>

          {/* Card 3: Inertia & recent 3-semester leverage */}
          <Card padding="sm" className="flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-heading font-bold text-10-5 uppercase tracking-wide text-ink-3">
                Inércia e alavanca atual
              </div>
              <Layers size={14} className="text-accent shrink-0" aria-hidden="true" />
            </div>
            <div className="flex items-baseline justify-between gap-2 tabular-nums">
              <div>
                <span className="font-heading font-extrabold text-19 text-ink">{sensitivity.gradedHours}h</span>{' '}
                <span className="text-11 text-ink-3">cursadas</span>
              </div>
              <span className="text-11 font-heading font-semibold px-2 py-0.5 rounded-full bg-accent-tint text-accent-dark">
                Próx. peso {sensitivity.nextWeight}×
              </span>
            </div>
            <div>
              <div className="flex items-center justify-between text-10-5 text-ink-2 mb-1 tabular-nums">
                <span>Últimos 3 semestres no seu peso</span>
                <b className="text-ink">{sensitivity.recentWeightShare.toFixed(0)}%</b>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-sunken overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.min(100, Math.max(4, sensitivity.recentWeightShare))}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Card 4: Withdrawals cost or clickable strongest pillar & heaviest anchor */}
          <Card padding="sm" className="flex flex-col justify-between gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-heading font-bold text-10-5 uppercase tracking-wide text-ink-3">
                {sensitivity.iraWithoutLocks !== null ? 'Trancamentos e extremos' : 'Maior pilar e maior âncora'}
              </div>
              <Scale size={14} className="text-accent shrink-0" aria-hidden="true" />
            </div>

            {sensitivity.iraWithoutLocks !== null && (
              <div className="rounded-sm px-2 py-1.5 bg-danger-tint/70 border border-danger/20 text-11 text-ink-2 leading-snug tabular-nums">
                Sem {sensitivity.lockedHours}h trancadas: <b className="text-ink">{fmt(sensitivity.iraWithoutLocks, 4)}</b>{' '}
                (<span className="text-danger font-semibold">{fmt(sensitivity.lockPenaltyCost, 4)}</span>).
              </div>
            )}

            <div className="flex flex-col gap-1">
              {strongestPillar && (
                <button
                  type="button"
                  onClick={() => setPinnedId((cur) => (cur === strongestPillar.id ? null : strongestPillar.id))}
                  className="flex items-center justify-between gap-2 px-2 py-1 rounded-sm bg-good-tint/75 hover:bg-good-tint text-left text-11 cursor-pointer transition-colors"
                  title="Focar maior pilar nos gráficos"
                >
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <ArrowUpRight size={12} className="text-good shrink-0" aria-hidden="true" />
                    <span className="truncate font-medium text-ink">{strongestPillar.name}</span>
                  </span>
                  <b className="font-heading text-good tabular-nums shrink-0">+{fmt(strongestPillar.delta, 4)}</b>
                </button>
              )}
              {heaviestAnchor && (
                <button
                  type="button"
                  onClick={() => setPinnedId((cur) => (cur === heaviestAnchor.id ? null : heaviestAnchor.id))}
                  className="flex items-center justify-between gap-2 px-2 py-1 rounded-sm bg-danger-tint/75 hover:bg-danger-tint text-left text-11 cursor-pointer transition-colors"
                  title="Focar maior âncora nos gráficos"
                >
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <Anchor size={12} className="text-danger shrink-0" aria-hidden="true" />
                    <span className="truncate font-medium text-ink">{heaviestAnchor.name}</span>
                  </span>
                  <b className="font-heading text-danger tabular-nums shrink-0">{fmt(heaviestAnchor.delta, 4)}</b>
                </button>
              )}
              {!strongestPillar && !heaviestAnchor && (
                <div className="inline-flex items-center gap-1.5 text-11 text-ink-3 py-2">
                  <Compass size={13} aria-hidden="true" />
                  Adicione mais notas para destacar extremos.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Full-width Main Chart Card */}
      <Card padding="md" className="w-full flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardKicker>Análise do seu histórico</CardKicker>
            <CardTitle>{viewTitle}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenGuide}
              className="inline-flex items-center gap-1.5 text-11-5 font-heading font-semibold text-ink-2 hover:text-ink bg-surface-sunken border border-line rounded-full px-3 py-1.5 cursor-pointer transition-colors"
              title="Abrir legenda e guia explicativo deste gráfico"
            >
              <HelpCircle size={13} aria-hidden="true" />
              Como ler?
            </button>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-1.5 text-11-5 font-heading font-semibold text-ink-2 hover:text-ink bg-surface-sunken border border-line rounded-full px-3 py-1.5 cursor-pointer transition-colors"
              title="Abrir visualização ampliada em tela quase cheia"
            >
              <Expand size={13} aria-hidden="true" />
              Ampliar
            </button>
          </div>
        </div>

        {renderControls(false)}
        {renderInspector()}
        <div>{renderChart(false)}</div>
        {renderLegend()}
      </Card>

      {/* Legend / Guide Modal for each chart */}
      <ChartGuideDialog
        view={view}
        open={guideOpen}
        skipAuto={skipAutoGuide}
        onToggleSkipAuto={(next) => {
          setSkipAutoGuide(next);
          persistGuides(seenGuides, next);
        }}
        onClose={() => setGuideOpen(false)}
      />

      {/* Near-fullscreen native <dialog> expanded modal */}
      <dialog
        ref={dialogRef}
        {...({ closedby: 'any' } as Record<string, string>)}
        aria-labelledby={dialogTitleId}
        onClose={() => setExpanded(false)}
        className="m-auto p-0 max-w-none max-h-none w-[min(96dvw,1480px)] h-[min(92dvh,920px)] bg-surface-raised text-ink rounded-lg border border-line shadow-lg backdrop:bg-[oklch(15%_0.02_262/55%)] backdrop:backdrop-blur-md open:[animation:pop_0.18s_ease]"
      >
        {expanded && (
          <div className="flex flex-col w-full h-full p-4 sm:p-6 overflow-hidden">
            <div className="flex items-start justify-between gap-4 shrink-0">
              <div>
                <div className="font-heading font-bold text-11 uppercase text-accent-2-ink">Visão ampliada</div>
                <h2 id={dialogTitleId} className="font-heading font-bold text-19 text-ink">
                  {viewTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Fechar visualização ampliada"
                className="p-2 rounded-full hover:bg-surface-sunken text-ink-2 hover:text-ink cursor-pointer"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col gap-2 mt-3 shrink-0">
              {renderControls(true)}
              {renderInspector()}
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_330px] gap-5 mt-3 overflow-y-auto lg:overflow-hidden">
              <div className="min-h-[460px] lg:h-full flex flex-col justify-between overflow-y-auto pr-1">
                <div className="my-auto w-full">{renderChart(true)}</div>
                {renderLegend()}
              </div>

              <div className="flex flex-col min-h-0 max-h-[360px] lg:max-h-none lg:h-full border border-line rounded-md bg-surface p-3">
                <div className="flex items-center justify-between gap-2 mb-2 shrink-0 flex-wrap">
                  <div className="font-heading font-bold text-11-5 text-ink-2">
                    Disciplinas ({sidebarList.length})
                  </div>
                  <div className="inline-flex gap-1 rounded-full bg-surface-sunken p-0.5 border border-line">
                    {(
                      [
                        ['todas', 'Todas'],
                        ['subiram', 'Subiram'],
                        ['cairam', 'Caíram'],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setListFilter(key)}
                        className={`px-2 py-0.5 rounded-full text-10-5 font-heading font-semibold cursor-pointer transition-colors ${
                          listFilter === key ? 'bg-surface-raised text-ink shadow-xs' : 'text-ink-3 hover:text-ink-2'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1.5 pr-1">
                  {sidebarList.map((b) => {
                    const isFocus = activeId === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onMouseEnter={() => setHoverId(b.id)}
                        onMouseLeave={() => setHoverId(null)}
                        onClick={() => togglePin(b.id)}
                        className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-md border text-left text-xs cursor-pointer transition-colors ${
                          isFocus ? 'border-accent bg-accent-tint' : 'border-line bg-surface hover:bg-surface-sunken'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-ink truncate">{b.name}</div>
                          <div className="text-10-5 text-ink-3 tabular-nums">
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
      </dialog>
    </div>
  );
}
