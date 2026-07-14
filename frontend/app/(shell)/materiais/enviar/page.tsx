'use client';

import { Clock3 } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { SelectField, TextareaField } from '@/components/Field';
import { ModerationBadge } from '@/components/ModerationBadge';
import { UploadDropzone } from '@/components/UploadDropzone';
import { disciplines } from '@/data/mock';
import styles from './Upload.module.css';

export default function Upload() {
  const [fileName, setFileName] = useState<string>();
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className={styles.pendingWrap}>
        <div className={styles.pendingIcon}>
          <Clock3 size={26} />
        </div>
        <div className={styles.pendingTitle}>Material enviado!</div>
        <p className={styles.pendingDesc}>
          Seu material entrou na fila de moderação e fica <strong>oculto para os outros alunos</strong> até ser
          aprovado. Isso costuma levar até 24h.
        </p>
        <ModerationBadge />
        <Link href="/materiais">
          <Button variant="secondary" style={{ marginTop: 16 }}>
            Voltar para materiais
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className={styles.title}>Enviar material</h1>
      <p className={styles.subtitle}>Ajude a turma — todo envio passa por uma moderação rápida antes de ficar público.</p>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <div className={styles.row2}>
          <SelectField label="Disciplina" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {disciplines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Tipo" required defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            <option value="prova">Prova anterior</option>
            <option value="resumo">Resumo</option>
            <option value="codigo">Código</option>
            <option value="trabalho">Trabalho</option>
          </SelectField>
        </div>

        <div className={styles.dropzoneWrap}>
          <UploadDropzone fileName={fileName} onFile={(f) => setFileName(f.name)} />
        </div>

        <TextareaField label="Nota (opcional)" placeholder="Algum contexto sobre o material?" rows={3} />

        <Button type="submit" block disabled={!fileName}>
          Enviar para moderação
        </Button>
      </form>
    </div>
  );
}
