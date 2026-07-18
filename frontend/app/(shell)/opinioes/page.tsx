'use client';

import { UnderConstruction } from '@/components/UnderConstruction';

import { MessageSquare, Search } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { MiniBars } from '@/components/MiniBars';
import { CardSkeleton } from '@/components/Skeleton';
import { Tag } from '@/components/Tag';
import { ACCENT_VAR } from '@/lib/accent';
import { api } from '@/lib/api';
import { summarizeProfessor } from '@/lib/feedbackSummary';
import type { DisciplineProfessorStats, OfferingSearchResult } from '@/data/types';

interface ProfessorRow {
  professor: string;
  // one entry per offering (semester) of this professor+discipline, newest first
  semesters: { offeringId: string; semester: string }[];
  stats?: DisciplineProfessorStats['stats'];
}

interface DisciplineGroup {
  disciplineId: string;
  disciplineName: string;
  disciplineCode: string;
  disciplineAccent: OfferingSearchResult['disciplineAccent'];
  professors: ProfessorRow[];
}

export default function Opinioes() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [results, setResults] = useState<OfferingSearchResult[]>([]);
  const [statsByDiscipline, setStatsByDiscipline] = useState<Record<string, DisciplineProfessorStats[]>>({});
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    setLoading(true);
    api
      .searchOfferings(debouncedQuery)
      .then(setResults)
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  // Groups by discipline, then by professor within it — a professor teaching
  // the same discipline across several semesters is ONE row (the "geral"
  // level), with each semester as a separate, clickable pill (the specific
  // offering level). Never one row per raw offering, or the same professor
  // would repeat once per semester they've taught it.
  const groups = useMemo<DisciplineGroup[]>(() => {
    const byDiscipline = new Map<
      string,
      { disciplineName: string; disciplineCode: string; disciplineAccent: OfferingSearchResult['disciplineAccent']; byProfessor: Map<string, ProfessorRow> }
    >();

    for (const o of results) {
      const disciplineEntry = byDiscipline.get(o.disciplineId) ?? {
        disciplineName: o.disciplineName,
        disciplineCode: o.disciplineCode,
        disciplineAccent: o.disciplineAccent,
        byProfessor: new Map<string, ProfessorRow>(),
      };
      const professorRow = disciplineEntry.byProfessor.get(o.professor) ?? { professor: o.professor, semesters: [] };
      professorRow.semesters.push({ offeringId: o.id, semester: o.semester });
      disciplineEntry.byProfessor.set(o.professor, professorRow);
      byDiscipline.set(o.disciplineId, disciplineEntry);
    }

    return [...byDiscipline.entries()]
      .map(([disciplineId, { disciplineName, disciplineCode, disciplineAccent, byProfessor }]) => ({
        disciplineId,
        disciplineName,
        disciplineCode,
        disciplineAccent,
        professors: [...byProfessor.values()]
          .map((p) => ({ ...p, semesters: [...p.semesters].sort((a, b) => b.semester.localeCompare(a.semester)) }))
          .sort((a, b) => a.professor.localeCompare(b.professor)),
      }))
      .sort((a, b) => a.disciplineName.localeCompare(b.disciplineName));
  }, [results]);

  // Most-discussed disciplines first — recomputed whenever stats arrive, since
  // `groups` above is ordered alphabetically and knows nothing about review counts.
  const sortedGroups = useMemo(() => {
    const reviewCount = (g: DisciplineGroup) =>
      (statsByDiscipline[g.disciplineId] ?? []).reduce((sum, s) => sum + s.stats.totalReviews, 0);
    return [...groups].sort((a, b) => reviewCount(b) - reviewCount(a));
  }, [groups, statsByDiscipline]);

  // Gates the skeleton until every visible discipline's stats have loaded, so
  // the list never flashes in alphabetical order before jumping to the
  // most-opinions sort once `sortedGroups` can finally tell them apart.
  useEffect(() => {
    const missing = groups.map((g) => g.disciplineId).filter((id) => !(id in statsByDiscipline));
    if (missing.length === 0) {
      setStatsLoading(false);
      return;
    }
    setStatsLoading(true);
    api.getDisciplineStatsBulk(missing).then((stats) => {
      setStatsByDiscipline((prev) => ({ ...prev, ...stats }));
      setStatsLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  const showSkeleton = loading || statsLoading;

  return (
    <div>
      <div className="my-2 mb-5">
        <h1 className="font-heading font-bold text-22 mb-1">Opiniões</h1>
        <p className="text-13 text-ink-2">Como é a disciplina com cada professor — estruturado e anônimo.</p>
      </div>

      <div className="flex gap-2.5 mb-6 flex-wrap">
        <div className="flex-1 min-w-[220px] flex items-center gap-2.5 border border-line bg-surface rounded-md py-11px px-15px text-ink-3">
          <Search size={16} />
          <input
            placeholder="Buscar disciplina ou professor..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-none outline-none bg-transparent flex-1 font-body text-13-5 text-ink"
          />
        </div>
      </div>

      {showSkeleton && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}

      {!showSkeleton && groups.length === 0 && (
        <div className="flex flex-col items-center text-center py-14 gap-3">
          <MessageSquare size={32} className="text-ink-3" />
          <p className="text-13-5 text-ink-2">Nenhuma opinião ainda — seja o primeiro!</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {!showSkeleton && sortedGroups.map((group) => {
          const stats = statsByDiscipline[group.disciplineId] ?? [];
          const statsByProfessor = new Map(stats.map((s) => [s.professor, s]));
          return (
            <Card key={group.disciplineId} padding="md" accent={ACCENT_VAR[group.disciplineAccent]}>
              <div className="flex justify-between items-baseline mb-3">
                <div className="font-heading font-bold text-14-5">{group.disciplineName}</div>
                <div className="text-10-5 font-semibold text-ink-3">{group.disciplineCode}</div>
              </div>
              <div className="flex flex-col gap-2">
                {group.professors.map((p) => {
                  const s = statsByProfessor.get(p.professor);
                  const generalHref = `/opinioes/professor/${group.disciplineId}?professor=${encodeURIComponent(p.professor)}`;
                  return (
                    <div
                      key={p.professor}
                      className="border border-line rounded-md py-2.5 px-3 [transition:box-shadow_0.18s_ease,border-color_0.18s_ease,transform_0.18s_ease] hover:shadow-md hover:border-line-strong hover:-translate-y-0.5"
                    >
                      <Link href={generalHref} className="block no-underline text-inherit cursor-pointer">
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="font-semibold text-13">{p.professor}</div>
                          <Tag tone="neutral">{s ? `${s.stats.totalReviews} opiniões` : 'Sem opiniões ainda'}</Tag>
                        </div>
                        {s && (
                          <div className="mt-2.5">
                            <p className="text-11-5 text-ink-2 mb-2">{summarizeProfessor(s.stats)}</p>
                            <MiniBars stats={s.stats} />
                          </div>
                        )}
                      </Link>
                      {p.semesters.length > 1 && (
                        <div className="flex gap-1.5 flex-wrap mt-2 pt-2 border-t border-line">
                          {p.semesters.map((sem) => (
                            <Link key={sem.offeringId} href={`/opinioes/${sem.offeringId}`}>
                              <Tag tone="outline">{sem.semester}</Tag>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
