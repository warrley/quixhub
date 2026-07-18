'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from './Button';
import { SelectField, TextareaField } from './Field';
import { TagButton } from './Tag';
import { ApiError, api, type SubmitFeedbackInput } from '../lib/api';

const SCALES: { key: 'materialQuality' | 'examDifficulty' | 'workDifficulty'; label: string; low: string; high: string }[] = [
  { key: 'materialQuality', label: 'Qualidade do material', low: 'Péssimo', high: 'Excelente' },
  { key: 'examDifficulty', label: 'Nível das provas', low: 'Tranquilo', high: 'Muito difícil' },
  { key: 'workDifficulty', label: 'Nível dos trabalhos', low: 'Leve', high: 'Muito pesado' },
];

export function FeedbackForm({ offeringId, onSubmitted }: { offeringId: string; onSubmitted: () => void }) {
  const [values, setValues] = useState<SubmitFeedbackInput>({});
  const [status, setStatus] = useState<'loading' | 'idle' | 'submitting' | 'deleting' | 'error' | 'unauthenticated'>(
    'loading',
  );
  const [hasExisting, setHasExisting] = useState(false);

  // Pre-fill with whatever the user already submitted for this offering,
  // instead of always opening blank — resubmitting is an upsert server-side,
  // but without this the user can't see/revise their prior answer.
  useEffect(() => {
    let cancelled = false;
    api
      .getMyFeedback(offeringId)
      .then((existing) => {
        if (cancelled) return;
        if (existing) {
          setValues({
            materialQuality: existing.materialQuality ?? undefined,
            examDifficulty: existing.examDifficulty ?? undefined,
            workDifficulty: existing.workDifficulty ?? undefined,
            attendance: (existing.attendance as SubmitFeedbackInput['attendance']) ?? undefined,
            groupWork: (existing.groupWork as SubmitFeedbackInput['groupWork']) ?? undefined,
            comment: existing.comment ?? undefined,
          });
          setHasExisting(true);
        }
        setStatus('idle');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus(err instanceof ApiError && err.status === 401 ? 'unauthenticated' : 'idle');
      });
    return () => {
      cancelled = true;
    };
  }, [offeringId]);

  function setScale(key: 'materialQuality' | 'examDifficulty' | 'workDifficulty', value: number) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    try {
      await api.submitFeedback(offeringId, values);
      onSubmitted();
    } catch (err) {
      setStatus(err instanceof ApiError && err.status === 401 ? 'unauthenticated' : 'error');
    }
  }

  async function handleDelete() {
    if (!window.confirm('Excluir sua opinião sobre esta oferta? Essa ação não pode ser desfeita.')) return;
    setStatus('deleting');
    try {
      await api.deleteMyFeedback(offeringId);
      onSubmitted();
    } catch {
      setStatus('error');
    }
  }

  if (status === 'loading') {
    return <p className="text-13 text-ink-2">Carregando...</p>;
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex gap-2 bg-accent-tint border border-line rounded-md py-3 px-3.5 text-13 leading-[1.5] text-ink-2">
        <Lock size={15} style={{ flexShrink: 0, color: 'var(--color-accent)' }} />
        <span>
          Você precisa estar logado pra dar sua opinião —{' '}
          <Link href="/login" className="underline font-semibold text-accent-dark">
            clique aqui pra entrar
          </Link>
          .
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1">
      <div className="flex gap-2 bg-accent-tint border border-line rounded-md py-3 px-3.5 text-xs leading-[1.5] mb-4 text-ink-2">
        <Lock size={15} style={{ flexShrink: 0, color: 'var(--color-accent)' }} />
        <span>
          Sua identidade é protegida por criptografia. Usamos um hash com chave secreta — nem o administrador do
          sistema consegue saber quem você é.
        </span>
      </div>

      {SCALES.map(({ key, label, low, high }) => (
        <div key={key} className="mb-4">
          <div className="font-heading font-semibold text-xs text-ink-2 mb-1.5">{label}</div>
          <div className="flex gap-1.5 flex-wrap">
            {[1, 2, 3, 4, 5].map((n) => (
              <TagButton key={n} tone={values[key] === n ? 'selected' : 'outline'} onClick={() => setScale(key, n)}>
                {n}
              </TagButton>
            ))}
          </div>
          <div className="flex justify-between text-11 text-ink-3 mt-1">
            <span>{low}</span>
            <span>{high}</span>
          </div>
        </div>
      ))}

      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Cobra presença?"
          value={values.attendance ?? ''}
          onChange={(e) => setValues((v) => ({ ...v, attendance: e.target.value as SubmitFeedbackInput['attendance'] }))}
        >
          <option value="" disabled>
            Selecione
          </option>
          <option value="sempre">Sempre</option>
          <option value="as_vezes">Às vezes</option>
          <option value="nao_cobra">Não cobra</option>
        </SelectField>
        <SelectField
          label="Tem trabalho em grupo?"
          value={values.groupWork ?? ''}
          onChange={(e) => setValues((v) => ({ ...v, groupWork: e.target.value as SubmitFeedbackInput['groupWork'] }))}
        >
          <option value="" disabled>
            Selecione
          </option>
          <option value="frequente">Frequente</option>
          <option value="raro">Raro</option>
          <option value="nao_tem">Não tem</option>
        </SelectField>
      </div>

      <TextareaField
        label="Comentário (opcional)"
        placeholder="Algo mais que os próximos alunos deveriam saber?"
        rows={3}
        value={values.comment ?? ''}
        onChange={(e) => setValues((v) => ({ ...v, comment: e.target.value }))}
      />

      {status === 'error' && <p className="text-13 text-danger mb-3">Não foi possível completar a ação. Tente novamente.</p>}

      <Button type="submit" block disabled={status === 'submitting' || status === 'deleting'}>
        {status === 'submitting' ? 'Enviando...' : hasExisting ? 'Atualizar opinião' : 'Enviar opinião'}
      </Button>

      {hasExisting && (
        <Button
          type="button"
          variant="ghost"
          block
          className="text-danger hover:bg-danger-tint mt-1"
          disabled={status === 'submitting' || status === 'deleting'}
          onClick={handleDelete}
        >
          {status === 'deleting' ? 'Excluindo...' : 'Excluir minha opinião'}
        </Button>
      )}
    </form>
  );
}
