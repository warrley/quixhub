'use client';

import { UnderConstruction } from '@/components/UnderConstruction';

import { ArrowLeft, Code2, Download, FileText, ThumbsUp, UserRound } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { redirect, useParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import { disciplineById, materials } from '@/data/mock';

const TYPE_LABEL: Record<string, string> = {
  prova: 'Prova anterior',
  resumo: 'Resumo',
  codigo: 'Código',
  trabalho: 'Trabalho',
};

const TYPE_GRADIENT: Record<string, string> = {
  prova: 'var(--gradient-cta)',
  resumo: 'var(--gradient-warm)',
  codigo: 'linear-gradient(135deg, var(--color-accent-3), var(--color-accent))',
  trabalho: 'linear-gradient(135deg, var(--color-accent-4), var(--color-accent-2))',
};

export default function MaterialDetail() {
  if (process.env.NODE_ENV === 'production') {
    return <UnderConstruction />;
  }

  const params = useParams<{ id: string }>();
  const material = materials.find((m) => m.id === params.id);
  const { show } = useToast();
  const [helped, setHelped] = useState(false);
  const [count, setCount] = useState(material?.helpfulCount ?? 0);

  if (!material) redirect('/materiais');

  const discipline = disciplineById(material.disciplineId);
  const Icon = material.type === 'codigo' ? Code2 : FileText;

  return (
    <div>
      <Link href="/materiais" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-2 no-underline my-2 mb-5">
        <ArrowLeft size={13} /> Materiais
      </Link>

      <div className="grid grid-cols-1 gap-8 min-[800px]:grid-cols-[1.3fr_1fr]">
        <div
          className="aspect-[4/5] max-h-[460px] rounded-lg flex items-center justify-center text-white/90 shadow-lg relative overflow-hidden"
          style={{ background: TYPE_GRADIENT[material.type] }}
        >
          <div className="absolute inset-0 [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,0.08)_0_2px,transparent_2px_24px)]" />
          <Icon size={72} strokeWidth={1.25} style={{ position: 'relative' }} />
        </div>

        <div>
          <div className="font-heading font-bold text-11 mb-1.5" style={{ color: 'var(--color-accent-2-ink)' }}>
            {TYPE_LABEL[material.type]?.toUpperCase()} · {material.fileKind}
          </div>
          <h1 className="font-heading font-bold text-21 mb-2">{material.title}</h1>
          <div className="flex items-center gap-2.5 text-12-5 text-ink-2 mb-5">{discipline?.name}</div>

          <div className="flex items-center gap-2 text-12-5 text-ink-2 mb-5">
            <UserRound size={15} />
            {material.anonymous ? 'Enviado anonimamente' : `Enviado por ${material.uploader}`}
          </div>

          <Button block onClick={() => show(`Download iniciado — ${material.title}`)}>
            <Download size={16} /> Baixar arquivo
          </Button>

          <div className="flex items-center gap-3 mt-5">
            <Button
              variant={helped ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => {
                if (helped) return;
                setHelped(true);
                setCount((c) => c + 1);
                show('Obrigado pelo feedback!');
              }}
            >
              <ThumbsUp size={14} /> Isso me ajudou
            </Button>
            <span className="text-12-5 text-ink-2 font-semibold">{count} acharam útil</span>
          </div>
        </div>
      </div>
    </div>
  );
}
