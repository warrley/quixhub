import type { Discipline, FluxogramaEdge } from '@/data/types';

const DIACRITICS = /[̀-ͯ]/g;

function normalize(s: string) {
  return s.trim().toLowerCase().normalize('NFD').replace(DIACRITICS, '');
}

/**
 * Discipline.prerequisites stores free-text names, not IDs, and current mock
 * data already has orphan names with no matching Discipline.name (e.g.
 * "Introdução à Programação"). Unresolvable names are silently skipped —
 * that's expected, not a parsing bug.
 */
export function deriveCatalogEdges(disciplines: Discipline[]): FluxogramaEdge[] {
  const byName = new Map(disciplines.map((d) => [normalize(d.name), d.id]));
  const edges: FluxogramaEdge[] = [];
  const unresolved: string[] = [];

  for (const d of disciplines) {
    for (const prereqName of d.prerequisites) {
      const sourceId = byName.get(normalize(prereqName));
      if (!sourceId) {
        unresolved.push(prereqName);
        continue;
      }
      edges.push({
        id: `edge:${sourceId}->${d.id}`,
        source: `disc:${sourceId}`,
        target: `disc:${d.id}`,
        origin: 'catalog',
      });
    }
  }

  if (unresolved.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn('[fluxograma] unresolved prerequisite names:', unresolved);
  }

  return edges;
}
