'use client';

import { UnderConstruction } from '@/components/UnderConstruction';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DisciplineCard } from '@/components/DisciplineCard';
import { TagButton } from '@/components/Tag';
import { disciplines } from '@/data/mock';

const FILTERS = ['2025.2', 'Professor', 'Semestre'];

export default function Catalog() {
  if (process.env.NODE_ENV === 'production') {
    return <UnderConstruction />;
  }

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('2025.2');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return disciplines;
    return disciplines.filter(
      (d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q) || d.professor.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div>
      <div className="my-2 mb-5">
        <h1 className="font-heading font-bold text-22 mb-1">Catálogo — Engenharia de Software</h1>
        <p className="text-13 text-ink-2">Busque por disciplina, código ou professor.</p>
      </div>

      <div className="flex gap-2.5 mb-3 flex-wrap">
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

      <div className="flex gap-1.5 flex-wrap mb-6">
        {FILTERS.map((f) => (
          <TagButton key={f} tone={activeFilter === f ? 'selected' : 'outline'} onClick={() => setActiveFilter(f)}>
            {f}
          </TagButton>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 min-[1000px]:grid-cols-3 gap-4">
        {filtered.map((d) => (
          <DisciplineCard key={d.id} discipline={d} />
        ))}
      </div>
    </div>
  );
}
