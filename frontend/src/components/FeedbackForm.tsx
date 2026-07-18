'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from './Button';
import { SelectField, TextareaField } from './Field';
import { TagButton } from './Tag';
import { api, type SubmitFeedbackInput } from '../lib/api';

const SCALES: { key: 'materialQuality' | 'examDifficulty' | 'workDifficulty'; label: string; low: string; high: string }[] = [
  { key: 'materialQuality', label: 'Qualidade do material', low: 'Péssimo', high: 'Excelente' },
  { key: 'examDifficulty', label: 'Nível das provas', low: 'Tranquilo', high: 'Muito difícil' },
  { key: 'workDifficulty', label: 'Nível dos trabalhos', low: 'Leve', high: 'Muito pesado' },
];

export function FeedbackForm({ offeringId, onSubmitted }: { offeringId: string; onSubmitted: () => void }) {
  const [values, setValues] = useState<SubmitFeedbackInput>({});
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error' | 'unauthenticated'>('idle');

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
      const message = err instanceof Error ? err.message : '';
      setStatus(message.includes('401') || message.toLowerCase().includes('not authenticated') ? 'unauthenticated' : 'error');
    }
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

      {status === 'unauthenticated' && (
        <p className="text-13 text-danger mb-3">
          Faça <Link href="/login" className="underline font-semibold">login</Link> para enviar sua opinião.
        </p>
      )}
      {status === 'error' && <p className="text-13 text-danger mb-3">Não foi possível enviar. Tente novamente.</p>}

      <Button type="submit" block disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Enviando...' : 'Enviar opinião'}
      </Button>
    </form>
  );
}
