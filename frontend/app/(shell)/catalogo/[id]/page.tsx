'use client';

import { AlertTriangle, ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect, useParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { MaterialCard } from '@/components/MaterialCard';
import { StatBar } from '@/components/StatBar';
import { TagButton } from '@/components/Tag';
import { disciplineById, feedbackStats, materialsByDiscipline } from '@/data/mock';

const ACCENT_GRADIENT: Record<string, string> = {
  accent: 'var(--gradient-cta)',
  accent2: 'var(--gradient-warm)',
  accent3: 'linear-gradient(135deg, var(--color-accent-3), var(--color-accent))',
  accent4: 'linear-gradient(135deg, var(--color-accent-4), var(--color-accent-2))',
};

export default function DisciplineDetail() {
  const params = useParams<{ id: string }>();
  const discipline = disciplineById(params.id);
  const [tracked, setTracked] = useState(discipline?.tracked ?? false);
  const [variant, setVariant] = useState<'discipline' | 'professor'>('discipline');

  if (!discipline) redirect('/catalogo');

  const stats = feedbackStats[discipline.id] ?? feedbackStats['estrutura-de-dados'];
  const relatedMaterials = materialsByDiscipline(discipline.id);

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
          <div className="font-heading font-bold text-11 text-accent-2-ink mb-1.5">
            {discipline.code} · {discipline.semester}
          </div>
          <h1 className="font-heading font-bold text-2xl mb-1.5">{discipline.name}</h1>
          <div className="text-13 text-ink-2 mb-4">
            {discipline.professor} · {discipline.workload}h
          </div>
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
              <span className="font-heading font-bold text-12-5">Feedback (agregado)</span>
              <span className="text-11 font-semibold text-ink-3">{discipline.responses} respostas</span>
            </div>

            <div className="flex gap-1.5 mb-4">
              <TagButton tone={variant === 'discipline' ? 'selected' : 'outline'} onClick={() => setVariant('discipline')}>
                Só disciplina
              </TagButton>
              <TagButton tone={variant === 'professor' ? 'selected' : 'outline'} onClick={() => setVariant('professor')}>
                Com professor
              </TagButton>
            </div>

            {variant === 'professor' && (
              <div className="flex items-center gap-2.5 bg-surface border border-line rounded-md py-3 px-3.5 mb-4">
                <div>
                  <div className="font-semibold text-13">{discipline.professor}</div>
                  <div className="text-11 text-ink-3">Feedback identificado por professor</div>
                </div>
              </div>
            )}

            {stats.map((s) => (
              <StatBar key={s.label} label={s.label} value={s.value} percent={s.percent} tone={s.tone} />
            ))}

            <div className="flex gap-2 bg-warn-tint border border-[color-mix(in_oklab,var(--color-warn)_40%,transparent)] text-ink-2 rounded-md py-3 px-3.5 text-xs leading-[1.5] mt-4">
              <AlertTriangle size={15} style={{ flexShrink: 0, color: 'var(--color-warn)' }} />
              <span>
                Política de identidade do feedback ainda em aberto — as duas variantes acima (só disciplina vs.
                com professor) estão aqui para o product owner decidir com mockups reais em mãos.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
