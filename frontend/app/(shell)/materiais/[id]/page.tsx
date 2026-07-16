'use client';

import { ArrowLeft, Code2, Download, FileText, ThumbsUp, UserRound } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { redirect, useParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { useToast } from '@/components/Toast';
import { disciplineById, materials } from '@/data/mock';
import styles from './MaterialDetail.module.css';

const TYPE_LABEL: Record<string, string> = {
  prova: 'Prova anterior',
  resumo: 'Resumo',
  codigo: 'Código',
  trabalho: 'Trabalho',
};

const TYPE_GRADIENT: Record<string, string> = {
  prova: 'var(--gradient-cta)',
  resumo: 'var(--gradient-warm)',
  codigo: 'linear-gradient(135deg, var(--accent-3), var(--accent))',
  trabalho: 'linear-gradient(135deg, var(--accent-4), var(--accent-2))',
};

export default function MaterialDetail() {
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
      <Link href="/materiais" className={styles.back}>
        <ArrowLeft size={13} /> Materiais
      </Link>

      <div className={styles.layout}>
        <div className={styles.preview} style={{ background: TYPE_GRADIENT[material.type] }}>
          <div className={styles.previewPattern} />
          <Icon size={72} strokeWidth={1.25} style={{ position: 'relative' }} />
        </div>

        <div>
          <div className={styles.kicker} style={{ color: 'var(--accent-2-ink)' }}>
            {TYPE_LABEL[material.type]?.toUpperCase()} · {material.fileKind}
          </div>
          <h1 className={styles.title}>{material.title}</h1>
          <div className={styles.metaRow}>{discipline?.name}</div>

          <div className={styles.uploaderRow}>
            <UserRound size={15} />
            {material.anonymous ? 'Enviado anonimamente' : `Enviado por ${material.uploader}`}
          </div>

          <Button
            block
            onClick={() =>
              show(`Download iniciado — ${material.title}`)
            }
          >
            <Download size={16} /> Baixar arquivo
          </Button>

          <div className={styles.helpfulRow}>
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
            <span className={styles.helpfulCount}>{count} acharam útil</span>
          </div>
        </div>
      </div>
    </div>
  );
}
