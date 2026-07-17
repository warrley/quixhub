import { CircleCheck, CircleDashed } from 'lucide-react';
import Link from 'next/link';
import type { CalendarEvent, Discipline } from '../data/types';

const KIND_GRADIENT: Record<CalendarEvent['kind'], string> = {
  prova: 'linear-gradient(180deg, var(--color-accent), var(--color-accent-3))',
  entrega: 'linear-gradient(180deg, var(--color-accent-2), var(--color-accent-4))',
  seminario: 'var(--color-warn)',
};

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' });
  const day = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${weekday}, ${day}`;
}

export function EventChip({ event, discipline }: { event: CalendarEvent; discipline?: Discipline }) {
  return (
    <Link
      href={`/calendario/${event.id}`}
      className="flex items-center gap-2.5 bg-surface-raised border border-line rounded-md px-3 py-2.5 no-underline text-inherit [transition:border-color_0.15s_ease,transform_0.15s_ease] hover:border-line-strong hover:translate-x-0.5"
    >
      <span className="w-[3px] self-stretch min-h-[28px] rounded-[2px] shrink-0" style={{ background: KIND_GRADIENT[event.kind] }} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-12-5 text-ink">{event.title}</div>
        <div className={`text-11 flex items-center gap-1 mt-0.5 ${event.confirmed ? 'text-good' : 'text-warn'}`}>
          {event.confirmed ? <CircleCheck size={12} /> : <CircleDashed size={12} />}
          {formatDate(event.date)} · {event.confirmed ? `confirmado por ${event.confirmations}` : 'não confirmado'}
          {discipline ? ` · ${discipline.name}` : ''}
        </div>
      </div>
    </Link>
  );
}
