'use client';

import { UnderConstruction } from '@/components/UnderConstruction';

import { Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DisciplineCard } from '@/components/DisciplineCard';
import { CardSkeleton } from '@/components/Skeleton';
import { api } from '@/lib/api';
import type { Discipline } from '@/data/types';

export default function Catalog() {
  if (process.env.NODE_ENV === 'production') {
    return <UnderConstruction />;
  }

  const [query, setQuery] = useState('');
  const [disciplines, setDisciplines] = useState<Discipline[] | null>(null);

  useEffect(() => {
    api
      .getDisciplines()
      .then(setDisciplines)
      .catch(() => setDisciplines([]));
  }, []);

  const filtered = useMemo(() => {
    if (!disciplines) return [];
    const q = query.trim().toLowerCase();
    const matches = q ? disciplines.filter((d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)) : disciplines;
    // Most-active first — materials and opinions both count as "engagement".
    return [...matches].sort((a, b) => (b.materialsCount + b.responses) - (a.materialsCount + a.responses));
  }, [disciplines, query]);

  return (
    <div>
      <div className="my-2 mb-5">
        <h1 className="font-heading font-bold text-22 mb-1">Catálogo</h1>
        <p className="text-13 text-ink-2">Busque por disciplina ou código.</p>
      </div>

      <div className="flex gap-2.5 mb-6 flex-wrap">
        <div className="flex-1 min-w-[220px] flex items-center gap-2.5 border border-line bg-surface rounded-md py-11px px-15px text-ink-3">
          <Search size={16} />
          <input
            placeholder="Buscar disciplina ou código..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-none outline-none bg-transparent flex-1 font-body text-13-5 text-ink"
          />
        </div>
      </div>

      {disciplines === null && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {disciplines !== null && filtered.length === 0 && (
        <p className="text-13 text-ink-2 py-10 text-center">Nenhuma disciplina encontrada.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((d) => (
          <DisciplineCard key={d.id} discipline={d} />
        ))}
      </div>
    </div>
  );
}
