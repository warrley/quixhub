import { BookOpen, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { ACCENT_VAR } from '@/lib/accent';
import { Card } from './Card';
import type { Discipline } from '../data/types';

export function DisciplineCard({ discipline }: { discipline: Discipline }) {
  return (
    <Link href={`/catalogo/${discipline.id}`} className="block h-full" style={{ textDecoration: 'none', color: 'inherit' }}>
      <Card interactive padding="none" accent={ACCENT_VAR[discipline.accent]} className="h-full">
        <div className="flex flex-col justify-between gap-2.5 py-4 pr-4 pl-5 h-full">
          <div className="flex justify-between items-start gap-2">
            <div className="font-heading font-bold text-14-5 text-ink">{discipline.name}</div>
            <div className="font-body font-semibold text-10-5 text-ink-3 whitespace-nowrap">{discipline.code}</div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-11-5 font-semibold text-ink-2 flex items-center gap-5px">
              <BookOpen size={13} />
              {discipline.materialsCount} materiais
            </span>
            <span className="text-11-5 font-semibold text-ink-2 flex items-center gap-5px">
              <MessageSquare size={13} />
              {discipline.responses} opiniões
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
