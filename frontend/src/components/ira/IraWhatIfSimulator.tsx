'use client';

import {
  Check,
  FlaskConical,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Scale,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState, type CSSProperties } from 'react';
import { Segmented } from '@/components/Segmented';
import campusDisciplinesRaw from '@/data/campusDisciplines.json';
import type { IraEntry } from '@/data/types';
import { clampIra } from '@/lib/statistics';
import { iraGeral, percentileBelow, type StatusGroup } from '@/lib/iraCampus';
import { groupIras, groupSummary } from '@/lib/iraCampusData';
import {
  compareLockVsRetake,
  computeCourseMilestones,
  computeLockBreakEven,
  defaultWorkbenchSemester,
  runIraSimulation,
  solveTargetHorizons,
  type SimDisciplineItem,
  type SimDisciplineMode,
  type SimFutureSemester,
  type SimTrajectoryPoint,
} from '@/lib/iraSimulator';
import { fmt, ordinal, pct } from './chartFormat';
import { IraSimulatorTrajectory } from './IraSimulatorTrajectory';

type SimTab = 'plano' | 'trancar' | 'metas';

const CATALOG = campusDisciplinesRaw as [string, number][];
const CATALOG_WORKLOAD = new Map<string, number>(CATALOG.map(([name, ch]) => [name.toLowerCase(), ch]));
const FUTURE_WORKLOAD_CHOICES = [64, 128, 192, 256, 320, 384];
const ITEM_WORKLOAD_CHOICES = [32, 64, 96];

interface PinnedScenario {
  finalIra: number;
  rank: number;
  points: SimTrajectoryPoint[];
}

function sliderProgressStyle(value: number, min = 0, max = 10): CSSProperties {
  const pctVal = Math.max(0, Math.min(100, ((value - min) / Math.max(0.01, max - min)) * 100));
  return { '--range-progress': `${pctVal}%` } as CSSProperties;
}

/**
 * Interactive Scenario & Strategy Lab ("Laboratório de Cenários"):
 * 1. Montar cenário: grade/withdraw controls for every "em_andamento" subject
 *    from the transcript + catalog autocomplete + up to 6 future semesters.
 * 2. Trancar vs. Cursar: exact binary-searched break-even grade + 2-semester
 *    retake comparison.
 * 3. Caçador de metas: real course percentiles + 1–4 semester horizon solver.
 */
export function IraWhatIfSimulator({
  entries,
  currentIra,
  course,
  group,
  onSimulatedIraChange,
}: {
  entries: IraEntry[];
  currentIra: number;
  course: string | null;
  group: StatusGroup;
  onSimulatedIraChange: (simulatedIra: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<SimTab>('plano');

  // Workbench state
  const [transcriptOverrides, setTranscriptOverrides] = useState<
    Record<string, { grade: number; mode: SimDisciplineMode }>
  >({});
  const [customItems, setCustomItems] = useState<SimDisciplineItem[]>([]);
  const [customFutureSemesters, setCustomFutureSemesters] = useState<SimFutureSemester[] | null>(null);
  const [customCounter, setCustomCounter] = useState(1);

  // Add-discipline micro-form state
  const [newDiscName, setNewDiscName] = useState('');
  const [newDiscWorkload, setNewDiscWorkload] = useState(64);
  const [newDiscGrade, setNewDiscGrade] = useState(8.5);
  const catalogDatalistId = useId();

  // Break-even / Retake state
  const [lockWorkload, setLockWorkload] = useState(64);
  const [riskGrade, setRiskGrade] = useState(3.0);
  const [retakeGrade, setRetakeGrade] = useState(8.5);

  // Goal Hunter state
  const [goalInput, setGoalInput] = useState<number | null>(null);
  const [goalHours, setGoalHours] = useState(256);

  // Comparison Snapshot (Scenario A)
  const [pinnedScenario, setPinnedScenario] = useState<PinnedScenario | null>(null);

  const inProgressEntries = useMemo(
    () => entries.filter((e) => e.situacao === 'em_andamento'),
    [entries],
  );
  const workbenchSemester = useMemo(() => defaultWorkbenchSemester(entries), [entries]);

  const workbench = useMemo<SimDisciplineItem[]>(() => {
    const fromPdf: SimDisciplineItem[] = inProgressEntries.map((e) => {
      const ov = transcriptOverrides[e.id];
      return {
        id: e.id,
        name: e.disciplineName,
        workload: e.workload,
        semester: e.semester ?? workbenchSemester,
        grade: ov?.grade ?? 8.5,
        mode: ov?.mode ?? 'nota',
        fromTranscript: true,
      };
    });
    return [...fromPdf, ...customItems];
  }, [inProgressEntries, transcriptOverrides, workbenchSemester, customItems]);

  const futureSemesters = useMemo<SimFutureSemester[]>(() => {
    if (customFutureSemesters !== null) return customFutureSemesters;
    if (inProgressEntries.length === 0 && customItems.length === 0) {
      return [{ id: 'fs-default', workload: 256, grade: 8.5, lockHours: 0 }];
    }
    return [];
  }, [customFutureSemesters, inProgressEntries.length, customItems.length]);

  const simOutput = useMemo(
    () => runIraSimulation(entries, workbench, futureSemesters),
    [entries, workbench, futureSemesters],
  );

  useEffect(() => {
    onSimulatedIraChange(open ? simOutput.finalIra : null);
  }, [open, simOutput.finalIra, onSimulatedIraChange]);

  const values = useMemo(() => groupIras(course, group), [course, group]);
  const ativosSummary = useMemo(() => (course ? groupSummary(course, 'ativos') : null), [course]);

  const currentDisplay = clampIra(currentIra);
  const currentRank = useMemo(
    () => values.filter((v) => v > currentDisplay).length + 1,
    [values, currentDisplay],
  );

  const simDisplay = simOutput.finalIra !== null ? clampIra(simOutput.finalIra) : null;
  const simDelta = simDisplay !== null ? simDisplay - currentDisplay : 0;
  const simRank = useMemo(
    () => (simDisplay !== null ? values.filter((v) => v > simDisplay).length + 1 : null),
    [values, simDisplay],
  );
  const simPct = useMemo(
    () => (simDisplay !== null ? percentileBelow(values, simDisplay) : null),
    [values, simDisplay],
  );
  const simGeral =
    simDisplay !== null && ativosSummary
      ? iraGeral(simDisplay, ativosSummary.mean, ativosSummary.std)
      : null;

  // Tab 2 computations: Lock break-even & 2-semester retake
  const breakEven = useMemo(() => computeLockBreakEven(entries, lockWorkload), [entries, lockWorkload]);
  const retakeCmp = useMemo(
    () => compareLockVsRetake(entries, lockWorkload, riskGrade, retakeGrade),
    [entries, lockWorkload, riskGrade, retakeGrade],
  );

  // Tab 3 computations: Milestones & Horizon Solver
  const milestones = useMemo(() => computeCourseMilestones(values, currentDisplay), [values, currentDisplay]);
  const defaultMilestoneTarget =
    milestones.find((m) => !m.reached)?.targetIra ??
    milestones[0]?.targetIra ??
    Math.min(10, Number((currentDisplay + 0.1).toFixed(4)));
  const effectiveGoal = goalInput ?? defaultMilestoneTarget;

  const horizonSolutions = useMemo(
    () => solveTargetHorizons(entries, effectiveGoal, goalHours, [1, 2, 3, 4]),
    [entries, effectiveGoal, goalHours],
  );

  // Workbench handlers
  function updateWorkbenchItem(item: SimDisciplineItem, patch: Partial<{ grade: number; mode: SimDisciplineMode }>) {
    if (item.fromTranscript) {
      setTranscriptOverrides((cur) => ({
        ...cur,
        [item.id]: {
          grade: patch.grade ?? cur[item.id]?.grade ?? item.grade,
          mode: patch.mode ?? cur[item.id]?.mode ?? item.mode,
        },
      }));
    } else {
      setCustomItems((cur) => cur.map((x) => (x.id === item.id ? { ...x, ...patch } : x)));
    }
  }

  function applyPresetToWorkbench(grade: number) {
    const nextOverrides: Record<string, { grade: number; mode: SimDisciplineMode }> = { ...transcriptOverrides };
    for (const e of inProgressEntries) {
      nextOverrides[e.id] = { grade, mode: 'nota' };
    }
    setTranscriptOverrides(nextOverrides);
    setCustomItems((cur) => cur.map((x) => ({ ...x, grade, mode: 'nota' })));
  }

  function handleAddCustomDiscipline(ev: React.FormEvent) {
    ev.preventDefault();
    const trimmed = newDiscName.trim();
    if (!trimmed) return;
    const id = `custom-${customCounter}`;
    setCustomCounter((c) => c + 1);
    setCustomItems((cur) => [
      ...cur,
      {
        id,
        name: trimmed,
        workload: newDiscWorkload,
        semester: workbenchSemester,
        grade: newDiscGrade,
        mode: 'nota',
        fromTranscript: false,
      },
    ]);
    setNewDiscName('');
  }

  function updateFutureSemester(id: string, patch: Partial<SimFutureSemester>) {
    setCustomFutureSemesters((cur) => {
      const base = cur ?? futureSemesters;
      return base.map((fs) => (fs.id === id ? { ...fs, ...patch } : fs));
    });
  }

  function addFutureSemesters(count: number) {
    setCustomFutureSemesters((cur) => {
      const base = cur ?? futureSemesters;
      const room = Math.max(0, 6 - base.length);
      const toAdd = Math.min(room, count);
      if (toAdd === 0) return base;
      const next = [...base];
      for (let i = 0; i < toAdd; i++) {
        next.push({
          id: `fs-${customCounter + i}`,
          workload: 256,
          grade: 8.5,
          lockHours: 0,
        });
      }
      return next;
    });
    setCustomCounter((c) => c + count);
  }

  function removeFutureSemester(id: string) {
    setCustomFutureSemesters((cur) => {
      const base = cur ?? futureSemesters;
      return base.filter((fs) => fs.id !== id);
    });
  }

  function resetAll() {
    setTranscriptOverrides({});
    setCustomItems([]);
    setCustomFutureSemesters(null);
    setPinnedScenario(null);
    setGoalInput(null);
  }

  function pinCurrentScenario() {
    if (simDisplay === null || simRank === null) return;
    setPinnedScenario({
      finalIra: simDisplay,
      rank: simRank,
      points: simOutput.points,
    });
  }

  function applyStrategyToChart(strategy: 'lockRetake' | 'keepRetake') {
    const ignoredOverrides: Record<string, { grade: number; mode: SimDisciplineMode }> = {};
    for (const e of inProgressEntries) {
      ignoredOverrides[e.id] = { grade: 8.5, mode: 'ignorar' };
    }
    setTranscriptOverrides(ignoredOverrides);
    const idDisc = `strat-disc-${customCounter}`;
    const idRetake = `strat-ret-${customCounter}`;
    setCustomCounter((c) => c + 1);
    setCustomItems([
      {
        id: idDisc,
        name: strategy === 'lockRetake' ? 'Disciplina trancada' : 'Disciplina cursada até o fim',
        workload: lockWorkload,
        semester: workbenchSemester,
        grade: riskGrade,
        mode: strategy === 'lockRetake' ? 'trancar' : 'nota',
        fromTranscript: false,
      },
    ]);
    setCustomFutureSemesters([
      {
        id: idRetake,
        workload: lockWorkload,
        grade: retakeGrade,
        lockHours: 0,
      },
    ]);
    setTab('plano');
  }

  function applyGoalHorizonToChart(semestersCount: number, neededAvg: number) {
    const ignoredOverrides: Record<string, { grade: number; mode: SimDisciplineMode }> = {};
    for (const e of inProgressEntries) {
      ignoredOverrides[e.id] = { grade: neededAvg, mode: 'ignorar' };
    }
    setTranscriptOverrides(ignoredOverrides);
    setCustomItems([]);
    const planned: SimFutureSemester[] = Array.from({ length: semestersCount }, (_, i) => ({
      id: `goal-${customCounter}-${i}`,
      workload: goalHours,
      grade: neededAvg,
      lockHours: 0,
    }));
    setCustomCounter((c) => c + semestersCount);
    setCustomFutureSemesters(planned);
    setTab('plano');
  }

  const breakEvenPct = breakEven ? Math.max(0, Math.min(100, breakEven.breakEvenGrade * 10)) : 50;
  const resolvedMap = new Map(simOutput.resolvedSemesters.map((r) => [r.id, r]));

  return (
    <div className="mt-4 pt-4 border-t border-line">
      {/* Lab Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-2 font-heading font-semibold text-12-5 text-ink hover:text-accent cursor-pointer transition-colors"
        >
          <FlaskConical
            size={15}
            className={open || inProgressEntries.length > 0 ? 'text-accent-2-dark' : 'text-ink-3'}
            aria-hidden="true"
          />
          <span>Laboratório de Cenários (&ldquo;E se eu fizer…&rdquo;)</span>
          <span
            className={`text-10-5 px-2 py-0.5 rounded-full font-semibold ${
              open
                ? 'bg-accent-2-tint text-accent-2-dark'
                : inProgressEntries.length > 0
                  ? 'bg-accent-2-tint text-accent-2-dark'
                  : 'bg-surface-sunken text-ink-3'
            }`}
          >
            {open
              ? 'ativo no gráfico'
              : inProgressEntries.length > 0
                ? `${inProgressEntries.length} ${inProgressEntries.length === 1 ? 'matéria em andamento pronta' : 'matérias em andamento prontas'} p/ simular`
                : 'abrir laboratório'}
          </span>
        </button>

        {open && (
          <div className="flex items-center gap-3 flex-wrap">
            {simDisplay !== null && simRank !== null && (
              <button
                type="button"
                onClick={pinCurrentScenario}
                className="inline-flex items-center gap-1 text-11-5 font-heading font-semibold text-accent-dark hover:underline cursor-pointer"
              >
                <Pin size={12} aria-hidden="true" />
                {pinnedScenario ? 'Atualizar Cenário A' : 'Fixar Cenário A'}
              </button>
            )}
            {pinnedScenario && (
              <button
                type="button"
                onClick={() => setPinnedScenario(null)}
                className="inline-flex items-center gap-1 text-11-5 text-ink-3 hover:text-ink cursor-pointer"
              >
                <PinOff size={12} aria-hidden="true" />
                Soltar A
              </button>
            )}
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1 text-11-5 text-ink-3 hover:text-ink cursor-pointer"
            >
              <RotateCcw size={12} aria-hidden="true" />
              Resetar
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 text-11-5 text-ink-3 hover:text-ink cursor-pointer"
            >
              <X size={13} aria-hidden="true" />
              Fechar
            </button>
          </div>
        )}
      </div>

      {open && (
        <div className="mt-3 grid grid-cols-1 lg:grid-cols-[1.32fr_1fr] gap-4 items-start">
          {/* LEFT COLUMN: 3 Interactive Strategy Labs */}
          <div className="rounded-md bg-surface-sunken border border-line p-3.5 flex flex-col gap-3 min-w-0">
            <Segmented<SimTab>
              size="sm"
              ariaLabel="Ferramentas do laboratório de cenários"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'plano', label: 'Montar cenário' },
                { value: 'trancar', label: 'Trancar vs. Cursar' },
                { value: 'metas', label: 'Caçador de metas' },
              ]}
            />

            {/* TAB 1: Workbench + Multi-semester plan */}
            {tab === 'plano' && (
              <div className="flex flex-col gap-3.5">
                {/* Workbench section */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-heading font-bold text-11 uppercase tracking-wide text-ink-2">
                      Bancada de matérias · {workbenchSemester}
                    </span>
                    {workbench.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {[
                          { label: 'Tudo 9,5', g: 9.5 },
                          { label: 'Tudo 8,5', g: 8.5 },
                          { label: 'Tudo 7,0', g: 7.0 },
                          { label: 'Passar 5,0', g: 5.0 },
                        ].map((preset) => (
                          <button
                            key={preset.g}
                            type="button"
                            onClick={() => applyPresetToWorkbench(preset.g)}
                            className="text-10-5 font-heading font-semibold px-2 py-0.5 rounded bg-surface border border-line text-ink-2 hover:border-accent hover:text-ink cursor-pointer transition-colors"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {workbench.length > 0 ? (
                    <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-0.5">
                      {workbench.map((item) => {
                        const dVal = simOutput.itemDeltas.get(item.id) ?? null;
                        return (
                          <div
                            key={item.id}
                            className={`rounded-md bg-surface border p-2.5 flex flex-col gap-2 transition-opacity ${
                              item.mode === 'ignorar' ? 'border-line opacity-65' : 'border-line'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-medium text-xs text-ink truncate" title={item.name}>
                                  {item.name}
                                </span>
                                <span className="text-10 text-ink-3 shrink-0 tabular-nums">{item.workload}h</span>
                                {item.fromTranscript && (
                                  <span className="text-10 font-heading font-semibold px-1.5 py-px rounded bg-accent-tint text-accent-dark shrink-0">
                                    Em andamento
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {(
                                  [
                                    ['nota', 'Nota'],
                                    ['trancar', 'Trancar'],
                                    ['ignorar', 'Ignorar'],
                                  ] as const
                                ).map(([m, label]) => (
                                  <button
                                    key={m}
                                    type="button"
                                    onClick={() => updateWorkbenchItem(item, { mode: m })}
                                    className={`text-10-5 font-heading font-semibold px-2 py-0.5 rounded border cursor-pointer transition-colors ${
                                      item.mode === m
                                        ? m === 'trancar'
                                          ? 'bg-danger-tint text-danger border-danger/35'
                                          : m === 'nota'
                                            ? 'bg-accent-2-tint text-accent-2-dark border-accent-2-dark/40'
                                            : 'bg-surface-sunken text-ink border-line-strong'
                                        : 'bg-surface-raised text-ink-3 border-line hover:text-ink'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                ))}
                                {!item.fromTranscript && (
                                  <button
                                    type="button"
                                    onClick={() => setCustomItems((cur) => cur.filter((x) => x.id !== item.id))}
                                    aria-label={`Remover ${item.name}`}
                                    className="p-1 text-ink-3 hover:text-danger cursor-pointer"
                                  >
                                    <Trash2 size={13} aria-hidden="true" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {item.mode === 'nota' ? (
                              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2.5">
                                <input
                                  type="range"
                                  min={0}
                                  max={10}
                                  step={0.1}
                                  value={item.grade}
                                  style={sliderProgressStyle(item.grade)}
                                  onChange={(e) => updateWorkbenchItem(item, { grade: Number(e.target.value) })}
                                  aria-label={`Nota simulada para ${item.name}`}
                                  className="sim-range w-full cursor-pointer"
                                />
                                <span className="font-heading font-bold text-xs text-accent-2-dark tabular-nums min-w-[30px] text-right">
                                  {fmt(item.grade, 1)}
                                </span>
                                {dVal !== null && (
                                  <span
                                    className={`text-11 font-heading font-bold tabular-nums min-w-[58px] text-right ${
                                      dVal > 0.0005 ? 'text-good' : dVal < -0.0005 ? 'text-danger' : 'text-ink-3'
                                    }`}
                                  >
                                    {dVal >= 0 ? '+' : ''}
                                    {fmt(dVal, 4)}
                                  </span>
                                )}
                              </div>
                            ) : item.mode === 'trancar' ? (
                              <div className="flex items-center justify-between text-11 tabular-nums">
                                <span className="text-danger font-medium">Simulando trancamento ({item.workload}h)</span>
                                {dVal !== null && (
                                  <span className="font-heading font-bold text-danger">
                                    {dVal >= 0 ? '+' : ''}
                                    {fmt(dVal, 4)}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-between text-11 text-ink-3 tabular-nums">
                                <span>Excluída desta simulação</span>
                                {dVal !== null && (
                                  <span>
                                    Com {fmt(item.grade, 1)}: {dVal >= 0 ? '+' : ''}
                                    {fmt(dVal, 4)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-line bg-surface/60 px-3 py-2.5 text-11-5 text-ink-3">
                      Nenhuma disciplina marcada como &ldquo;Em andamento&rdquo; no seu histórico — adicione matérias abaixo ou planeje seus próximos semestres.
                    </div>
                  )}

                  {/* Add extra discipline with campus catalog autocomplete */}
                  <form
                    onSubmit={handleAddCustomDiscipline}
                    className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_76px_auto] gap-1.5 items-center pt-1"
                  >
                    <input
                      list={catalogDatalistId}
                      value={newDiscName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewDiscName(val);
                        const ch = CATALOG_WORKLOAD.get(val.trim().toLowerCase());
                        if (ch && ITEM_WORKLOAD_CHOICES.includes(ch)) setNewDiscWorkload(ch);
                      }}
                      placeholder="+ Simular outra matéria (ex.: Aprendizado de Máquina)"
                      aria-label="Nome da matéria para simular"
                      className="h-8 rounded-md border border-line bg-surface px-2.5 text-xs text-ink placeholder:text-ink-3 outline-none focus:border-accent"
                    />
                    <datalist id={catalogDatalistId}>
                      {CATALOG.map(([name]) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                    <select
                      value={newDiscWorkload}
                      onChange={(e) => setNewDiscWorkload(Number(e.target.value))}
                      aria-label="Carga horária da matéria"
                      className="h-8 rounded-md border border-line bg-surface px-2 text-xs font-heading font-semibold text-ink cursor-pointer"
                    >
                      {ITEM_WORKLOAD_CHOICES.map((h) => (
                        <option key={h} value={h}>
                          {h}h
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={newDiscGrade}
                      onChange={(e) => setNewDiscGrade(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
                      aria-label="Nota esperada da matéria"
                      className="h-8 rounded-md border border-line bg-surface px-2 text-xs font-heading font-semibold text-ink tabular-nums"
                    />
                    <button
                      type="submit"
                      disabled={!newDiscName.trim()}
                      className="h-8 inline-flex items-center justify-center gap-1 rounded-md bg-accent text-accent-ink font-heading font-semibold text-11-5 px-2.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      <Plus size={13} aria-hidden="true" />
                      Adicionar
                    </button>
                  </form>
                </div>

                {/* Multi-semester future roadmap */}
                <div className="pt-2.5 border-t border-line flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-heading font-bold text-11 uppercase tracking-wide text-ink-2">
                      Roteiro dos próximos semestres ({futureSemesters.length}/6)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={futureSemesters.length >= 6}
                        onClick={() => addFutureSemesters(1)}
                        className="inline-flex items-center gap-1 text-10-5 font-heading font-semibold px-2 py-1 rounded bg-surface border border-line text-ink-2 hover:border-accent hover:text-ink cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus size={12} aria-hidden="true" />
                        Semestre
                      </button>
                      <button
                        type="button"
                        disabled={futureSemesters.length >= 6}
                        onClick={() => addFutureSemesters(4)}
                        className="text-10-5 font-heading font-semibold px-2 py-1 rounded bg-accent-tint text-accent-dark hover:opacity-90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        + Planejar 4 sem.
                      </button>
                    </div>
                  </div>

                  {futureSemesters.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {futureSemesters.map((fs) => {
                        const info = resolvedMap.get(fs.id);
                        return (
                          <div
                            key={fs.id}
                            className="rounded-md bg-surface border border-line px-2.5 py-2 grid grid-cols-1 sm:grid-cols-[auto_1fr_auto_auto_auto_auto] items-center gap-2"
                          >
                            <span className="font-heading font-bold text-11 text-ink tabular-nums">
                              {info?.semester ?? 'Próx.'}{' '}
                              <span className="text-10 font-semibold px-1 py-px rounded bg-surface-sunken text-ink-3">
                                {info?.weight ?? 6}×
                              </span>
                            </span>

                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="range"
                                min={0}
                                max={10}
                                step={0.1}
                                value={fs.grade}
                                style={sliderProgressStyle(fs.grade)}
                                onChange={(e) => updateFutureSemester(fs.id, { grade: Number(e.target.value) })}
                                aria-label={`Média esperada em ${info?.semester ?? 'semestre futuro'}`}
                                className="sim-range w-full cursor-pointer"
                              />
                              <span className="font-heading font-bold text-xs text-accent-2-dark tabular-nums min-w-[28px] text-right">
                                {fmt(fs.grade, 1)}
                              </span>
                            </div>

                            <select
                              value={fs.workload}
                              onChange={(e) => updateFutureSemester(fs.id, { workload: Number(e.target.value) })}
                              aria-label="Carga horária do semestre"
                              className="h-7 rounded border border-line bg-surface-sunken px-1.5 text-11 font-heading font-semibold text-ink cursor-pointer"
                            >
                              {FUTURE_WORKLOAD_CHOICES.map((ch) => (
                                <option key={ch} value={ch}>
                                  {ch}h
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => updateFutureSemester(fs.id, { lockHours: fs.lockHours > 0 ? 0 : 64 })}
                              className={`h-7 px-2 rounded border text-10-5 font-heading font-semibold cursor-pointer transition-colors ${
                                fs.lockHours > 0
                                  ? 'bg-danger-tint text-danger border-danger/35'
                                  : 'bg-surface-sunken text-ink-3 border-line hover:text-ink'
                              }`}
                              title="Incluir 1 trancamento de 64h neste semestre"
                            >
                              {fs.lockHours > 0 ? '+64h tranc.' : 'Sem tranc.'}
                            </button>

                            <button
                              type="button"
                              onClick={() => removeFutureSemester(fs.id)}
                              aria-label={`Remover ${info?.semester ?? 'semestre'}`}
                              className="p-1 text-ink-3 hover:text-danger cursor-pointer justify-self-end"
                            >
                              <X size={13} aria-hidden="true" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-11-5 text-ink-3">
                      Sem semestres extras na fila — clique em &ldquo;+ Semestre&rdquo; ou &ldquo;+ Planejar 4 sem.&rdquo; para projetar até a formatura.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Lock Break-Even & 2-Semester Retake Analyzer */}
            {tab === 'trancar' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs font-heading font-bold text-ink">
                    <Scale size={14} className="text-accent" aria-hidden="true" />
                    Dilema: Trancar ou ir até o fim?
                  </div>
                  <div className="inline-flex gap-1 bg-surface border border-line rounded-full p-0.5">
                    {ITEM_WORKLOAD_CHOICES.map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setLockWorkload(ch)}
                        className={`px-2.5 py-0.5 rounded-full text-11 font-heading font-bold cursor-pointer transition-colors ${
                          lockWorkload === ch ? 'bg-accent text-accent-ink' : 'text-ink-2 hover:text-ink'
                        }`}
                      >
                        {ch}h
                      </button>
                    ))}
                  </div>
                </div>

                {breakEven && retakeCmp ? (
                  <>
                    {/* Break-even ruler */}
                    <div className="rounded-md bg-surface border border-line p-3 flex flex-col gap-2">
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <span className="text-xs text-ink-2">
                          Para uma matéria de <b>{lockWorkload}h</b> em <b>{breakEven.semester}</b> (peso{' '}
                          <b>{breakEven.weight}×</b>):
                        </span>
                        <span className="font-heading font-extrabold text-sm text-accent-dark tabular-nums">
                          Nota de corte: {fmt(breakEven.breakEvenGrade, 2)}
                        </span>
                      </div>

                      <div className="relative h-3 rounded-full overflow-hidden flex border border-line">
                        <div
                          style={{ width: `${breakEvenPct}%` }}
                          className="bg-danger/70 h-full"
                          title="Abaixo da nota de corte: trancar protege mais"
                        />
                        <div
                          style={{ width: `${100 - breakEvenPct}%` }}
                          className="bg-good/70 h-full"
                          title="Acima da nota de corte: permanecer vale mais"
                        />
                      </div>

                      <div className="flex items-center justify-between text-10-5 tabular-nums">
                        <span className="text-danger font-semibold">
                          &lt; {fmt(breakEven.breakEvenGrade, 2)}: trancar protege mais o IRA
                        </span>
                        <span className="text-good font-semibold">
                          ≥ {fmt(breakEven.breakEvenGrade, 2)}: ir até o fim perde menos
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="rounded-sm bg-accent-2-tint/65 p-2 text-center">
                          <div className="text-10 text-ink-3 uppercase font-semibold">Trancar {lockWorkload}h</div>
                          <div className="font-heading font-extrabold text-13 text-accent-2-dark tabular-nums">
                            {fmt(breakEven.iraIfLocked, 4)}
                          </div>
                          <div className="text-10-5 font-semibold text-danger tabular-nums">
                            {fmt(breakEven.deltaIfLocked, 4)}
                          </div>
                        </div>
                        <div className="rounded-sm bg-surface-sunken p-2 text-center">
                          <div className="text-10 text-ink-3 uppercase font-semibold">Passar c/ 5,0</div>
                          <div className="font-heading font-extrabold text-13 text-ink tabular-nums">
                            {fmt(breakEven.iraAt5, 4)}
                          </div>
                          <div
                            className={`text-10-5 font-semibold tabular-nums ${
                              breakEven.deltaAt5 >= 0 ? 'text-good' : 'text-danger'
                            }`}
                          >
                            {breakEven.deltaAt5 >= 0 ? '+' : ''}
                            {fmt(breakEven.deltaAt5, 4)}
                          </div>
                        </div>
                        <div className="rounded-sm bg-danger-tint/70 p-2 text-center">
                          <div className="text-10 text-ink-3 uppercase font-semibold">Reprovar c/ 3,0</div>
                          <div className="font-heading font-extrabold text-13 text-danger tabular-nums">
                            {fmt(breakEven.iraAt3, 4)}
                          </div>
                          <div className="text-10-5 font-semibold text-danger tabular-nums">
                            {fmt(breakEven.deltaAt3, 4)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2-semester retake simulator */}
                    <div className="rounded-md bg-surface border border-line p-3 flex flex-col gap-2.5">
                      <div className="font-heading font-bold text-11 uppercase tracking-wide text-ink-2">
                        Simulação em 2 tempos: agora ({retakeCmp.nextSemester}) + refazer em {retakeCmp.retakeSemester}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="flex flex-col gap-1">
                          <div className="flex justify-between text-11">
                            <span className="text-ink-2">Nota agora se NÃO trancar</span>
                            <b className="font-heading text-danger tabular-nums">{fmt(riskGrade, 1)}</b>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={10}
                            step={0.1}
                            value={riskGrade}
                            style={sliderProgressStyle(riskGrade)}
                            onChange={(e) => setRiskGrade(Number(e.target.value))}
                            className="sim-range w-full cursor-pointer"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <div className="flex justify-between text-11">
                            <span className="text-ink-2">Nota esperada ao refazer depois</span>
                            <b className="font-heading text-good tabular-nums">{fmt(retakeGrade, 1)}</b>
                          </div>
                          <input
                            type="range"
                            min={5}
                            max={10}
                            step={0.1}
                            value={retakeGrade}
                            style={sliderProgressStyle(retakeGrade, 5, 10)}
                            onChange={(e) => setRetakeGrade(Number(e.target.value))}
                            className="sim-range w-full cursor-pointer"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => applyStrategyToChart('lockRetake')}
                          className={`rounded-md p-2.5 border text-left cursor-pointer transition-colors ${
                            retakeCmp.diffLockVsKeepRetake >= 0
                              ? 'border-good bg-good-tint/55 hover:bg-good-tint'
                              : 'border-line bg-surface-sunken hover:border-accent'
                          }`}
                        >
                          <div className="text-10-5 font-heading font-bold text-ink">
                            (A) Trancar agora + tirar {fmt(retakeGrade, 1)} depois
                          </div>
                          <div className="flex items-baseline justify-between mt-1 tabular-nums">
                            <span className="font-heading font-extrabold text-15 text-ink">
                              {fmt(retakeCmp.lockThenRetakeIra, 4)}
                            </span>
                            {retakeCmp.diffLockVsKeepRetake >= 0 && (
                              <span className="text-10-5 font-bold text-good">
                                Vence por +{fmt(retakeCmp.diffLockVsKeepRetake, 4)}
                              </span>
                            )}
                          </div>
                          <div className="text-10 text-accent-dark font-semibold mt-1">
                            Aplicar estratégia (A) no gráfico →
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => applyStrategyToChart('keepRetake')}
                          className={`rounded-md p-2.5 border text-left cursor-pointer transition-colors ${
                            retakeCmp.diffLockVsKeepRetake < 0
                              ? 'border-good bg-good-tint/55 hover:bg-good-tint'
                              : 'border-line bg-surface-sunken hover:border-accent'
                          }`}
                        >
                          <div className="text-10-5 font-heading font-bold text-ink">
                            (B) Ficar com {fmt(riskGrade, 1)} + tirar {fmt(retakeGrade, 1)} depois
                          </div>
                          <div className="flex items-baseline justify-between mt-1 tabular-nums">
                            <span className="font-heading font-extrabold text-15 text-ink">
                              {fmt(retakeCmp.keepThenRetakeIra, 4)}
                            </span>
                            {retakeCmp.diffLockVsKeepRetake < 0 && (
                              <span className="text-10-5 font-bold text-good">
                                Vence por +{fmt(Math.abs(retakeCmp.diffLockVsKeepRetake), 4)}
                              </span>
                            )}
                          </div>
                          <div className="text-10 text-accent-dark font-semibold mt-1">
                            Aplicar estratégia (B) no gráfico →
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-md border border-dashed border-line bg-surface p-4 text-xs text-ink-3">
                    Adicione ao menos 1 disciplina com nota fechada no seu histórico para calcular a nota de corte de trancamento.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Real Course Milestones & Multi-Horizon Solver */}
            {tab === 'metas' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs font-heading font-bold text-ink">
                    <Target size={14} className="text-accent" aria-hidden="true" />
                    Degraus reais em {course ?? 'todo o campus'}
                  </div>
                  <div className="inline-flex gap-1 bg-surface border border-line rounded-full p-0.5">
                    {[192, 256, 320].map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setGoalHours(ch)}
                        className={`px-2.5 py-0.5 rounded-full text-11 font-heading font-bold cursor-pointer transition-colors ${
                          goalHours === ch ? 'bg-accent text-accent-ink' : 'text-ink-2 hover:text-ink'
                        }`}
                      >
                        {ch}h/sem
                      </button>
                    ))}
                  </div>
                </div>

                {/* Milestone selector pills + free target input */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  {milestones.map((m) => {
                    const selected = Math.abs(effectiveGoal - m.targetIra) < 0.0002;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setGoalInput(m.targetIra)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-11 font-heading font-semibold cursor-pointer transition-colors tabular-nums ${
                          selected
                            ? 'bg-accent text-accent-ink border-accent'
                            : m.reached
                              ? 'bg-good-tint/70 text-good border-good/30 hover:opacity-90'
                              : 'bg-surface text-ink-2 border-line hover:border-accent'
                        }`}
                      >
                        {m.reached && <Check size={11} aria-hidden="true" />}
                        <span>{m.label}</span>
                        <span className="opacity-80">({fmt(m.targetIra, 2)})</span>
                      </button>
                    );
                  })}

                  <label className="inline-flex items-center gap-1.5 ml-auto text-11 text-ink-2">
                    <span>Meta livre:</span>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.05}
                      value={Number(effectiveGoal.toFixed(2))}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (Number.isFinite(v)) setGoalInput(Math.max(0, Math.min(10, v)));
                      }}
                      className="w-20 h-7 rounded-md border border-line bg-surface px-2 text-xs font-heading font-bold text-ink tabular-nums"
                    />
                  </label>
                </div>

                {/* 4-Horizon solution grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {horizonSolutions.map((sol) => (
                    <div
                      key={sol.semesters}
                      className="rounded-md bg-surface border border-line p-3 flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-heading font-bold text-xs text-ink">
                          Em {sol.semesters} {sol.semesters === 1 ? 'semestre' : 'semestres'}
                        </span>
                        <span className="text-10-5 text-ink-3 tabular-nums">{sol.totalHours}h cursadas</span>
                      </div>

                      {sol.neededAvg !== null ? (
                        <>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-11 text-ink-2">Média necessária:</span>
                            <span className="font-heading font-extrabold text-17 text-accent-dark tabular-nums">
                              {fmt(sol.neededAvg, 2)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => applyGoalHorizonToChart(sol.semesters, sol.neededAvg!)}
                            className="w-full py-1.5 px-2.5 rounded-md bg-accent-tint hover:bg-accent-tint-2 text-accent-dark font-heading font-semibold text-11 cursor-pointer transition-colors"
                          >
                            Simular roteiro de {sol.semesters} {sol.semesters === 1 ? 'sem.' : 'sems.'} →
                          </button>
                        </>
                      ) : (
                        <div className="text-11 text-ink-3 leading-snug tabular-nums">
                          Alcançar <b>{fmt(effectiveGoal, 2)}</b> nesse prazo não cabe na inércia atual: o teto com média 10 é{' '}
                          <b className="text-ink">{fmt(sol.maxIraAt10, 4)}</b>.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Live Output KPI + Scenario A Comparator + Trajectory */}
          <div className="rounded-md bg-surface border border-line p-3.5 flex flex-col gap-3">
            {simDisplay !== null ? (
              <>
                <div className="rounded-md p-3 border border-dashed bg-accent-2-tint/55 border-accent-2-dark/50 flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-10 font-heading font-bold uppercase tracking-wide text-accent-2-dark">
                      IRA projetado no cenário
                    </div>
                    <div className="flex items-baseline gap-2 mt-0.5 tabular-nums">
                      <span className="font-heading font-extrabold text-25 leading-none text-accent-2-dark">
                        {simDisplay.toFixed(4)}
                      </span>
                      <span
                        className={`text-xs font-heading font-bold ${
                          simDelta > 0.0005 ? 'text-good' : simDelta < -0.0005 ? 'text-danger' : 'text-ink-3'
                        }`}
                      >
                        {simDelta >= 0 ? '+' : ''}
                        {simDelta.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  {simRank !== null && simPct !== null && (
                    <div className="text-11-5 text-ink-2 text-right tabular-nums">
                      <div>
                        Posição: <b className="text-ink">{ordinal(simRank)}</b>
                        {simRank !== currentRank && (
                          <span className={simRank < currentRank ? 'text-good font-semibold' : 'text-danger font-semibold'}>
                            {' '}
                            ({simRank < currentRank ? `+${currentRank - simRank}` : `${currentRank - simRank}`})
                          </span>
                        )}
                      </div>
                      <div>
                        Supera <b className="text-ink">{pct(simPct)}</b>
                      </div>
                      {simGeral !== null && (
                        <div>
                          IRA-G <b className="text-ink">{fmt(simGeral, 4)}</b>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {pinnedScenario && (
                  <div className="rounded-md px-3 py-2 bg-surface-sunken border border-line flex items-center justify-between gap-2 flex-wrap text-11-5 tabular-nums">
                    <span className="text-ink-2">
                      <b>Atual</b> ({fmt(simDisplay, 4)}) vs <b>Cenário A</b> ({fmt(pinnedScenario.finalIra, 4)})
                    </span>
                    <span
                      className={`font-heading font-bold ${
                        simDisplay - pinnedScenario.finalIra >= 0 ? 'text-good' : 'text-danger'
                      }`}
                    >
                      {simDisplay - pinnedScenario.finalIra >= 0 ? '+' : ''}
                      {fmt(simDisplay - pinnedScenario.finalIra, 4)}
                      {simRank !== null && simRank !== pinnedScenario.rank && (
                        <> ({simRank < pinnedScenario.rank ? `+${pinnedScenario.rank - simRank}` : `${pinnedScenario.rank - simRank}`} pos.)</>
                      )}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-md p-3 bg-surface-sunken text-xs text-ink-3">
                Ative ou adicione ao menos uma disciplina/semestre para calcular o IRA simulado.
              </div>
            )}

            <IraSimulatorTrajectory
              points={simOutput.points}
              pinnedPoints={pinnedScenario?.points ?? null}
              goalIra={tab === 'metas' ? effectiveGoal : null}
            />
          </div>
        </div>
      )}
    </div>
  );
}
