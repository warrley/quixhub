'use client';

import { ArrowUp, Check, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card, CardKicker, CardTitle } from '@/components/Card';
import { SelectField, TextField } from '@/components/Field';
import { IraDistributionChart } from '@/components/IraDistributionChart';
import { UploadDropzone } from '@/components/UploadDropzone';
import { useToast } from '@/components/Toast';
import { currentUser } from '@/data/mock';
import { IRA_DISTRIBUTIONS } from '@/data/iraDistribution';
import type { IraEntry } from '@/data/types';
import { computeIra, computeSemesterStats } from '@/lib/ira';
import { useIra } from '@/lib/iraStore';

type DraftEntry = Omit<IraEntry, 'id' | 'grade'> & { grade: number | '' };

const SITUACAO_LABEL: Record<NonNullable<IraEntry['situacao']>, string> = {
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  em_andamento: 'Em andamento',
  trancado: 'Trancado',
  outro: 'Outro',
};

// Manual entry only accepts these three workloads (imported PDF entries
// aren't restricted, since real transcripts can list other values).
const WORKLOAD_OPTIONS = [32, 64, 96];

function isValidGrade(grade: number | ''): boolean {
  return typeof grade === 'number' && grade >= 0 && grade <= 10;
}

function emptyDraft(): DraftEntry {
  return { disciplineName: '', grade: '', workload: 64, situacao: 'aprovado', source: 'manual' };
}

function sortSemesters(semesters: string[]): string[] {
  return [...new Set(semesters)].sort((a, b) => a.localeCompare(b));
}

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

const BUTTON_FIELD = 'flex flex-col gap-1.5 mb-4';
const BUTTON_FIELD_LABEL = 'font-heading font-semibold text-xs invisible';
const BUTTON_FIELD_SPACER = 'text-xs min-h-[16px] invisible';
const TABLE = 'flex flex-col gap-2 mt-3';
const ENTRY_ROW = 'grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-center py-2.5 px-3 rounded-md bg-surface border border-line text-13';
const BADGE = 'text-11 font-semibold py-0.5 px-2 rounded-full bg-accent-tint text-accent-dark justify-self-start';

function getGradeStyle(grade: number | string | undefined) {
  if (typeof grade !== 'number' || !Number.isFinite(grade)) return {};
  const hue = Math.max(0, Math.min(120, (grade / 10) * 120));
  return {
    backgroundColor: `hsl(${hue}, 80%, 50%, 0.15)`,
    color: `hsl(${hue}, 80%, 35%)`,
  };
}

export default function Ira() {
  const { state, ira, addEntry, addEntries, updateEntry, removeEntry, removeEntries } = useIra();
  const { show } = useToast();
  const semesterStats = computeSemesterStats(state.entries);

  const [comparisonCourse, setComparisonCourse] = useState(currentUser.course);
  const comparisonDist = IRA_DISTRIBUTIONS[comparisonCourse];

  const [draft, setDraft] = useState<DraftEntry>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftEntry | null>(null);

  const [knownSemesters, setKnownSemesters] = useState<string[]>([]);
  const [activeSemester, setActiveSemester] = useState('');
  const [newSemesterInput, setNewSemesterInput] = useState('');

  const availableSemesters = sortSemesters([
    ...knownSemesters,
    ...state.entries.map((e) => e.semester).filter((s): s is string => Boolean(s)),
  ]);

  function addSemester() {
    const value = newSemesterInput.trim();
    if (!value) return;
    setKnownSemesters((cur) => (cur.includes(value) ? cur : [...cur, value]));
    setActiveSemester(value);
    setNewSemesterInput('');
  }

  const [fileName, setFileName] = useState<string>();
  const [parsing, setParsing] = useState(false);
  const [review, setReview] = useState<DraftEntry[] | null>(null);
  const [printedIra, setPrintedIra] = useState<number | undefined>();

  const previewIra = review
    ? computeIra(
        review.map((e, i) => ({
          ...e,
          id: `preview-${i}`,
          grade: typeof e.grade === 'number' ? e.grade : 0,
        })),
      )
    : null;

  function handleAddManual() {
    if (!activeSemester || !draft.disciplineName || draft.workload <= 0 || !isValidGrade(draft.grade)) return;
    addEntry({ ...draft, semester: activeSemester, grade: draft.grade as number });
    setDraft(emptyDraft());
  }

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
    if (review.some((e) => !isValidGrade(e.grade))) {
      show('Preencha ou remova as disciplinas sem nota.');
      return;
    }
    addEntries(review as Omit<IraEntry, 'id'>[]);
    setReview(null);
    setFileName(undefined);
    setPrintedIra(undefined);
    show('Histórico importado com sucesso!');
  }

  return (
    <div>
      <div className="my-2 mb-5">
        <h1 className="font-heading font-bold text-22 mb-1">Calculadora de IRA</h1>
        <p className="text-13 text-ink-2">
          Calculado localmente a partir das disciplinas que você informar — os dados ficam apenas no seu navegador.
        </p>
      </div>

      {ira !== null && (
        <Card className="mb-6" padding="md">
          <CardKicker>Comparativo</CardKicker>
          <div className="flex items-center justify-between flex-wrap gap-x-4 mb-3">
            <CardTitle>Sua posição no curso</CardTitle>
          </div>
          <div>
            <IraDistributionChart
              ira={ira}
              courseName={comparisonCourse}
              mean={comparisonDist?.mean ?? null}
              std={comparisonDist?.std ?? null}
              students={comparisonDist?.students}
              courses={Object.keys(IRA_DISTRIBUTIONS)}
              onCourseChange={setComparisonCourse}
            />
          </div>
        </Card>
      )}

      <div className="mb-6">
        <div className="font-heading font-bold text-sm mb-3">Semestre</div>
        <div className="grid grid-cols-[2fr_auto] gap-3 items-end max-w-[480px]">
          <TextField
            label="Novo semestre"
            placeholder="Ex: 2025.1"
            value={newSemesterInput}
            onChange={(e) => setNewSemesterInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSemester();
              }
            }}
          />
          <div className={BUTTON_FIELD}>
            <span className={BUTTON_FIELD_LABEL}>Adicionar semestre</span>
            <Button variant="secondary" onClick={addSemester} disabled={!newSemesterInput.trim()}>
              Adicionar semestre
            </Button>
            <span className={BUTTON_FIELD_SPACER}>spacer</span>
          </div>
        </div>

        {availableSemesters.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-3">
            {availableSemesters.map((s) => (
              <button
                key={s}
                type="button"
                className={`font-heading font-semibold text-12-5 py-1.5 px-3.5 rounded-full border-1-5 cursor-pointer [transition:border-color_0.15s_ease,background-color_0.15s_ease,color_0.15s_ease,box-shadow_0.15s_ease] ${
                  s === activeSemester
                    ? 'border-accent bg-accent text-ink-inverse shadow-sm'
                    : 'border-line bg-surface text-ink-2 hover:border-line-strong'
                }`}
                onClick={() => setActiveSemester(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-baseline justify-between mb-3 mt-5">
          <div className="font-heading font-bold text-sm">
            Adicionar disciplina manualmente
            {activeSemester ? ` — Semestre ${activeSemester}` : ''}
          </div>
          <span className="text-11-5 text-ink-3">
            {state.entries.length} {state.entries.length === 1 ? 'disciplina cadastrada' : 'disciplinas cadastradas'}
          </span>
        </div>
        {!activeSemester && (
          <div
            className="flex items-center gap-2.5 rounded-md pl-3 pr-4 py-3 mb-3 border-l-[3px]"
            style={{ borderColor: 'var(--color-accent-2)', background: 'var(--color-accent-2-tint)' }}
          >
            <ArrowUp size={16} className="shrink-0" style={{ color: 'var(--color-accent-2-dark)' }} />
            <span className="text-13 font-medium" style={{ color: 'var(--color-accent-2-dark)' }}>
              Defina um semestre acima para adicionar disciplinas.
            </span>
          </div>
        )}
        <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
          <TextField
            label="Disciplina"
            placeholder="Nome da disciplina"
            value={draft.disciplineName}
            disabled={!activeSemester}
            onChange={(e) => setDraft((d) => ({ ...d, disciplineName: e.target.value }))}
          />
          <TextField
            label="Nota"
            type="number"
            min={0}
            max={10}
            step={0.1}
            disabled={!activeSemester}
            value={draft.grade}
            error={draft.grade !== '' && !isValidGrade(draft.grade) ? 'Nota deve estar entre 0 e 10.' : undefined}
            onChange={(e) => setDraft((d) => ({ ...d, grade: e.target.value === '' ? '' : Number(e.target.value) }))}
          />
          <SelectField
            label="CH"
            disabled={!activeSemester}
            value={draft.workload || ''}
            onChange={(e) => setDraft((d) => ({ ...d, workload: Number(e.target.value) }))}
          >
            <option value="" disabled>
              Selecione
            </option>
            {WORKLOAD_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {h}h
              </option>
            ))}
          </SelectField>
          <div className={BUTTON_FIELD}>
            <span className={BUTTON_FIELD_LABEL}>Adicionar</span>
            <Button
              onClick={handleAddManual}
              disabled={!activeSemester || !draft.disciplineName || draft.workload <= 0 || !isValidGrade(draft.grade)}
            >
              Adicionar
            </Button>
            <span className={BUTTON_FIELD_SPACER}>spacer</span>
          </div>
        </div>

        <div>
          {state.entries.length === 0 ? (
            <div className="text-13 text-ink-3 py-3">Nenhuma disciplina adicionada ainda.</div>
          ) : (
            groupEntriesBySemester(state.entries).map(([semester, entries]) => {
              const stat = semesterStats.find((s) => s.semester === semester);
              const delta = stat && stat.average !== null && ira !== null ? stat.average - ira : null;
              const sharePercent = stat && stat.contribution !== null && ira ? (stat.contribution / ira) * 100 : null;
              return (
              <div key={semester}>
                <div className="flex justify-between items-center my-4 mb-1">
                  <span className="font-heading font-bold text-12-5 text-ink-2">
                    {semester === OUTROS ? OUTROS : `Semestre ${semester}`}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      removeEntries(entries.map((e) => e.id));
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
                <div className={TABLE}>
                  {entries.map((e) =>
                    editingId === e.id && editDraft ? (
                      <div key={e.id} className={ENTRY_ROW}>
                        <TextField
                          value={editDraft.disciplineName}
                          onChange={(ev) => setEditDraft((d) => d && { ...d, disciplineName: ev.target.value })}
                        />
                        <TextField
                          type="number"
                          min={0}
                          max={10}
                          step={0.1}
                          value={editDraft.grade}
                          error={!isValidGrade(editDraft.grade) ? 'Nota deve estar entre 0 e 10.' : undefined}
                          onChange={(ev) => setEditDraft((d) => d && { ...d, grade: ev.target.value === '' ? '' : Number(ev.target.value) })}
                        />
                        <SelectField
                          value={editDraft.workload}
                          onChange={(ev) => setEditDraft((d) => d && { ...d, workload: Number(ev.target.value) })}
                        >
                          {WORKLOAD_OPTIONS.map((h) => (
                            <option key={h} value={h}>
                              {h}h
                            </option>
                          ))}
                        </SelectField>
                        <SelectField
                          value={editDraft.situacao}
                          onChange={(ev) =>
                            setEditDraft((d) => d && { ...d, situacao: ev.target.value as IraEntry['situacao'] })
                          }
                        >
                          {Object.entries(SITUACAO_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </SelectField>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!isValidGrade(editDraft.grade)}
                            onClick={() => {
                              updateEntry(e.id, { ...editDraft, grade: editDraft.grade as number });
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
                    ) : (
                      <div key={e.id} className={ENTRY_ROW}>
                        <span>{e.disciplineName}</span>
                        <span
                          className="font-mono font-medium rounded px-1.5 py-0.5 w-fit"
                          style={getGradeStyle(e.grade)}
                        >
                          {e.grade}
                        </span>
                        <span>{e.workload}h</span>
                        <span className={BADGE}>{SITUACAO_LABEL[e.situacao ?? 'outro']}</span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingId(e.id);
                              setEditDraft({
                                disciplineName: e.disciplineName,
                                grade: e.grade,
                                workload: e.workload,
                                situacao: e.situacao,
                                source: e.source,
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
              </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="font-heading font-bold text-sm mb-3">Importar histórico (PDF)</div>
        <UploadDropzone fileName={parsing ? 'Lendo PDF...' : fileName} onFile={handleFile} accept="application/pdf" />

        {review && review.length > 0 && (
          <>
            <div className="bg-surface-sunken border border-line rounded-xl p-5 mb-6 shadow-sm">
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
                        const indicesToRemove = new Set(items.map(i => i.index));
                        setReview(cur => cur?.filter((_, i) => !indicesToRemove.has(i)) ?? cur);
                      }}
                    >
                      Remover semestre
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {items.map(({ index: i, entry: e }) => (
                      <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-center py-2 px-3 rounded-md bg-surface border border-line text-13 shadow-sm hover:border-line-strong transition-colors">
                        <TextField
                          value={e.disciplineName}
                          onChange={(ev) => updateReviewRow(i, { disciplineName: ev.target.value })}
                        />
                        <TextField
                          type="number"
                          min={0}
                          max={10}
                          step={0.1}
                          value={e.grade}
                          error={e.grade === '' ? 'Obrigatório' : (!isValidGrade(e.grade) ? 'Inválido' : undefined)}
                          onChange={(ev) => {
                            const val = ev.target.value;
                            const grade = val === '' ? '' : Number(val);
                            let situacao = e.situacao;
                            if (val !== '' && situacao === 'em_andamento') {
                              situacao = (grade as number) >= 5 ? 'aprovado' : 'reprovado';
                            }
                            updateReviewRow(i, { grade, situacao });
                          }}
                        />
                        <SelectField
                          value={e.workload}
                          onChange={(ev) => updateReviewRow(i, { workload: Number(ev.target.value) })}
                        >
                          {WORKLOAD_OPTIONS.map((h) => (
                            <option key={h} value={h}>
                              {h}h
                            </option>
                          ))}
                        </SelectField>
                        <SelectField
                          value={e.situacao ?? 'outro'}
                          onChange={(ev) => updateReviewRow(i, { situacao: ev.target.value as IraEntry['situacao'] })}
                        >
                          {Object.entries(SITUACAO_LABEL).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </SelectField>
                        <Button variant="ghost" size="icon" onClick={() => removeReviewRow(i)} aria-label="Remover">
                          <Trash2 size={16} className="text-danger opacity-70 hover:opacity-100" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="mt-6 pt-4 border-t border-line flex justify-end">
                <Button onClick={confirmReview} className="px-8 shadow-md">
                  Confirmar e salvar
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
