import { BookOpen, Star } from 'lucide-react';
import Link from 'next/link';
import { Card } from './Card';
import type { Discipline } from '../data/types';

const ACCENT_VAR: Record<Discipline['accent'], string> = {
  accent: 'var(--gradient-brand)',
  accent2: 'var(--gradient-warm)',
  accent3: 'linear-gradient(180deg, var(--color-accent-3), var(--color-accent))',
  accent4: 'linear-gradient(180deg, var(--color-accent-4), var(--color-accent-2))',
};

const RATING_TONE: Record<Discipline['accent'], string> = {
  accent: 'var(--color-accent)',
  accent2: 'var(--color-accent-2-ink)',
  accent3: 'var(--color-accent-3)',
  accent4: 'var(--color-accent-4)',
};

export function DisciplineCard({ discipline }: { discipline: Discipline }) {
  return (
    <Link href={`/catalogo/${discipline.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <Card interactive padding="none" accent={ACCENT_VAR[discipline.accent]}>
        <div className="flex flex-col gap-2.5 py-4 pr-4 pl-[18px]">
          <div className="flex justify-between items-start gap-2">
            <div className="font-heading font-bold text-14-5 text-ink">{discipline.name}</div>
            <div className="font-body font-semibold text-10-5 text-ink-3 whitespace-nowrap">{discipline.code}</div>
          </div>
          <div className="text-xs text-ink-2">{discipline.professor}</div>
          <div className="flex justify-between items-center">
            <span className="text-11-5 font-semibold text-ink-2 flex items-center gap-5px">
              <BookOpen size={13} />
              {discipline.materialsCount} materiais
            </span>
            <span className="text-11-5 font-bold flex items-center gap-3px" style={{ color: RATING_TONE[discipline.accent] }}>
              <Star size={13} fill="currentColor" strokeWidth={0} />
              {discipline.rating.toFixed(1)}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
