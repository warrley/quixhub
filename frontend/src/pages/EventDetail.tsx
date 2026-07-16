import { ArrowLeft, CalendarDays, CircleCheck, CircleDashed } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Tag } from '../components/Tag';
import { materials } from '../data/mock';
import { useCalendar } from '../lib/calendarStore';
import { disciplineById } from '../data/mock';
import styles from './EventDetail.module.css';

const KIND_LABEL: Record<string, string> = {
  prova: 'Prova',
  entrega: 'Entrega',
  seminario: 'Seminário',
};

export default function EventDetail() {
  const { id } = useParams();
  const { events, confirmEvent } = useCalendar();
  const event = events.find((e) => e.id === id);

  if (!event) return <Navigate to="/calendario" replace />;

  const discipline = disciplineById(event.disciplineId);
  const linkedMaterial = event.linkedMaterialId ? materials.find((m) => m.id === event.linkedMaterialId) : undefined;
  const dateLabel = new Date(`${event.date}T00:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  return (
    <div>
      <Link to="/calendario" className={styles.back}>
        <ArrowLeft size={13} /> Calendário
      </Link>

      <Card className={styles.card} padding="none">
        <div className={styles.kindTag}>
          <Tag tone="accent">{KIND_LABEL[event.kind]}</Tag>
        </div>
        <h1 className={styles.title}>{event.title}</h1>
        <div className={styles.discipline}>{discipline?.name}</div>
        <div className={styles.dateRow}>
          <CalendarDays size={16} />
          {dateLabel}
        </div>

        {linkedMaterial && (
          <div className={styles.materialLink}>
            <Link to={`/materiais/${linkedMaterial.id}`}>
              <Button variant="secondary" size="sm">
                Ver material vinculado: {linkedMaterial.title}
              </Button>
            </Link>
          </div>
        )}

        <div className={styles.confirmRow}>
          {event.confirmed ? (
            <Tag tone="good" icon={<CircleCheck size={13} />}>
              Confirmado
            </Tag>
          ) : (
            <Tag tone="warn" icon={<CircleDashed size={13} />}>
              Não confirmado
            </Tag>
          )}
          <span className={styles.confirmCount}>{event.confirmations} alunos confirmaram</span>
          <Button size="sm" variant="ghost" onClick={() => confirmEvent(event.id)}>
            Confirmar também
          </Button>
        </div>
      </Card>
    </div>
  );
}
