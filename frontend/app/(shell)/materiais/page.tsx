'use client';

import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { MaterialCard } from '@/components/MaterialCard';
import { TagButton } from '@/components/Tag';
import { disciplineById, materials } from '@/data/mock';
import type { MaterialType } from '@/data/types';
import styles from './Materials.module.css';

const TYPE_FILTERS: { value: MaterialType | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'prova', label: 'Provas' },
  { value: 'resumo', label: 'Resumos' },
  { value: 'codigo', label: 'Código' },
  { value: 'trabalho', label: 'Trabalhos' },
];

export default function Materials() {
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
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Materiais</h1>
          <p className={styles.subtitle}>Provas, resumos e código enviados pela turma.</p>
        </div>
        <Link href="/materiais/enviar">
          <Button>
            <Plus size={16} /> Enviar material
          </Button>
        </Link>
      </div>

      <div className={styles.filters}>
        {TYPE_FILTERS.map((f) => (
          <TagButton key={f.value} tone={type === f.value ? 'selected' : 'outline'} onClick={() => setType(f.value)}>
            {f.label}
          </TagButton>
        ))}
      </div>
      <div className={styles.sortRow}>Ordenar por: mais úteis</div>

      {grouped.map(([disciplineId, items]) => {
        const discipline = disciplineById(disciplineId);
        return (
          <div key={disciplineId}>
            <div className={styles.groupTitle}>{discipline?.name ?? disciplineId}</div>
            <div className={styles.list}>
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
