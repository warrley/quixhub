'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { SelectField, TextField } from '@/components/Field';
import { UploadDropzone } from '@/components/UploadDropzone';
import { useToast } from '@/components/Toast';
import { disciplines } from '@/data/mock';
import type { IraEntry } from '@/data/types';
import { computeIra } from '@/lib/ira';
import { useIra } from '@/lib/iraStore';
import styles from './Ira.module.css';

type DraftEntry = Omit<IraEntry, 'id'>;

const SITUACAO_LABEL: Record<NonNullable<IraEntry['situacao']>, string> = {
  aprovado: 'Aprovado',
  reprovado: 'Reprovado',
  em_andamento: 'Em andamento',
  outro: 'Outro',
};

function emptyDraft(): DraftEntry {
  return { disciplineName: '', grade: 0, workload: 0, situacao: 'aprovado', source: 'manual' };
}

export default function Ira() {
  const { state, ira, addEntry, addEntries, removeEntry } = useIra();
  const { show } = useToast();

  const [draft, setDraft] = useState<DraftEntry>(emptyDraft());
  const [customName, setCustomName] = useState(false);

  const [fileName, setFileName] = useState<string>();
  const [parsing, setParsing] = useState(false);
  const [review, setReview] = useState<DraftEntry[] | null>(null);
  const [printedIra, setPrintedIra] = useState<number | undefined>();

  const previewIra = review ? computeIra(review.map((e, i) => ({ ...e, id: `preview-${i}` }))) : null;

  function handleAddManual() {
    if (!draft.disciplineName || draft.workload <= 0) return;
    addEntry(draft);
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
    addEntries(review);
    setReview(null);
    setFileName(undefined);
    setPrintedIra(undefined);
    show('Histórico importado com sucesso!');
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Calculadora de IRA</h1>
        <p className={styles.subtitle}>
          Calculado localmente a partir das disciplinas que você informar — os dados ficam apenas no seu navegador.
        </p>
      </div>

      <div className={styles.statRow}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{ira !== null ? ira.toFixed(4) : '—'}</div>
          <div className={styles.statLabel}>IRA calculado (aproximado)</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{state.entries.length}</div>
          <div className={styles.statLabel}>disciplinas salvas</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{state.entries.reduce((s, e) => s + e.workload, 0)}h</div>
          <div className={styles.statLabel}>carga horária total</div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Adicionar disciplina manualmente</div>
        <div className={styles.row3}>
          {customName ? (
            <TextField
              label="Disciplina"
              placeholder="Nome da disciplina"
              value={draft.disciplineName}
              onChange={(e) => setDraft((d) => ({ ...d, disciplineName: e.target.value }))}
            />
          ) : (
            <SelectField
              label="Disciplina"
              value={draft.disciplineName}
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
              {disciplines.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
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
            value={draft.grade || ''}
            onChange={(e) => setDraft((d) => ({ ...d, grade: Number(e.target.value) }))}
          />
          <TextField
            label="CH"
            type="number"
            min={0}
            step={1}
            value={draft.workload || ''}
            onChange={(e) => setDraft((d) => ({ ...d, workload: Number(e.target.value) }))}
          />
          <Button onClick={handleAddManual} disabled={!draft.disciplineName || draft.workload <= 0}>
            Adicionar
          </Button>
        </div>

        <div className={styles.table}>
          {state.entries.length === 0 ? (
            <div className={styles.empty}>Nenhuma disciplina adicionada ainda.</div>
          ) : (
            state.entries.map((e) => (
              <div key={e.id} className={styles.entryRow}>
                <span>{e.disciplineName}</span>
                <span>{e.grade}</span>
                <span>{e.workload}h</span>
                <span className={styles.badge}>{SITUACAO_LABEL[e.situacao ?? 'outro']}</span>
                <Button variant="ghost" size="icon" onClick={() => removeEntry(e.id)} aria-label="Remover">
                  <Trash2 size={16} />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Importar histórico (PDF)</div>
        <UploadDropzone fileName={parsing ? 'Lendo PDF...' : fileName} onFile={handleFile} accept="application/pdf" />

        {review && review.length > 0 && (
          <>
            <div className={styles.sectionTitle} style={{ marginTop: 20 }}>
              Revisar antes de salvar ({review.length} disciplinas · IRA prévio: {previewIra?.toFixed(4) ?? '—'})
            </div>
            {printedIra !== undefined && (
              <div className={styles.printedIra}>
                Valor impresso no histórico: {printedIra} — o QuixHub calcula o seu de forma independente e permite
                ajustes.
              </div>
            )}
            <div className={styles.table}>
              {review.map((e, i) => (
                <div key={i} className={styles.entryRow}>
                  <TextField value={e.disciplineName} onChange={(ev) => updateReviewRow(i, { disciplineName: ev.target.value })} />
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
                  <span className={styles.badge}>{SITUACAO_LABEL[e.situacao ?? 'outro']}</span>
                  <Button variant="ghost" size="icon" onClick={() => removeReviewRow(i)} aria-label="Remover">
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
            <Button block onClick={confirmReview} style={{ marginTop: 12 }}>
              Confirmar e salvar
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
