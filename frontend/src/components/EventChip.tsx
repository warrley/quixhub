import { CircleCheck, CircleDashed } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CalendarEvent, Discipline } from '../data/types';
import styles from './EventChip.module.css';

const KIND_GRADIENT: Record<CalendarEvent['kind'], string> = {
  prova: 'linear-gradient(180deg, var(--accent), var(--accent-3))',
  entrega: 'linear-gradient(180deg, var(--accent-2), var(--accent-4))',
  seminario: 'var(--warn)',
};

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' });
  const day = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return `${weekday}, ${day}`;
}

export function EventChip({ event, discipline }: { event: CalendarEvent; discipline?: Discipline }) {
  return (
    <Link to={`/calendario/${event.id}`} className={styles.chip}>
      <span className={styles.bar} style={{ background: KIND_GRADIENT[event.kind] }} />
      <div className={styles.info}>
        <div className={styles.title}>{event.title}</div>
        <div className={[styles.date, event.confirmed ? styles.confirmed : styles.unconfirmed].join(' ')}>
          {event.confirmed ? <CircleCheck size={12} /> : <CircleDashed size={12} />}
          {formatDate(event.date)} · {event.confirmed ? `confirmado por ${event.confirmations}` : 'não confirmado'}
          {discipline ? ` · ${discipline.name}` : ''}
        </div>
      </div>
    </Link>
  );
}
