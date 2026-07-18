'use client';

import { UnderConstruction } from '@/components/UnderConstruction';

import { ArrowLeft, ArrowRight, Plus, Star } from 'lucide-react';
import Link from 'next/link';
import { redirect, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { MaterialCard } from '@/components/MaterialCard';
import { api } from '@/lib/api';
import type { Discipline, DisciplineProfessorStats, Material } from '@/data/types';

const ACCENT_GRADIENT: Record<string, string> = {
  accent: 'var(--gradient-cta)',
  accent2: 'var(--gradient-warm)',
  accent3: 'linear-gradient(135deg, var(--color-accent-3), var(--color-accent))',
  accent4: 'linear-gradient(135deg, var(--color-accent-4), var(--color-accent-2))',
};

function professorScore(stats: DisciplineProfessorStats['stats']) {
  const values = [stats.materialQuality, stats.examDifficulty, stats.workDifficulty].filter((v) => v > 0);
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export default function DisciplineDetail() {
  if (process.env.NODE_ENV === 'production') {
    return <UnderConstruction />;
  }

  const params = useParams<{ id: string }>();
  const [discipline, setDiscipline] = useState<Discipline | null | undefined>(undefined);
  const [professors, setProfessors] = useState<DisciplineProfessorStats[]>([]);
  const [relatedMaterials, setRelatedMaterials] = useState<Material[]>([]);
  const [tracked, setTracked] = useState(false);

  useEffect(() => {
    api
      .getDiscipline(params.id)
      .then(setDiscipline)
      .catch(() => setDiscipline(null));
    api
      .getDisciplineStats(params.id)
      .then(setProfessors)
      .catch(() => setProfessors([]));
    api
      .getMaterialsByDiscipline(params.id)
      .then(setRelatedMaterials)
      .catch(() => setRelatedMaterials([]));
  }, [params.id]);

  if (discipline === null) redirect('/catalogo');
  if (discipline === undefined) return null;

  return (
    <div>
      <div
        className="h-[150px] rounded-lg relative flex items-end py-5 px-6 my-2 mb-6 overflow-hidden text-white before:content-[''] before:absolute before:inset-0 before:[background:radial-gradient(120%_160%_at_100%_0%,oklch(100%_0_0_/_18%),transparent_60%)]"
        style={{ background: ACCENT_GRADIENT[discipline.accent] }}
      >
        <Link href="/catalogo" className="absolute top-4 left-5 text-xs font-semibold text-white/90 no-underline flex items-center gap-1">
          <ArrowLeft size={13} /> Catálogo
        </Link>
        <div className="w-14 h-14 rounded-md bg-white/22 border-1-5 border-white/50 flex items-center justify-center font-heading font-bold text-xl relative z-[1]">
          {discipline.name
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 min-[860px]:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="font-heading font-bold text-11 text-accent-2-ink mb-1.5">{discipline.code}</div>
          <h1 className="font-heading font-bold text-2xl mb-1.5">{discipline.name}</h1>
          <div className="text-13 text-ink-2 mb-4">{discipline.workload}h</div>
          <p className="text-13-5 leading-[1.6] text-ink-2 mb-5">{discipline.description}</p>

          <div className="font-heading font-bold text-12-5 mb-1.5">Pré-requisitos</div>
          <div className="text-13 text-ink-2 mb-6">{discipline.prerequisites.join(', ') || 'Nenhum'}</div>

          <div className="font-heading font-bold text-12-5 mb-1.5">Materiais recentes</div>
          <div className="flex flex-col gap-2">
            {relatedMaterials.length === 0 && <p className="text-13 text-ink-2">Nenhum material publicado ainda.</p>}
            {relatedMaterials.map((m) => (
              <MaterialCard key={m.id} material={m} />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-6">
            <Button block variant={tracked ? 'secondary' : 'primary'} onClick={() => setTracked((t) => !t)}>
              {tracked ? 'Acompanhando ✓' : (
                <>
                  <Plus size={16} /> Acompanhar disciplina
                </>
              )}
            </Button>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-baseline mb-3">
              <span className="font-heading font-bold text-12-5">Opiniões por professor</span>
              <span className="text-11 font-semibold text-ink-3">{discipline.responses} respostas</span>
            </div>

            {professors.length === 0 && (
              <p className="text-13 text-ink-2 mb-4">Nenhuma opinião registrada ainda para esta disciplina.</p>
            )}

            <div className="flex flex-col gap-2 mb-4">
              {professors.map((p) => (
                <Link
                  key={p.professor}
                  href={`/opinioes?discipline=${discipline.id}&professor=${encodeURIComponent(p.professor)}`}
                  className="flex items-center justify-between gap-2.5 bg-surface border border-line rounded-md py-3 px-3.5 no-underline text-inherit hover:bg-surface-sunken"
                >
                  <div>
                    <div className="font-semibold text-13">{p.professor}</div>
                    <div className="text-11 text-ink-3">{p.stats.totalReviews} opiniões · {p.semesters.join(', ')}</div>
                  </div>
                  <span className="text-12-5 font-bold flex items-center gap-3px text-accent">
                    <Star size={13} fill="currentColor" strokeWidth={0} />
                    {professorScore(p.stats).toFixed(1)}
                  </span>
                </Link>
              ))}
            </div>

            <Link
              href={`/opinioes?discipline=${discipline.id}`}
              className="flex items-center gap-1.5 text-13 font-semibold text-accent-dark no-underline"
            >
              Ver todas as opiniões <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
