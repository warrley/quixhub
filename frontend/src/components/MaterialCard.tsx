import { Code2, Download, FileText, ThumbsUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from './Card';
import type { Material } from '../data/types';
import styles from './MaterialCard.module.css';

const TYPE_LABEL: Record<Material['type'], string> = {
  prova: 'Prova anterior',
  resumo: 'Resumo',
  codigo: 'Código',
  trabalho: 'Trabalho',
};

const TYPE_TONE: Record<Material['type'], { bg: string; ink: string }> = {
  prova: { bg: 'var(--gradient-brand)', ink: 'var(--accent-dark)' },
  resumo: { bg: 'var(--gradient-warm)', ink: 'var(--accent-2-ink)' },
  codigo: { bg: 'linear-gradient(135deg, var(--accent-3), var(--accent))', ink: 'var(--accent-3-dark)' },
  trabalho: { bg: 'linear-gradient(135deg, var(--accent-4), var(--accent-2))', ink: 'var(--accent-4-dark)' },
};

export function MaterialCard({ material }: { material: Material }) {
  const tone = TYPE_TONE[material.type];
  const Icon = material.type === 'codigo' ? Code2 : FileText;
  return (
    <Card interactive padding="none">
      <Link to={`/materiais/${material.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className={styles.wrap}>
          <div className={styles.thumb} style={{ background: tone.bg }}>
            <Icon size={18} />
          </div>
          <div className={styles.info}>
            <div className={styles.kicker} style={{ color: tone.ink }}>
              {TYPE_LABEL[material.type].toUpperCase()} · {material.fileKind}
            </div>
            <div className={styles.title}>{material.title}</div>
            <div className={styles.meta}>
              <ThumbsUp size={11} />
              {material.helpfulCount} acharam útil
            </div>
          </div>
          <div className={styles.action}>
            <Download size={17} color="var(--ink-3)" />
          </div>
        </div>
      </Link>
    </Card>
  );
}
