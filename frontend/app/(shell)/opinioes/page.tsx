'use client';

import { UnderConstruction } from '@/components/UnderConstruction';

import { MessageSquare, Search, Star } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { Tag } from '@/components/Tag';
import { api } from '@/lib/api';
import type { DisciplineProfessorStats, OfferingSearchResult } from '@/data/types';

function professorScore(stats: DisciplineProfessorStats['stats']) {
  const values = [stats.materialQuality, stats.examDifficulty, stats.workDifficulty].filter((v) => v > 0);
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

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
  professors: ProfessorRow[];
}

export default function Opinioes() {
  if (process.env.NODE_ENV === 'production') {
    return <UnderConstruction />;
  }

  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OfferingSearchResult[]>([]);
  const [statsByDiscipline, setStatsByDiscipline] = useState<Record<string, DisciplineProfessorStats[]>>({});
  const [loading, setLoading] = useState(true);

  const disciplineFilter = searchParams.get('discipline');
  const professorFilter = searchParams.get('professor');

  useEffect(() => {
    setLoading(true);
    api
      .searchOfferings(query)
      .then(setResults)
      .finally(() => setLoading(false));
  }, [query]);

  // Groups by discipline, then by professor within it — a professor teaching
  // the same discipline across several semesters is ONE row (the "geral"
  // level), with each semester as a separate, clickable pill (the specific
  // offering level). Never one row per raw offering, or the same professor
  // would repeat once per semester they've taught it.
  const groups = useMemo<DisciplineGroup[]>(() => {
    let filtered = disciplineFilter ? results.filter((o) => o.disciplineId === disciplineFilter) : results;
    if (professorFilter) filtered = filtered.filter((o) => o.professor === professorFilter);
    const byDiscipline = new Map<string, { disciplineName: string; disciplineCode: string; byProfessor: Map<string, ProfessorRow> }>();

    for (const o of filtered) {
      const disciplineEntry = byDiscipline.get(o.disciplineId) ?? {
        disciplineName: o.disciplineName,
        disciplineCode: o.disciplineCode,
        byProfessor: new Map<string, ProfessorRow>(),
      };
      const professorRow = disciplineEntry.byProfessor.get(o.professor) ?? { professor: o.professor, semesters: [] };
      professorRow.semesters.push({ offeringId: o.id, semester: o.semester });
      disciplineEntry.byProfessor.set(o.professor, professorRow);
      byDiscipline.set(o.disciplineId, disciplineEntry);
    }

    return [...byDiscipline.entries()]
      .map(([disciplineId, { disciplineName, disciplineCode, byProfessor }]) => ({
        disciplineId,
        disciplineName,
        disciplineCode,
        professors: [...byProfessor.values()]
          .map((p) => ({ ...p, semesters: [...p.semesters].sort((a, b) => b.semester.localeCompare(a.semester)) }))
          .sort((a, b) => a.professor.localeCompare(b.professor)),
      }))
      .sort((a, b) => a.disciplineName.localeCompare(b.disciplineName));
  }, [results, disciplineFilter, professorFilter]);

  useEffect(() => {
    const missing = groups.map((g) => g.disciplineId).filter((id) => !(id in statsByDiscipline));
    if (missing.length === 0) return;
    Promise.all(missing.map((id) => api.getDisciplineStats(id).then((stats) => [id, stats] as const))).then((entries) => {
      setStatsByDiscipline((prev) => {
        const next = { ...prev };
        for (const [id, stats] of entries) next[id] = stats;
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

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

      {!loading && groups.length === 0 && (
        <div className="flex flex-col items-center text-center py-14 gap-3">
          <MessageSquare size={32} className="text-ink-3" />
          <p className="text-13-5 text-ink-2">Nenhuma opinião ainda — seja o primeiro!</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {groups.map((group) => {
          const stats = statsByDiscipline[group.disciplineId] ?? [];
          const statsByProfessor = new Map(stats.map((s) => [s.professor, s]));
          return (
            <Card key={group.disciplineId} padding="md">
              <div className="flex justify-between items-baseline mb-3">
                <div className="font-heading font-bold text-14-5">{group.disciplineName}</div>
                <div className="text-10-5 font-semibold text-ink-3">{group.disciplineCode}</div>
              </div>
              <div className="flex flex-col gap-2">
                {group.professors.map((p) => {
                  const s = statsByProfessor.get(p.professor);
                  // No stats yet (no feedback for any of this professor's offerings) —
                  // still land somewhere useful: their most recent semester's offering.
                  const defaultHref = `/opinioes/${p.semesters[0].offeringId}`;
                  return (
                    <div key={p.professor} className="border border-line rounded-md py-2.5 px-3">
                      <Link href={defaultHref} className="flex items-center justify-between gap-2.5 no-underline text-inherit">
                        <div>
                          <div className="font-semibold text-13">{p.professor}</div>
                          <div className="flex gap-1.5 mt-1">
                            {s ? (
                              <>
                                <Tag tone="neutral">{s.stats.totalReviews} opiniões</Tag>
                                {s.stats.attendance && <Tag tone="outline">{s.stats.attendance}</Tag>}
                              </>
                            ) : (
                              <Tag tone="neutral">Sem opiniões ainda</Tag>
                            )}
                          </div>
                        </div>
                        {s && (
                          <span className="text-12-5 font-bold flex items-center gap-3px text-accent shrink-0">
                            <Star size={13} fill="currentColor" strokeWidth={0} />
                            {professorScore(s.stats).toFixed(1)}
                          </span>
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
