'use client';

import { UnderConstruction } from '@/components/UnderConstruction';

import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { MaterialCard } from '@/components/MaterialCard';
import { TagButton } from '@/components/Tag';
import { disciplineById, materials } from '@/data/mock';
import type { MaterialType } from '@/data/types';

const TYPE_FILTERS: { value: MaterialType | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'prova', label: 'Provas' },
  { value: 'resumo', label: 'Resumos' },
  { value: 'codigo', label: 'Código' },
  { value: 'trabalho', label: 'Trabalhos' },
];

export default function Materials() {
  if (process.env.NODE_ENV === 'production') {
    return <UnderConstruction />;
  }

  const [type, setType] = useState<MaterialType | 'todos'>('todos');

  const published = useMemo(
    () => materials.filter((m) => m.status === 'published' && (type === 'todos' || m.type === type)),
    [type],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof published>();
    for (const m of published) {
      const list = map.get(m.disciplineId) ?? [];
      list.push(m);
      map.set(m.disciplineId, list);
    }
    return Array.from(map.entries());
  }, [published]);

  return (
    <div>
      <div className="flex justify-between items-start gap-4 my-2 mb-5 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-22 mb-1">Materiais</h1>
          <p className="text-13 text-ink-2">Provas, resumos e código enviados pela turma.</p>
        </div>
        <Link href="/materiais/enviar">
          <Button>
            <Plus size={16} /> Enviar material
          </Button>
        </Link>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-3">
        {TYPE_FILTERS.map((f) => (
          <TagButton key={f.value} tone={type === f.value ? 'selected' : 'outline'} onClick={() => setType(f.value)}>
            {f.label}
          </TagButton>
        ))}
      </div>
      <div className="text-xs font-medium text-ink-3 mb-5">Ordenar por: mais úteis</div>

      {grouped.map(([disciplineId, items]) => {
        const discipline = disciplineById(disciplineId);
        return (
          <div key={disciplineId}>
            <div className="font-heading font-bold text-12-5 text-ink-2 my-5 mb-2">{discipline?.name ?? disciplineId}</div>
            <div className="flex flex-col gap-9px">
              {items.map((m) => (
                <MaterialCard key={m.id} material={m} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
