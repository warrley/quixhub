import { BookOpen, Star } from 'lucide-react';
import Link from 'next/link';
import { Card } from './Card';
import type { Discipline } from '../data/types';
import styles from './DisciplineCard.module.css';

const ACCENT_VAR: Record<Discipline['accent'], string> = {
  accent: 'var(--gradient-brand)',
  accent2: 'var(--gradient-warm)',
  accent3: 'linear-gradient(180deg, var(--accent-3), var(--accent))',
  accent4: 'linear-gradient(180deg, var(--accent-4), var(--accent-2))',
};

const RATING_TONE: Record<Discipline['accent'], string> = {
  accent: 'var(--accent)',
  accent2: 'var(--accent-2-ink)',
  accent3: 'var(--accent-3)',
  accent4: 'var(--accent-4)',
};

export function DisciplineCard({ discipline }: { discipline: Discipline }) {
  return (
    <Link href={`/catalogo/${discipline.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Card interactive padding="none" accent={ACCENT_VAR[discipline.accent]}>
        <div className={styles.wrap}>
          <div className={styles.top}>
            <div className={styles.name}>{discipline.name}</div>
            <div className={styles.code}>{discipline.code}</div>
          </div>
          <div className={styles.professor}>{discipline.professor}</div>
          <div className={styles.bottom}>
            <span className={styles.count}>
              <BookOpen size={13} />
              {discipline.materialsCount} materiais
            </span>
            <span className={styles.rating} style={{ color: RATING_TONE[discipline.accent] }}>
              <Star size={13} fill="currentColor" strokeWidth={0} />
              {discipline.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
