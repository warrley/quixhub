'use client';

import { Check, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { SelectField, TextField } from '@/components/Field';
import { UploadDropzone } from '@/components/UploadDropzone';
import { useToast } from '@/components/Toast';
import { disciplines } from '@/data/mock';
import type { IraEntry } from '@/data/types';
import { computeIra } from '@/lib/ira';
import { useIra } from '@/lib/iraStore';

type DraftEntry = Omit<IraEntry, 'id'>;

const SITUACAO_LABEL: Record<NonNullable<IraEntry['situacao']>, string> = {
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  em_andamento: 'Em andamento',
  trancado: 'Trancado',
  outro: 'Outro',
};

function emptyDraft(): DraftEntry {
  return { disciplineName: '', grade: 0, workload: 0, situacao: 'aprovado', source: 'manual' };
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

const disciplinesBySemester = disciplines.reduce((groups, d) => {
  const list = groups.get(d.semester) ?? [];
  list.push(d);
  groups.set(d.semester, list);
  return groups;
}, new Map<string, typeof disciplines>());

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
const TABLE = 'flex flex-col gap-2 mt-3';
const ENTRY_ROW = 'grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 items-center py-2.5 px-3 rounded-md bg-surface border border-line text-13';
const BADGE = 'text-11 font-semibold py-0.5 px-2 rounded-full bg-accent-tint text-accent-dark justify-self-start';

export default function Ira() {
  const { state, ira, addEntry, addEntries, updateEntry, removeEntry, removeEntries } = useIra();
  const { show } = useToast();

  const [draft, setDraft] = useState<DraftEntry>(emptyDraft());
  const [customName, setCustomName] = useState(false);
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

  const previewIra = review ? computeIra(review.map((e, i) => ({ ...e, id: `preview-${i}` }))) : null;

  function handleAddManual() {
    if (!activeSemester || !draft.disciplineName || draft.workload <= 0) return;
    addEntry({ ...draft, semester: activeSemester });
    setDraft(emptyDraft());
    setCustomName(false);
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
    addEntries(review);
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

      <div className="flex gap-4 flex-wrap mb-5">
        <div className="min-w-[140px]">
          <div className="font-heading font-extrabold text-28 text-accent">{ira !== null ? ira.toFixed(4) : '—'}</div>
          <div className="text-xs text-ink-3">IRA calculado</div>
        </div>
        <div className="min-w-[140px]">
          <div className="font-heading font-extrabold text-28 text-accent">{state.entries.length}</div>
          <div className="text-xs text-ink-3">disciplinas salvas</div>
        </div>
        <div className="min-w-[140px]">
          <div className="font-heading font-extrabold text-28 text-accent">{state.entries.reduce((s, e) => s + e.workload, 0)}h</div>
          <div className="text-xs text-ink-3">carga horária total</div>
        </div>
      </div>

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
          </div>
        </div>

        {availableSemesters.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-3">
            {availableSemesters.map((s) => (
              <button
                key={s}
                type="button"
                className={`font-heading font-semibold text-12-5 py-1.5 px-3.5 rounded-full border-1-5 border-line bg-surface text-ink-2 cursor-pointer [transition:border-color_0.15s_ease,background-color_0.15s_ease,color_0.15s_ease] hover:border-line-strong ${s === activeSemester ? 'border-accent bg-accent-tint text-accent-dark' : ''}`}
                onClick={() => setActiveSemester(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="font-heading font-bold text-sm mb-3 mt-5">
          Adicionar disciplina manualmente
          {activeSemester ? ` — Semestre ${activeSemester}` : ''}
        </div>
        {!activeSemester && <div className="text-13 text-ink-3 py-3">Defina um semestre acima para adicionar disciplinas.</div>}
        <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
          {customName ? (
            <TextField
              label="Disciplina"
              placeholder="Nome da disciplina"
              value={draft.disciplineName}
              disabled={!activeSemester}
              onChange={(e) => setDraft((d) => ({ ...d, disciplineName: e.target.value }))}
            />
          ) : (
            <SelectField
              label="Disciplina"
              value={draft.disciplineName}
              disabled={!activeSemester}
              onChange={(e) => {
                if (e.target.value === '__outro__') {
                  setCustomName(true);
                  setDraft((d) => ({ ...d, disciplineName: '' }));
                } else {
                  setDraft((d) => ({ ...d, disciplineName: e.target.value }));
                }
              }}
            >
              <option value="" disabled>
                Selecione
              </option>
              {[...disciplinesBySemester.entries()].map(([semester, group]) => (
                <optgroup key={semester} label={semester}>
                  {group.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="__outro__">Outra (digitar nome)</option>
            </SelectField>
          )}
          <TextField
            label="Nota"
            type="number"
            min={0}
            max={10}
            step={0.1}
            disabled={!activeSemester}
            value={draft.grade || ''}
            onChange={(e) => setDraft((d) => ({ ...d, grade: Number(e.target.value) }))}
          />
          <TextField
            label="CH"
            type="number"
            min={0}
            step={1}
            disabled={!activeSemester}
            value={draft.workload || ''}
            onChange={(e) => setDraft((d) => ({ ...d, workload: Number(e.target.value) }))}
          />
          <div className={BUTTON_FIELD}>
            <span className={BUTTON_FIELD_LABEL}>Adicionar</span>
            <Button onClick={handleAddManual} disabled={!activeSemester || !draft.disciplineName || draft.workload <= 0}>
              Adicionar
            </Button>
          </div>
        </div>

        <div>
          {state.entries.length === 0 ? (
            <div className="text-13 text-ink-3 py-3">Nenhuma disciplina adicionada ainda.</div>
          ) : (
            groupEntriesBySemester(state.entries).map(([semester, entries]) => (
              <div key={semester}>
                <div className="flex justify-between items-center my-4 mb-2">
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
                          onChange={(ev) => setEditDraft((d) => d && { ...d, grade: Number(ev.target.value) })}
                        />
                        <TextField
                          type="number"
                          min={0}
                          step={1}
                          value={editDraft.workload}
                          onChange={(ev) => setEditDraft((d) => d && { ...d, workload: Number(ev.target.value) })}
                        />
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
                            onClick={() => {
                              updateEntry(e.id, editDraft);
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
                        <span>{e.grade}</span>
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
            ))
          )}
        </div>
      </div>

      <div className="mb-6">
        <div className="font-heading font-bold text-sm mb-3">Importar histórico (PDF)</div>
        <UploadDropzone fileName={parsing ? 'Lendo PDF...' : fileName} onFile={handleFile} accept="application/pdf" />

        {review && review.length > 0 && (
          <>
            <div className="font-heading font-bold text-sm mb-3 mt-5">
              Revisar antes de salvar ({review.length} disciplinas · IRA prévio: {previewIra?.toFixed(4) ?? '—'})
            </div>
            {printedIra !== undefined && (
              <div className="text-12-5 text-ink-3 mt-2">
                Valor impresso no histórico: {printedIra} — o QuixHub calcula o seu de forma independente e permite
                ajustes.
              </div>
            )}
            {groupIndexedBySemester(review).map(([semester, items]) => (
              <div key={semester}>
                <div className="font-heading font-bold text-12-5 text-ink-2">{semester === OUTROS ? OUTROS : `Semestre ${semester}`}</div>
                <div className={TABLE}>
                  {items.map(({ index: i, entry: e }) => (
                    <div key={i} className={ENTRY_ROW}>
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
                        onChange={(ev) => updateReviewRow(i, { grade: Number(ev.target.value) })}
                      />
                      <TextField
                        type="number"
                        min={0}
                        step={1}
                        value={e.workload}
                        onChange={(ev) => updateReviewRow(i, { workload: Number(ev.target.value) })}
                      />
                      <span className={BADGE}>{SITUACAO_LABEL[e.situacao ?? 'outro']}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeReviewRow(i)} aria-label="Remover">
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button block onClick={confirmReview} className="mt-3">
              Confirmar e salvar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
