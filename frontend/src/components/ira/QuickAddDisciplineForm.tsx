'use client';

import { ChevronDown, Plus } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import campusDisciplinesRaw from '@/data/campusDisciplines.json';
import type { IraEntry } from '@/data/types';
import { gradeSituacaoError, requiresGrade, situacaoFromGrade, type Situacao } from '@/lib/ira';

const CATALOG = campusDisciplinesRaw as [string, number][];
const CATALOG_WORKLOAD = new Map<string, number>(CATALOG.map(([name, ch]) => [name.toLowerCase(), ch]));
const WORKLOAD_OPTIONS = [32, 64, 96];
const SITUACAO_CHOICES: { value: Situacao; label: string }[] = [
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'reprovado', label: 'Reprovado' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'trancado', label: 'Trancado' },
];

const LABEL = 'font-heading font-semibold text-11-5 text-ink-2';
const CONTROL =
  'h-9 w-full border-1-5 border-line rounded-md px-3 font-body text-13 text-ink bg-surface placeholder:text-ink-3 transition-colors focus-visible:outline-none focus-visible:border-accent disabled:opacity-50';

/**
 * Compact inline form rendered directly inside a semester section: supports
 * campus catalog autocomplete (auto-filling CH), 1-click CH pills, Enter to
 * submit, and returns focus to the discipline name input for batch entry.
 */
export function QuickAddDisciplineForm({
  semester,
  autoFocus = false,
  onAdd,
}: {
  semester: string;
  autoFocus?: boolean;
  onAdd: (entry: Omit<IraEntry, 'id'>) => void;
}) {
  const listId = useId();
  const nameRef = useRef<HTMLInputElement>(null);

  const [disciplineName, setDisciplineName] = useState('');
  const [grade, setGrade] = useState<number | ''>('');
  const [workload, setWorkload] = useState(64);
  const [situacao, setSituacao] = useState<Situacao>(() => situacaoFromGrade(''));

  const error = gradeSituacaoError(grade, situacao);
  const canAdd = Boolean(disciplineName.trim() && workload > 0 && error === null);

  function handleNameChange(value: string) {
    setDisciplineName(value);
    const knownCh = CATALOG_WORKLOAD.get(value.trim().toLowerCase());
    if (knownCh && WORKLOAD_OPTIONS.includes(knownCh)) {
      setWorkload(knownCh);
    }
  }

  function handleGradeChange(raw: string) {
    const next = raw === '' ? '' : Number(raw);
    setGrade(next);
    setSituacao(situacaoFromGrade(next));
  }

  function handleSituacaoChange(next: Situacao) {
    setSituacao(next);
    if (!requiresGrade(next)) setGrade('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canAdd) return;
    onAdd({
      disciplineName: disciplineName.trim(),
      grade: requiresGrade(situacao) && grade !== '' ? grade : 0,
      workload,
      situacao,
      source: 'manual',
      semester,
    });
    setDisciplineName('');
    setGrade('');
    setSituacao(situacaoFromGrade(''));
    nameRef.current?.focus();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-2.5 p-3 rounded-md bg-surface-sunken border border-line flex flex-col gap-2.5"
    >
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_88px_auto_140px_auto] gap-2.5 items-end">
        <label className="flex flex-col gap-1 min-w-0">
          <span className={LABEL}>Disciplina</span>
          <input
            ref={nameRef}
            list={listId}
            autoFocus={autoFocus}
            placeholder="Digite para buscar ou adicionar…"
            value={disciplineName}
            onChange={(e) => handleNameChange(e.target.value)}
            className={CONTROL}
          />
          <datalist id={listId}>
            {CATALOG.map(([name]) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1">
          <span className={LABEL}>Nota</span>
          <input
            type="number"
            min={0}
            max={10}
            step={0.1}
            placeholder={requiresGrade(situacao) ? '0–10' : '—'}
            disabled={situacao === 'trancado'}
            value={grade}
            onChange={(e) => handleGradeChange(e.target.value)}
            className={`${CONTROL} tabular-nums ${error ? 'border-danger focus-visible:border-danger' : ''}`}
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className={LABEL}>CH</span>
          <div className="h-9 inline-flex items-center gap-0.5 p-0.5 rounded-md bg-surface border-1-5 border-line">
            {WORKLOAD_OPTIONS.map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setWorkload(ch)}
                className={`h-7 px-2 rounded-sm font-heading font-semibold text-11-5 cursor-pointer transition-colors ${
                  workload === ch ? 'bg-accent text-ink-inverse' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {ch}h
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span className={LABEL}>Situação</span>
          <div className="relative">
            <select
              value={situacao}
              onChange={(e) => handleSituacaoChange(e.target.value as Situacao)}
              className={`${CONTROL} appearance-none pr-7 cursor-pointer`}
            >
              {SITUACAO_CHOICES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-ink-3" />
          </div>
        </label>

        <Button type="submit" size="sm" disabled={!canAdd} className="h-9 px-3.5">
          <Plus size={14} />
          Adicionar
        </Button>
      </div>

      {error && <p className="text-11-5 font-semibold text-danger">{error}</p>}
    </form>
  );
}
