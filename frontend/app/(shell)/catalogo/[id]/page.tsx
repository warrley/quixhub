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
import styles from './DisciplineDetail.module.css';

const ACCENT_GRADIENT: Record<string, string> = {
  accent: 'var(--gradient-cta)',
  accent2: 'var(--gradient-warm)',
  accent3: 'linear-gradient(135deg, var(--accent-3), var(--accent))',
  accent4: 'linear-gradient(135deg, var(--accent-4), var(--accent-2))',
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
      <div className={styles.banner} style={{ background: ACCENT_GRADIENT[discipline.accent] }}>
        <Link href="/catalogo" className={styles.back}>
          <ArrowLeft size={13} /> Catálogo
        </Link>
        <div className={styles.badge}>
          {discipline.name
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()}
        </div>
      </div>

      <div className={styles.body}>
        <div>
          <div className={styles.kicker}>
            {discipline.code} · {discipline.semester}
          </div>
          <h1 className={styles.title}>{discipline.name}</h1>
          <div className={styles.meta}>
            {discipline.professor} · {discipline.workload}h
          </div>
          <p className={styles.desc}>{discipline.description}</p>

          <div className={styles.subhead}>Pré-requisitos</div>
          <div className={styles.prereqs}>{discipline.prerequisites.join(', ') || 'Nenhum'}</div>

          <div className={styles.subhead}>Materiais recentes</div>
          <div className={styles.materialsList}>
            {relatedMaterials.length === 0 && <p className={styles.meta}>Nenhum material publicado ainda.</p>}
            {relatedMaterials.map((m) => (
              <MaterialCard key={m.id} material={m} />
            ))}
          </div>
        </div>

        <div>
          <div className={styles.sidebarSection}>
            <Button block variant={tracked ? 'secondary' : 'primary'} onClick={() => setTracked((t) => !t)}>
              {tracked ? 'Acompanhando ✓' : (
                <>
                  <Plus size={16} /> Acompanhar disciplina
                </>
              )}
            </Button>
          </div>

          <div className={styles.sidebarSection}>
            <div className={styles.feedbackHead}>
              <span className={styles.subhead} style={{ marginBottom: 0 }}>
                Feedback (agregado)
              </span>
              <span className={styles.responses}>{discipline.responses} respostas</span>
            </div>

            <div className={styles.variantToggle}>
              <TagButton tone={variant === 'discipline' ? 'selected' : 'outline'} onClick={() => setVariant('discipline')}>
                Só disciplina
              </TagButton>
              <TagButton tone={variant === 'professor' ? 'selected' : 'outline'} onClick={() => setVariant('professor')}>
                Com professor
              </TagButton>
            </div>

            {variant === 'professor' && (
              <div className={styles.professorRow}>
                <div>
                  <div className={styles.professorName}>{discipline.professor}</div>
                  <div className={styles.professorSub}>Feedback identificado por professor</div>
                </div>
              </div>
            )}

            {stats.map((s) => (
              <StatBar key={s.label} label={s.label} value={s.value} percent={s.percent} tone={s.tone} />
            ))}

            <div className={styles.decisionNote}>
              <AlertTriangle size={15} style={{ flexShrink: 0, color: 'var(--warn)' }} />
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
