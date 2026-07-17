import { UnderConstruction } from '@/components/UnderConstruction';
import { Compass, Search } from 'lucide-react';
import Link from 'next/link';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { EventChip } from '@/components/EventChip';
import { Greeting } from '@/components/Greeting';
import { MaterialCard } from '@/components/MaterialCard';
import { calendarEvents, currentUser, disciplineById, disciplines, materials } from '@/data/mock';

export default function Home() {
  if (process.env.NODE_ENV === 'production') {
    return <UnderConstruction />;
  }

  const trackedIds = disciplines.filter((d) => d.tracked).map((d) => d.id);
  const upcoming = calendarEvents.slice(0, 3);
  const recentMaterials = materials
    .filter((m) => m.status === 'published' && trackedIds.includes(m.disciplineId))
    .slice(0, 3);

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
          placeholder="Buscar disciplinas, materiais..."
          className="border-none outline-none bg-transparent flex-1 font-body text-13-5 text-ink"
        />
      </div>

      {trackedIds.length === 0 ? (
        <EmptyState
          icon={<Compass size={26} />}
          title="Nenhuma disciplina acompanhada"
          description="Acompanhe disciplinas do catálogo para ver prazos e materiais aqui."
          action={
            <Link href="/catalogo">
              <Button>Explorar catálogo</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 min-[760px]:grid-cols-2 gap-8">
          <section>
            <div className="flex justify-between items-baseline mb-3">
              <span className="font-heading font-bold text-14-5">Próximos prazos</span>
              <Link href="/calendario" className="font-heading font-semibold text-11-5 text-accent no-underline">
                ver agenda
              </Link>
            </div>
            <div className="flex flex-col gap-9px">
              {upcoming.map((event) => (
                <EventChip key={event.id} event={event} discipline={disciplineById(event.disciplineId)} />
              ))}
            </div>
          </section>

          <section>
            <div className="flex justify-between items-baseline mb-3">
              <span className="font-heading font-bold text-14-5">Novos materiais</span>
              <Link href="/materiais" className="font-heading font-semibold text-11-5 text-accent no-underline">
                ver tudo
              </Link>
            </div>
            <div className="flex flex-col gap-9px">
              {recentMaterials.map((material) => (
                <MaterialCard key={material.id} material={material} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
