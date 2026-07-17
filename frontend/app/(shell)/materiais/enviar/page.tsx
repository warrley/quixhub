'use client';

import { UnderConstruction } from '@/components/UnderConstruction';

import { Clock3 } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { SelectField, TextareaField } from '@/components/Field';
import { ModerationBadge } from '@/components/ModerationBadge';
import { UploadDropzone } from '@/components/UploadDropzone';
import { disciplines } from '@/data/mock';

export default function Upload() {
  if (process.env.NODE_ENV === 'production') {
    return <UnderConstruction />;
  }

  const [fileName, setFileName] = useState<string>();
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="max-w-[420px] flex flex-col items-center text-center py-10 gap-3">
        <div className="w-16 h-16 rounded-xl bg-gradient-warm flex items-center justify-center text-accent-2-ink shadow-glow-warm mb-2">
          <Clock3 size={26} />
        </div>
        <div className="font-heading font-bold text-lg">Material enviado!</div>
        <p className="text-13-5 text-ink-2 leading-[1.55]">
          Seu material entrou na fila de moderação e fica <strong>oculto para os outros alunos</strong> até ser
          aprovado. Isso costuma levar até 24h.
        </p>
        <ModerationBadge />
        <Link href="/materiais">
          <Button variant="secondary" className="mt-4">
            Voltar para materiais
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-heading font-bold text-22 my-2 mb-1">Enviar material</h1>
      <p className="text-13 text-ink-2 mb-6">Ajude a turma — todo envio passa por uma moderação rápida antes de ficar público.</p>

      <form
        className="max-w-[480px]"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
      >
        <div className="grid grid-cols-2 gap-4">
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

        <div className="mb-4">
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
