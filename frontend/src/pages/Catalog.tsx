import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DisciplineCard } from '../components/DisciplineCard';
import { TagButton } from '../components/Tag';
import { disciplines } from '../data/mock';
import styles from './Catalog.module.css';

const FILTERS = ['2025.2', 'Professor', 'Semestre'];

export default function Catalog() {
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
      <div className={styles.header}>
        <h1 className={styles.title}>Catálogo — Engenharia de Software</h1>
        <p className={styles.subtitle}>Busque por disciplina, código ou professor.</p>
      </div>

      <div className={styles.searchRow}>
        <div className={styles.searchBar}>
          <Search size={16} />
          <input
            placeholder="Buscar disciplina ou código..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <TagButton key={f} tone={activeFilter === f ? 'selected' : 'outline'} onClick={() => setActiveFilter(f)}>
            {f}
          </TagButton>
        ))}
      </div>

      <div className={styles.grid}>
        {filtered.map((d) => (
          <DisciplineCard key={d.id} discipline={d} />
        ))}
      </div>
    </div>
  );
}
