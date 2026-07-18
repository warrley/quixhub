'use client';

import { UnderConstruction } from '@/components/UnderConstruction';

import { BookOpen, Calculator, Compass, MessageSquare, Search } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DisciplineCard } from '@/components/DisciplineCard';
import { EmptyState } from '@/components/EmptyState';
import { Greeting } from '@/components/Greeting';
import { Tag } from '@/components/Tag';
import { currentUser, disciplines } from '@/data/mock';
import { IRA_DISTRIBUTIONS } from '@/data/iraDistribution';
import { clampIra, truncatedNormalCdf } from '@/lib/statistics';
import { useIra } from '@/lib/iraStore';

const QUICK_LINKS = [
  { href: '/catalogo', icon: BookOpen, accent: 'var(--gradient-brand)', iconTone: 'var(--color-accent)', title: 'Catálogo', description: 'Encontre disciplinas e materiais de estudo.' },
  { href: '/opinioes', icon: MessageSquare, accent: 'var(--gradient-warm)', iconTone: 'var(--color-accent-2-ink)', title: 'Opiniões', description: 'Veja como é a disciplina com cada professor.' },
  { href: '/ira', icon: Calculator, accent: 'linear-gradient(180deg, var(--color-accent-3), var(--color-accent))', iconTone: 'var(--color-accent-3)', title: 'Calculadora de IRA', description: 'Importe seu histórico e veja sua posição no curso.' },
] as const;

export default function Home() {
  if (process.env.NODE_ENV === 'production') {
    return <UnderConstruction />;
  }

  const { ira } = useIra();
  const dist = IRA_DISTRIBUTIONS[currentUser.course];
  const percentile =
    ira && dist?.mean && dist?.std ? truncatedNormalCdf(clampIra(ira), dist.mean, dist.std, 10) * 100 : null;

  const trackedDisciplines = disciplines.filter((d) => d.tracked);

  return (
    <div>
      <div className="flex items-center gap-3 my-2 mb-5">
        <Avatar name={currentUser.name} size="lg" />
        <div>
          <div className="text-12-5 text-ink-2 mb-px">
            <Greeting />
          </div>
          <div className="font-heading font-bold text-22">{currentUser.name.split(' ')[0]}</div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 border border-line bg-surface rounded-md py-13px px-4 text-ink-3 mb-8 shadow-sm">
        <Search size={16} />
        <input
          placeholder="Buscar disciplinas, professores..."
          className="border-none outline-none bg-transparent flex-1 font-body text-13-5 text-ink"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 min-[1000px]:grid-cols-3 gap-4 mb-8">
        {QUICK_LINKS.map(({ href, icon: Icon, accent, iconTone, title, description }) => (
          <Link key={href} href={href} className="block h-full" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Card interactive padding="md" accent={accent} className="h-full">
              <div className="flex items-center gap-2.5 mb-2">
                <Icon size={18} style={{ color: iconTone }} />
                <div className="font-heading font-bold text-14-5">{title}</div>
              </div>
              <p className="text-13 text-ink-3 leading-snug">{description}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mb-8">
        <div className="font-heading font-bold text-14-5 mb-3">Seu desempenho</div>
        <Card padding="md" className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-13 text-ink-3 mb-1">IRA atual</div>
            <div className="font-heading font-bold text-2xl text-ink">{ira ? clampIra(ira).toFixed(4) : '—'}</div>
          </div>
          {percentile !== null && (
            <div className="text-right">
              <div className="text-13 text-ink-3 mb-1.5">Percentil ({currentUser.course})</div>
              <Tag tone="accent3">Top {(100 - percentile).toFixed(1)}%</Tag>
            </div>
          )}
          {ira === null && (
            <Link href="/ira" className="shrink-0">
              <Button variant="secondary">Calcular IRA</Button>
            </Link>
          )}
        </Card>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-baseline mb-3">
          <span className="font-heading font-bold text-14-5">Disciplinas acompanhadas</span>
          <Link href="/catalogo" className="font-heading font-semibold text-11-5 text-accent no-underline">
            adicionar mais
          </Link>
        </div>
        {trackedDisciplines.length === 0 ? (
          <EmptyState
            icon={<Compass size={26} />}
            title="Nenhuma disciplina"
            description="Acompanhe disciplinas do catálogo para acessá-las rapidamente aqui."
            action={
              <Link href="/catalogo">
                <Button>Explorar catálogo</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {trackedDisciplines.map((d) => (
              <DisciplineCard key={d.id} discipline={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
