'use client';

import { BarChart3, Check, ChevronDown, ChevronUp, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card, CardKicker, CardTitle } from '@/components/Card';
import { Segmented } from '@/components/Segmented';
import { UploadDropzone } from '@/components/UploadDropzone';
import { useToast } from '@/components/Toast';
import { IraEvolutionChart } from '@/components/ira/IraEvolutionChart';
import { IraIdentityMatch } from '@/components/ira/IraIdentityMatch';
import { IraInsightsGrid } from '@/components/ira/IraInsightsGrid';
import { IraPrivacyModal } from '@/components/ira/IraPrivacyModal';
import { IraRanking } from '@/components/ira/IraRanking';
import { IraRealDistributionChart } from '@/components/ira/IraRealDistributionChart';
import { IraWhatIfSimulator } from '@/components/ira/IraWhatIfSimulator';
import { QuickAddDisciplineForm } from '@/components/ira/QuickAddDisciplineForm';
import { currentUser } from '@/data/mock';
import type { IraEntry } from '@/data/types';
import {
  computeIra,
  computeSemesterStats,
  gradeSituacaoError,
  isSemesterConsolidated,
  requiresGrade,
  situacaoFromGrade,
  type Situacao,
} from '@/lib/ira';
import { semesterIndex, semesterLabel, type CampusStudent, type RankingFilter, type StatusGroup } from '@/lib/iraCampus';
import { CAMPUS_STUDENTS, normalizeCourse } from '@/lib/iraCampusData';
import { useIra } from '@/lib/iraStore';

type DraftEntry = Omit<IraEntry, 'id' | 'grade'> & { grade: number | '' };
type GradeAndSituacao = Pick<DraftEntry, 'grade' | 'situacao'>;

const SITUACAO_LABEL: Record<Situacao, string> = {
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  em_andamento: 'Em andamento',
  trancado: 'Trancado',
  outro: 'Outro',
};

const SITUACAO_BADGE: Record<Situacao, string> = {
  aprovado: 'bg-good-tint text-good',
  reprovado: 'bg-danger-tint text-danger',
  em_andamento: 'bg-accent-tint text-accent-dark',
  trancado: 'bg-accent-2-tint text-accent-2-ink',
  outro: 'bg-surface-sunken text-ink-2',
};

// "Outro" only comes from PDF rows SIGAA marks some other way (aproveitado,
// dispensado...) — it's shown for those rows but never offered as a choice.
const SITUACAO_CHOICES: Situacao[] = ['aprovado', 'reprovado', 'em_andamento', 'trancado'];

function SituacaoOptions({ current }: { current: Situacao | undefined }) {
  const options = current === undefined || current === 'outro' ? [...SITUACAO_CHOICES, 'outro' as const] : SITUACAO_CHOICES;
  return (
    <>
      {options.map((s) => (
        <option key={s} value={s}>
          {SITUACAO_LABEL[s]}
        </option>
      ))}
    </>
  );
}

// The same two transitions drive all three flows (manual add, inline edit,
// PDF review), so grade and situação can't drift apart in any of them.
// Typing a grade re-derives the situação from it...
function gradeChange(raw: string): GradeAndSituacao {
  const grade = raw === '' ? '' : Number(raw);
  return { grade, situacao: situacaoFromGrade(grade) };
}

// ...and picking trancado / em andamento clears the grade, while picking
// aprovado / reprovado keeps it for gradeSituacaoError to check.
function situacaoChange(situacao: Situacao, grade: number | ''): GradeAndSituacao {
  return { situacao, grade: requiresGrade(situacao) ? grade : '' };
}

// Only trancado locks the grade input. Em andamento keeps it editable on
// purpose: clearing a grade derives em andamento, so locking it would freeze
// the field mid-edit — and typing a grade back promotes it to aprovado/reprovado.
function gradeLocked(situacao: Situacao | undefined): boolean {
  return situacao === 'trancado';
}

// Grade-less entries (trancado / em andamento) are stored with a 0
// placeholder: computeIra never reads their grade, and the list shows "—".
function toEntry(draft: DraftEntry): Omit<IraEntry, 'id'> {
  return {
    ...draft,
    grade: requiresGrade(draft.situacao) && draft.grade !== '' ? draft.grade : 0,
    ...(draft.situacao === 'em_andamento' ? { simulated: false } : {}),
  };
}

// Manual entry only accepts these three workloads (imported PDF entries
// aren't restricted, since real transcripts can list other values).
const WORKLOAD_OPTIONS = [32, 64, 96];

const OUTROS = 'Outros';

function groupIndexedBySemester(entries: DraftEntry[]): [string, { index: number; entry: DraftEntry }[]][] {
  const groups = new Map<string, { index: number; entry: DraftEntry }[]>();
  entries.forEach((entry, index) => {
    const key = entry.semester ?? OUTROS;
    const list = groups.get(key) ?? [];
    list.push({ index, entry });
    groups.set(key, list);
  });
  return [...groups.entries()].sort(([a], [b]) => {
    if (a === OUTROS) return 1;
    if (b === OUTROS) return -1;
    return a.localeCompare(b);
  });
}

function groupEntriesBySemester(entries: IraEntry[]): [string, IraEntry[]][] {
  const groups = new Map<string, IraEntry[]>();
  for (const e of entries) {
    const key = e.semester ?? OUTROS;
    const list = groups.get(key) ?? [];
    list.push(e);
    groups.set(key, list);
  }
  return [...groups.entries()].sort(([a], [b]) => {
    if (a === OUTROS) return 1;
    if (b === OUTROS) return -1;
    return a.localeCompare(b);
  });
}

const TABLE = 'grid grid-cols-1 lg:grid-cols-2 gap-2.5 mt-3 items-start';
const ENTRY_ROW =
  'grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] gap-2.5 items-center py-2.5 px-3 rounded-md bg-surface border border-line text-13';
const BADGE = 'text-11 font-semibold py-0.5 px-2 rounded-full justify-self-start';
const COMPACT_CTRL =
  'h-9 w-full border-1-5 border-line rounded-md px-2.5 font-body text-13 text-ink bg-surface placeholder:text-ink-3 transition-colors focus-visible:outline-none focus-visible:border-accent disabled:opacity-50';
const COMPACT_LABEL = 'font-heading font-semibold text-11 text-ink-3';

export default function Ira() {
  const { state, ira, addEntry, addEntries, updateEntry, removeEntry, removeEntries } = useIra();
  const { show } = useToast();
  const semesterStats = computeSemesterStats(state.entries);

  const myCourse = normalizeCourse(currentUser.course);
  const [comparisonCourse, setComparisonCourse] = useState<string | null>(myCourse ?? currentUser.course);
  const [statusGroup, setStatusGroup] = useState<StatusGroup>('ativos');

  const inferredIngresso = useMemo(() => {
    let earliest: { label: string; idx: number } | null = null;
    for (const e of state.entries) {
      const idx = semesterIndex(e.semester);
      if (idx !== null && (!earliest || idx < earliest.idx)) earliest = { label: e.semester!, idx };
    }
    return earliest?.label ?? null;
  }, [state.entries]);

  const [manualIngresso, setManualIngresso] = useState<string | null>(null);
  const [claimedStudent, setClaimedStudent] = useState<CampusStudent | null>(null);
  const [showNameInRanking, setShowNameInRanking] = useState(false);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('quixhub-ira-identity');
      if (saved) {
        const parsed = JSON.parse(saved) as { claimed?: CampusStudent | null; showName?: boolean };
        if (parsed.claimed) setClaimedStudent(parsed.claimed);
        if (typeof parsed.showName === 'boolean') setShowNameInRanking(parsed.showName);
      }
      if (!localStorage.getItem('quixhub-ira-privacy-ack')) {
        setShowPrivacyModal(true);
      }
      const statsPref = localStorage.getItem('quixhub-ira-show-stats');
      if (statsPref === '0') setShowStats(false);
    } catch {
      // ignore invalid stored state
    }
  }, []);

  function toggleStats() {
    setShowStats((cur) => {
      const next = !cur;
      try {
        localStorage.setItem('quixhub-ira-show-stats', next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }

  function acceptPrivacy() {
    setShowPrivacyModal(false);
    try {
      localStorage.setItem('quixhub-ira-privacy-ack', '1');
    } catch {
      // ignore storage errors
    }
  }

  function updateIdentity(claimed: CampusStudent | null, showName: boolean) {
    setClaimedStudent(claimed);
    setShowNameInRanking(showName);
    localStorage.setItem('quixhub-ira-identity', JSON.stringify({ claimed, showName }));
  }

  const rawIngresso = manualIngresso ?? claimedStudent?.ingresso ?? inferredIngresso;
  const ingresso =
    rawIngresso && rawIngresso !== '2007.2' && rawIngresso.endsWith('.2')
      ? rawIngresso.replace(/\.2$/, '.1')
      : rawIngresso;

  const ingressoOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of CAMPUS_STUDENTS) {
      if (s.ingresso.endsWith('.1') || s.ingresso === '2007.2') set.add(s.ingresso);
    }
    return [...set].sort((a, b) => b.localeCompare(a));
  }, []);

  const [rankingFilter, setRankingFilter] = useState<RankingFilter>({
    scope: myCourse ? 'curso' : 'campus',
    cohort: 'ativos',
    fromIngresso: '2023.1',
    toIngresso: '2026.1',
  });

  const [simActive, setSimActive] = useState(false);
  const [simGrade, setSimGrade] = useState(8.5);
  const [simWorkload, setSimWorkload] = useState(256);

  const simulatedIra = useMemo(() => {
    if (!simActive || state.entries.length === 0) return null;
    let maxIdx = 0;
    for (const e of state.entries) {
      const idx = semesterIndex(e.semester);
      if (idx !== null && idx > maxIdx) maxIdx = idx;
    }
    const nextSem = maxIdx > 0 ? semesterLabel(maxIdx + 1) : '2026.2';
    return computeIra([
      ...state.entries,
      {
        id: '__sim__',
        disciplineName: 'Simulação',
        grade: simGrade,
        workload: simWorkload,
        situacao: simGrade < 5 ? 'reprovado' : 'aprovado',
        source: 'manual',
        semester: nextSem,
      },
    ]);
  }, [simActive, state.entries, simGrade, simWorkload]);

  const hasSimulated = useMemo(() => state.entries.some((e) => e.simulated), [state.entries]);
  const officialIra = useMemo(
    () => (hasSimulated ? computeIra(state.entries.filter((e) => !e.simulated)) : ira),
    [hasSimulated, state.entries, ira],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftEntry | null>(null);
  const [editingWasInProgress, setEditingWasInProgress] = useState(false);

  const [knownSemesters, setKnownSemesters] = useState<string[]>([]);
  const [openAddSemester, setOpenAddSemester] = useState<string | null>(null);

  const groupedSemesters = useMemo(() => {
    const groups = new Map<string, IraEntry[]>();
    for (const [sem, list] of groupEntriesBySemester(state.entries)) groups.set(sem, list);
    for (const sem of knownSemesters) {
      if (!groups.has(sem)) groups.set(sem, []);
    }
    return [...groups.entries()].sort(([a], [b]) => {
      if (a === OUTROS) return 1;
      if (b === OUTROS) return -1;
      return b.localeCompare(a);
    });
  }, [state.entries, knownSemesters]);

  const suggestedNextSemester = useMemo(() => {
    let maxIdx = 0;
    for (const [sem] of groupedSemesters) {
      const idx = semesterIndex(sem);
      if (idx !== null && idx > maxIdx) maxIdx = idx;
    }
    return maxIdx > 0 ? semesterLabel(maxIdx + 1) : '2026.1';
  }, [groupedSemesters]);

  function openOrCreateSemester(value: string) {
    const sem = value.trim();
    if (!sem) return;
    setKnownSemesters((cur) => (cur.includes(sem) ? cur : [...cur, sem]));
    setOpenAddSemester(sem);
  }

  const [fileName, setFileName] = useState<string>();
  const [parsing, setParsing] = useState(false);
  const [review, setReview] = useState<DraftEntry[] | null>(null);
  const [printedIra, setPrintedIra] = useState<number | undefined>();

  const previewIra = review ? computeIra(review.map((e, i) => ({ ...toEntry(e), id: `preview-${i}` }))) : null;

  async function handleFile(file: File) {
    setFileName(file.name);
    setParsing(true);
    setReview(null);
    try {
      const { parseHistoricoPdf } = await import('@/lib/iraPdfParser');
      const result = await parseHistoricoPdf(file);
      if (result.entries.length === 0) {
        show('Não foi possível reconhecer disciplinas neste PDF. Tente a entrada manual.');
      } else {
        setReview(result.entries);
        setPrintedIra(result.printedIra);
      }
    } catch {
      show('Falha ao ler o PDF. Tente novamente ou use a entrada manual.');
    } finally {
      setParsing(false);
    }
  }

  function updateReviewRow(index: number, patch: Partial<DraftEntry>) {
    setReview((cur) => cur?.map((e, i) => (i === index ? { ...e, ...patch } : e)) ?? cur);
  }

  function removeReviewRow(index: number) {
    setReview((cur) => cur?.filter((_, i) => i !== index) ?? cur);
  }

  function confirmReview() {
    if (!review) return;
    if (review.some((e) => gradeSituacaoError(e.grade, e.situacao) !== null)) {
      show('Corrija as notas destacadas ou remova essas disciplinas.');
      return;
    }
    const previousPdfIds = state.entries.filter((e) => e.source === 'pdf').map((e) => e.id);
    if (previousPdfIds.length > 0) removeEntries(previousPdfIds);
    addEntries(review.map(toEntry));
    setReview(null);
    setFileName(undefined);
    setPrintedIra(undefined);
    show(previousPdfIds.length > 0 ? 'Histórico atualizado com sucesso!' : 'Histórico importado com sucesso!');
  }

  return (
    <div>
      <IraPrivacyModal open={showPrivacyModal} onAccept={acceptPrivacy} />

      <div className="my-2 mb-5 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-bold text-22 mb-1">Calculadora de IRA</h1>
          <p className="text-13 text-ink-2">
            Calculado localmente a partir das disciplinas que você informar — os dados ficam apenas no seu navegador.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPrivacyModal(true)}
          className="inline-flex items-center gap-1.5 text-11-5 font-heading font-semibold text-good bg-good-tint px-3 py-1.5 rounded-full cursor-pointer hover:opacity-90 transition-opacity"
        >
          <ShieldCheck size={14} aria-hidden />
          100% no seu navegador
        </button>
      </div>

      {ira !== null && (
        <>
          <Card className="mb-6" padding="md">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
              <div>
                <CardKicker>Comparativo</CardKicker>
                <CardTitle>Sua posição no curso</CardTitle>
              </div>
              <Segmented<StatusGroup>
                size="sm"
                ariaLabel="Grupo de comparação"
                value={statusGroup}
                onChange={setStatusGroup}
                options={[
                  { value: 'ativos', label: 'Ativos' },
                  { value: 'todos', label: 'Todos' },
                ]}
              />
            </div>

            <IraRealDistributionChart
              ira={ira}
              officialIra={officialIra}
              ghostIra={simulatedIra}
              course={comparisonCourse}
              group={statusGroup}
              onCourseChange={setComparisonCourse}
            />
            <IraWhatIfSimulator
              entries={state.entries}
              currentIra={officialIra ?? ira}
              course={comparisonCourse}
              group={statusGroup}
              active={simActive}
              grade={simGrade}
              workload={simWorkload}
              onToggle={setSimActive}
              onGradeChange={setSimGrade}
              onWorkloadChange={setSimWorkload}
            />
          </Card>

          <IraIdentityMatch
            entries={state.entries}
            ira={officialIra ?? ira}
            myCourse={myCourse}
            inferredIngresso={inferredIngresso}
            userName={currentUser.name}
            claimed={claimedStudent}
            showNameInRanking={showNameInRanking}
            onClaim={(student) => {
              updateIdentity(student, student ? showNameInRanking : false);
              if (student) show('Identidade confirmada na base SIGAA!');
            }}
            onToggleShowName={(next) => updateIdentity(claimedStudent, next)}
          />

          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-heading font-bold text-13 text-ink-2">Ranking, evolução e mapa de força</span>
              {hasSimulated && officialIra !== null && (
                <span className="text-11 font-heading font-semibold px-2.5 py-0.5 rounded-full bg-accent-2-tint text-accent-2-dark">
                  Com previsão ({ira.toFixed(4)}) · Real: {officialIra.toFixed(4)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={toggleStats}
              className="inline-flex items-center gap-1.5 text-12 font-heading font-semibold text-ink-2 hover:text-ink bg-surface border border-line rounded-full px-3 py-1.5 cursor-pointer transition-colors"
            >
              <BarChart3 size={14} aria-hidden />
              {showStats ? 'Ocultar estatísticas' : 'Mostrar estatísticas'}
              {showStats ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
            </button>
          </div>

          {showStats && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <IraRanking
                  ira={ira}
                  myCourse={myCourse}
                  ingresso={ingresso}
                  ingressoOptions={ingressoOptions}
                  onIngressoChange={setManualIngresso}
                  filter={rankingFilter}
                  onFilterChange={setRankingFilter}
                  claimedStudent={claimedStudent}
                  displayName={showNameInRanking ? currentUser.name : null}
                  isEstimate={hasSimulated}
                  officialIra={officialIra}
                />
                <IraEvolutionChart entries={state.entries} course={comparisonCourse} />
              </div>

              <IraInsightsGrid ira={ira} entries={state.entries} course={comparisonCourse} ingresso={ingresso} />
            </>
          )}
        </>
      )}

      <div className="mb-6">
        <div className="font-heading font-bold text-sm mb-2">Importar histórico do SIGAA (PDF)</div>
        <UploadDropzone fileName={parsing ? 'Lendo PDF...' : fileName} onFile={handleFile} accept="application/pdf" />

        {review && review.length > 0 && (
          <div className="bg-surface-sunken border border-line rounded-xl p-5 mt-3 mb-6 shadow-sm">
            <div className="font-heading font-bold text-16 mb-2">
              Revisar importação ({review.length} disciplinas)
            </div>
            <div className="flex flex-wrap gap-4 text-13 text-ink-3 mb-6 pb-4 border-b border-line">
              <div>
                IRA prévio estimado:{' '}
                <b className="text-ink">{previewIra !== null && previewIra !== undefined ? previewIra.toFixed(4) : '—'}</b>
              </div>
              {printedIra !== undefined && (
                <div>
                  Valor impresso no PDF:{' '}
                  <b className="text-ink">{printedIra}</b>
                </div>
              )}
            </div>
            {groupIndexedBySemester(review).map(([semester, items]) => (
              <div key={semester} className="mb-6 last:mb-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-heading font-bold text-14 text-ink-2">
                    {semester === OUTROS ? OUTROS : `Semestre ${semester}`}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-danger hover:text-danger hover:bg-danger-tint h-7 text-12 px-2.5"
                    onClick={() => {
                      const indicesToRemove = new Set(items.map((i) => i.index));
                      setReview((cur) => cur?.filter((_, i) => !indicesToRemove.has(i)) ?? cur);
                    }}
                  >
                    Remover semestre
                  </Button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 items-start">
                  {items.map(({ index: i, entry: e }) => {
                    const rowError = gradeSituacaoError(e.grade, e.situacao);
                    return (
                      <div key={i} className="flex flex-col gap-2 p-3 rounded-md bg-surface border border-line text-13 shadow-sm hover:border-line-strong transition-colors">
                        <div className="flex items-center gap-2">
                          <input
                            value={e.disciplineName}
                            aria-label="Disciplina"
                            onChange={(ev) => updateReviewRow(i, { disciplineName: ev.target.value })}
                            className={`${COMPACT_CTRL} flex-1 min-w-0 font-medium`}
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeReviewRow(i)} aria-label="Remover">
                            <Trash2 size={16} className="text-danger opacity-70 hover:opacity-100" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <label className="flex flex-col gap-1">
                            <span className={COMPACT_LABEL}>Nota</span>
                            <input
                              type="number"
                              min={0}
                              max={10}
                              step={0.1}
                              placeholder={requiresGrade(e.situacao) ? '0–10' : '—'}
                              disabled={gradeLocked(e.situacao)}
                              value={e.grade}
                              onChange={(ev) => {
                                const patch = gradeChange(ev.target.value);
                                updateReviewRow(i, {
                                  ...patch,
                                  ...(e.situacao === 'em_andamento' && patch.grade !== '' ? { simulated: true } : {}),
                                });
                              }}
                              className={`${COMPACT_CTRL} tabular-nums ${rowError ? 'border-danger focus-visible:border-danger' : ''}`}
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className={COMPACT_LABEL}>CH</span>
                            <div className="relative">
                              <select
                                value={e.workload}
                                onChange={(ev) => updateReviewRow(i, { workload: Number(ev.target.value) })}
                                className={`${COMPACT_CTRL} appearance-none pr-7 cursor-pointer`}
                              >
                                {WORKLOAD_OPTIONS.map((h) => (
                                  <option key={h} value={h}>
                                    {h}h
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-3" />
                            </div>
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className={COMPACT_LABEL}>Situação</span>
                            <div className="relative">
                              <select
                                value={e.situacao ?? 'outro'}
                                onChange={(ev) => updateReviewRow(i, situacaoChange(ev.target.value as Situacao, e.grade))}
                                className={`${COMPACT_CTRL} appearance-none pr-7 cursor-pointer`}
                              >
                                <SituacaoOptions current={e.situacao} />
                              </select>
                              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-3" />
                            </div>
                          </label>
                        </div>
                        {rowError && <p className="text-11 font-semibold text-danger">{rowError}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="mt-6 pt-4 border-t border-line flex justify-end">
              <Button onClick={confirmReview} className="px-8 shadow-md">
                Confirmar e salvar
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div>
            <div className="font-heading font-bold text-sm">Minhas disciplinas</div>
            <span className="text-11-5 text-ink-3">
              {state.entries.length} {state.entries.length === 1 ? 'disciplina cadastrada' : 'disciplinas cadastradas'}
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => openOrCreateSemester(suggestedNextSemester)}
          >
            <Plus size={14} />
            Semestre {suggestedNextSemester}
          </Button>
        </div>

        <div>
          {groupedSemesters.length === 0 ? (
            <div className="text-13 text-ink-3 py-6 px-4 text-center border border-dashed border-line rounded-md">
              Nenhuma disciplina ainda — importe seu histórico acima ou clique em{' '}
              <button
                type="button"
                onClick={() => openOrCreateSemester(suggestedNextSemester)}
                className="font-heading font-semibold text-accent hover:underline cursor-pointer"
              >
                + Semestre {suggestedNextSemester}
              </button>
              .
            </div>
          ) : (
            groupedSemesters.map(([semester, entries]) => {
              const stat = semesterStats.find((s) => s.semester === semester);
              const delta = stat && stat.average !== null && ira !== null ? stat.average - ira : null;
              const sharePercent = stat && stat.contribution !== null && ira ? (stat.contribution / ira) * 100 : null;
              const isAddingHere = openAddSemester === semester;
              return (
              <div key={semester} className="mb-5">
                <div className="flex justify-between items-center flex-wrap gap-2 my-3 mb-1.5">
                  <span className="font-heading font-bold text-13 text-ink">
                    {semester === OUTROS ? OUTROS : `Semestre ${semester}`}
                  </span>
                  <div className="flex items-center gap-1">
                    {semester !== OUTROS && (
                      <Button
                        variant={isAddingHere ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setOpenAddSemester(isAddingHere ? null : semester)}
                      >
                        {isAddingHere ? <X size={14} /> : <Plus size={14} />}
                        {isAddingHere ? 'Fechar' : 'Adicionar disciplina'}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (entries.length > 0) removeEntries(entries.map((e) => e.id));
                        setKnownSemesters((cur) => cur.filter((s) => s !== semester));
                        if (openAddSemester === semester) setOpenAddSemester(null);
                        if (editingId && entries.some((e) => e.id === editingId)) {
                          setEditingId(null);
                          setEditDraft(null);
                        }
                        show(`Semestre ${semester === OUTROS ? OUTROS : semester} removido.`);
                      }}
                    >
                      <Trash2 size={14} />
                      Excluir semestre
                    </Button>
                  </div>
                </div>
                {stat && stat.average !== null && stat.contribution !== null && (
                  <div
                    className="rounded-md px-3 py-2 mb-2 flex items-center gap-x-3 gap-y-1 flex-wrap"
                    style={{ background: 'var(--color-surface-sunken)' }}
                  >
                    <span className="text-13">
                      contribuiu com <b className="font-heading text-ink">{stat.contribution.toFixed(2)}</b>
                      {sharePercent !== null && <span className="text-ink-3"> ({sharePercent.toFixed(0)}%)</span>} do IRA
                    </span>
                    <span className="text-11-5 text-ink-3">
                      média {stat.average.toFixed(2)}
                      {delta !== null && (
                        <span className={delta >= 0 ? 'text-accent-3 font-semibold' : 'text-danger font-semibold'}>
                          {' '}
                          ({delta >= 0 ? '+' : ''}
                          {delta.toFixed(2)})
                        </span>
                      )}
                      {' · '}peso {stat.weight}×
                    </span>
                  </div>
                )}
                {isAddingHere && semester !== OUTROS && (
                  <QuickAddDisciplineForm semester={semester} autoFocus onAdd={addEntry} />
                )}
                {entries.length > 0 && (
                <div className={TABLE}>
                  {entries.map((e) =>
                    editingId === e.id && editDraft ? (() => {
                      const editError = gradeSituacaoError(editDraft.grade, editDraft.situacao);
                      return (
                        <div key={e.id} className="flex flex-col gap-2 p-3 rounded-md bg-surface border border-accent text-13 shadow-sm">
                          <div className="flex items-center gap-2">
                            <input
                              value={editDraft.disciplineName}
                              aria-label="Disciplina"
                              onChange={(ev) => setEditDraft((d) => d && { ...d, disciplineName: ev.target.value })}
                              className={`${COMPACT_CTRL} flex-1 min-w-0 font-medium`}
                            />
                            <div className="flex gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={editError !== null}
                                onClick={() => {
                                  if (editError !== null) return;
                                  updateEntry(e.id, toEntry(editDraft));
                                  setEditingId(null);
                                  setEditDraft(null);
                                }}
                                aria-label="Salvar"
                              >
                                <Check size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditDraft(null);
                                }}
                                aria-label="Cancelar"
                              >
                                <X size={16} />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <label className="flex flex-col gap-1">
                              <span className={COMPACT_LABEL}>Nota</span>
                              <input
                                type="number"
                                min={0}
                                max={10}
                                step={0.1}
                                placeholder={requiresGrade(editDraft.situacao) ? '0–10' : '—'}
                                disabled={gradeLocked(editDraft.situacao)}
                                value={editDraft.grade}
                                onChange={(ev) => {
                                  const patch = gradeChange(ev.target.value);
                                  const autoSim = (editingWasInProgress || !isSemesterConsolidated(e.semester)) && patch.grade !== '';
                                  setEditDraft((d) =>
                                    d && {
                                      ...d,
                                      ...patch,
                                      ...(autoSim ? { simulated: true } : {}),
                                    },
                                  );
                                }}
                                className={`${COMPACT_CTRL} tabular-nums ${editError ? 'border-danger focus-visible:border-danger' : ''}`}
                              />
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className={COMPACT_LABEL}>CH</span>
                              <div className="relative">
                                <select
                                  value={editDraft.workload}
                                  onChange={(ev) => setEditDraft((d) => d && { ...d, workload: Number(ev.target.value) })}
                                  className={`${COMPACT_CTRL} appearance-none pr-7 cursor-pointer`}
                                >
                                  {WORKLOAD_OPTIONS.map((h) => (
                                    <option key={h} value={h}>
                                      {h}h
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-3" />
                              </div>
                            </label>
                            <label className="flex flex-col gap-1">
                              <span className={COMPACT_LABEL}>Situação</span>
                              <div className="relative">
                                <select
                                  value={editDraft.situacao ?? 'outro'}
                                  onChange={(ev) => {
                                    const situacao = ev.target.value as Situacao;
                                    setEditDraft((d) => d && { ...d, ...situacaoChange(situacao, d.grade) });
                                  }}
                                  className={`${COMPACT_CTRL} appearance-none pr-7 cursor-pointer`}
                                >
                                  <SituacaoOptions current={editDraft.situacao} />
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-3" />
                              </div>
                            </label>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <label className="inline-flex items-center gap-1.5 text-11 text-ink-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={Boolean(editDraft.simulated)}
                                onChange={(ev) => setEditDraft((d) => d && { ...d, simulated: ev.target.checked })}
                                className="accent-[var(--color-accent-2-dark)] w-3.5 h-3.5 cursor-pointer"
                              />
                              <span>Previsão (não altera o IRA oficial)</span>
                            </label>
                            {editError && <p className="text-11 font-semibold text-danger">{editError}</p>}
                          </div>
                        </div>
                      );
                    })() : (
                      <div key={e.id} className={ENTRY_ROW}>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-medium truncate" title={e.disciplineName}>
                            {e.disciplineName}
                          </span>
                          {e.simulated && (
                            <span
                              className="text-10 font-heading font-semibold px-1.5 py-0.5 rounded bg-accent-2-tint text-accent-2-dark shrink-0"
                              title="Nota prevista — não entra no IRA oficial"
                            >
                              Previsão
                            </span>
                          )}
                        </div>
                        {requiresGrade(e.situacao) ? (
                          <span className="tabular-nums font-medium">{e.grade}</span>
                        ) : (
                          <span className="text-ink-3">—</span>
                        )}
                        <span className="text-ink-2 tabular-nums">{e.workload}h</span>
                        <span className={`${BADGE} ${SITUACAO_BADGE[e.situacao ?? 'outro']}`}>
                          {SITUACAO_LABEL[e.situacao ?? 'outro']}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingId(e.id);
                              setEditingWasInProgress(e.situacao === 'em_andamento');
                              setEditDraft({
                                disciplineName: e.disciplineName,
                                grade: requiresGrade(e.situacao) ? e.grade : '',
                                workload: e.workload,
                                situacao: e.situacao,
                                source: e.source,
                                simulated: e.simulated,
                                semester: e.semester,
                              });
                            }}
                            aria-label="Editar"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => removeEntry(e.id)} aria-label="Remover">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    ),
                  )}
                </div>
                )}
              </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
