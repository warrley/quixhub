'use client';

import { UnderConstruction } from '@/components/UnderConstruction';

import { ArrowUpRight, BookOpen, Calculator, ChevronRight, Compass, MessageSquare, Plus } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Avatar } from '@/components/Avatar';
import { ButtonLink } from '@/components/Button';
import { Card } from '@/components/Card';
import { DisciplineCard } from '@/components/DisciplineCard';
import { EmptyState } from '@/components/EmptyState';
import { EventChip } from '@/components/EventChip';
import { Greeting } from '@/components/Greeting';
import { MaterialCard } from '@/components/MaterialCard';
import { Tag } from '@/components/Tag';
import { MOCK_TODAY, currentUser, disciplineById, disciplines, materials } from '@/data/mock';
import { IRA_DISTRIBUTIONS } from '@/data/iraDistribution';
import { useCalendar } from '@/lib/calendarStore';
import { useIra } from '@/lib/iraStore';
import { clampIra, truncatedNormalCdf } from '@/lib/statistics';

// Shortcuts render as compact rows with a tinted icon tile — deliberately not
// the accent-bar card, so they don't read as one more discipline card.
const QUICK_LINKS = [
  { href: '/catalogo', icon: BookOpen, tile: 'bg-accent-tint text-accent-dark', title: 'Catálogo', description: 'Encontre disciplinas e materiais de estudo.' },
  { href: '/opinioes', icon: MessageSquare, tile: 'bg-accent-2-tint text-accent-2-ink', title: 'Opiniões', description: 'Veja como é a disciplina com cada professor.' },
  { href: '/ira', icon: Calculator, tile: 'bg-accent-3-tint text-accent-3-dark', title: 'Calculadora de IRA', description: 'Importe seu histórico e veja sua posição no curso.' },
] as const;

const DAY_MS = 86_400_000;

function daysUntil(iso: string) {
  return Math.round((Date.parse(`${iso}T00:00:00`) - Date.parse(`${MOCK_TODAY}T00:00:00`)) / DAY_MS);
}

function relativeDay(days: number) {
  if (days === 0) return 'hoje';
  if (days === 1) return 'amanhã';
  return `em ${days} dias`;
}

export default function Home() {
  if (process.env.NODE_ENV === 'production') {
    return <UnderConstruction />;
  }
  return <HomeDashboard />;
}

function HomeDashboard() {
  const { ira } = useIra();
  const { events } = useCalendar();

  const dist = IRA_DISTRIBUTIONS[currentUser.course];
  const percentile =
    ira && dist?.mean && dist?.std ? truncatedNormalCdf(clampIra(ira), dist.mean, dist.std, 10) * 100 : null;

  const trackedDisciplines = disciplines.filter((d) => d.tracked);
  const trackedIds = new Set(trackedDisciplines.map((d) => d.id));
  const recentMaterials = materials
    .filter((m) => m.status === 'published' && trackedIds.has(m.disciplineId))
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .slice(0, 4);
  const materialsTotal = trackedDisciplines.reduce((sum, d) => sum + d.materialsCount, 0);

  const upcomingEvents = events
    .filter((e) => daysUntil(e.date) >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextEvent = upcomingEvents[0];
  const eventsThisWeek = upcomingEvents.filter((e) => daysUntil(e.date) < 7).length;

  return (
    <div>
      <section className="relative overflow-hidden rounded-xl border border-line bg-surface-raised shadow-sm mt-2 mb-8">
        <div className="absolute inset-0 bg-gradient-hero pointer-events-none" aria-hidden />
        <div className="relative flex flex-col gap-5 p-5 mid:p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar name={currentUser.name} size="lg" />
            <div className="min-w-0">
              <p className="text-13 text-ink-2">
                <Greeting />
              </p>
              <h1 className="font-heading font-bold text-25 leading-tight text-ink">{currentUser.name.split(' ')[0]}</h1>
              <p className="text-12-5 text-ink-2 mt-0.5 truncate">{currentUser.course} · UFC Quixadá</p>
            </div>
          </div>
          {/* Phones get the next event on its own full-width row — three
              tiles side by side at 390px truncate every label. */}
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 xl:w-[520px] xl:shrink-0">
            <HeroStat
              className="col-span-2 sm:col-span-1"
              label="Próximo evento"
              value={nextEvent ? relativeDay(daysUntil(nextEvent.date)) : '—'}
              hint={nextEvent ? nextEvent.title : 'Nada agendado'}
            />
            <HeroStat label="Próx. 7 dias" value={String(eventsThisWeek)} hint={eventsThisWeek === 1 ? 'evento' : 'eventos'} />
            <HeroStat label="Materiais" value={String(materialsTotal)} hint="nas suas disciplinas" />
          </dl>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-8 min-w-0">
          <section>
            <SectionHeader
              title="Disciplinas acompanhadas"
              action={
                <SectionLink href="/catalogo">
                  <Plus size={14} strokeWidth={2.5} /> Adicionar
                </SectionLink>
              }
            />
            {trackedDisciplines.length === 0 ? (
              <EmptyState
                icon={<Compass size={26} />}
                title="Nenhuma disciplina"
                description="Acompanhe disciplinas do catálogo para acessá-las rapidamente aqui."
                action={<ButtonLink href="/catalogo">Explorar catálogo</ButtonLink>}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {trackedDisciplines.map((d) => (
                  <DisciplineCard key={d.id} discipline={d} />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHeader
              title="Materiais recentes"
              action={
                <SectionLink href="/materiais">
                  Ver todos <ChevronRight size={14} strokeWidth={2.5} />
                </SectionLink>
              }
            />
            {recentMaterials.length === 0 ? (
              <Card padding="md">
                <p className="text-13 text-ink-2">Ainda não há materiais nas disciplinas que você acompanha.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentMaterials.map((m) => (
                  <MaterialCard key={m.id} material={m} />
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-8 min-w-0">
          <section>
            <SectionHeader title="Seu desempenho" />
            <PerformanceCard ira={ira} percentile={percentile} course={currentUser.course} />
          </section>

          <section>
            <SectionHeader
              title="Próximos eventos"
              action={
                <SectionLink href="/calendario">
                  Calendário <ChevronRight size={14} strokeWidth={2.5} />
                </SectionLink>
              }
            />
            {upcomingEvents.length === 0 ? (
              <Card padding="md">
                <p className="text-13 text-ink-2">Nenhum evento agendado para os próximos dias.</p>
              </Card>
            ) : (
              <div className="flex flex-col gap-2">
                {upcomingEvents.slice(0, 3).map((e) => (
                  <EventChip key={e.id} event={e} discipline={disciplineById(e.disciplineId)} />
                ))}
              </div>
            )}
          </section>

          <section>
            <SectionHeader title="Atalhos" />
            <Card padding="none">
              <ul className="divide-y divide-line">
                {QUICK_LINKS.map(({ href, icon: Icon, tile, title, description }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="group flex items-center gap-3 px-4 py-3.5 no-underline text-inherit [transition:background-color_0.15s_ease] hover:bg-surface-sunken focus-visible:-outline-offset-2"
                    >
                      <span className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${tile}`}>
                        <Icon size={18} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-heading font-bold text-13-5 text-ink">{title}</span>
                        <span className="block text-xs text-ink-2 leading-snug mt-px">{description}</span>
                      </span>
                      <ArrowUpRight
                        size={16}
                        className="shrink-0 text-ink-3 [transition:color_0.15s_ease,transform_0.15s_ease] group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value, hint, className }: { label: string; value: string; hint: string; className?: string }) {
  return (
    <div
      className={`min-w-0 rounded-md border border-line bg-[color-mix(in_oklab,var(--color-surface)_75%,transparent)] px-3 py-2.5 sm:px-4 sm:py-3 ${className ?? ''}`}
    >
      <dt className="font-heading font-bold text-10-5 uppercase tracking-[0.04em] text-ink-2 truncate">{label}</dt>
      <dd className="font-heading font-bold text-17 sm:text-19 text-ink mt-0.5 truncate">{value}</dd>
      <dd className="text-11 sm:text-11-5 text-ink-2 truncate" title={hint}>
        {hint}
      </dd>
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    // min-h matches a header that has a SectionLink, so headers with and
    // without an action line up when the two columns sit side by side.
    <div className="flex items-center justify-between gap-3 mb-3 min-h-8">
      <h2 className="font-heading font-bold text-17 text-ink">{title}</h2>
      {action}
    </div>
  );
}

// Padded and offset so the visible text stays flush with the section edge
// while the tap/hover target is comfortably larger than the 12.5px label.
function SectionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 -mr-2 py-1.5 px-2 rounded-md font-heading font-semibold text-12-5 text-accent no-underline [transition:background-color_0.15s_ease] hover:bg-accent-tint"
    >
      {children}
    </Link>
  );
}

function PerformanceCard({ ira, percentile, course }: { ira: number | null; percentile: number | null; course: string }) {
  if (ira === null) {
    return (
      <Card padding="md">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-md bg-accent-3-tint text-accent-3-dark flex items-center justify-center shrink-0">
            <Calculator size={18} />
          </span>
          <div>
            <h3 className="font-heading font-bold text-14-5 text-ink">Descubra seu IRA</h3>
            <p className="text-13 text-ink-2 leading-snug mt-1">
              Importe o histórico do SIGAA e veja sua posição entre os alunos do curso.
            </p>
          </div>
        </div>
        <ButtonLink href="/ira" block className="mt-4">
          Calcular IRA
        </ButtonLink>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-12-5 font-semibold text-ink-2">IRA atual</div>
          <div className="font-heading font-bold text-28 leading-tight text-ink">{clampIra(ira).toFixed(2)}</div>
        </div>
        {percentile !== null && <Tag tone="accent3">Top {(100 - percentile).toFixed(1)}%</Tag>}
      </div>
      {percentile !== null && (
        <div className="mt-4">
          <div
            className="relative h-2 rounded-full bg-surface-sunken"
            role="img"
            aria-label={`Melhor que ${Math.round(percentile)}% dos alunos de ${course}`}
          >
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-brand" style={{ width: `${percentile}%` }} />
            <div
              className="absolute top-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-surface-raised border-2 border-accent shadow-sm"
              style={{ left: `${percentile}%` }}
            />
          </div>
          <p className="text-xs text-ink-2 mt-2">
            Melhor que {Math.round(percentile)}% dos alunos de {course}.
          </p>
        </div>
      )}
      <Link
        href="/ira"
        className="inline-flex items-center gap-1 mt-3 -ml-2 py-1.5 px-2 rounded-md font-heading font-semibold text-12-5 text-accent no-underline hover:bg-accent-tint"
      >
        Ver análise completa <ChevronRight size={14} strokeWidth={2.5} />
      </Link>
    </Card>
  );
}
