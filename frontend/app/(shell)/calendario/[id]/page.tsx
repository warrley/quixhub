'use client';

import { ArrowLeft, CalendarDays, CircleCheck, CircleDashed } from 'lucide-react';
import Link from 'next/link';
import { redirect, useParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Tag } from '@/components/Tag';
import { disciplineById, materials } from '@/data/mock';
import { useCalendar } from '@/lib/calendarStore';

const KIND_LABEL: Record<string, string> = {
  prova: 'Prova',
  entrega: 'Entrega',
  seminario: 'Seminário',
};

export default function EventDetail() {
  const params = useParams<{ id: string }>();
  const { events, confirmEvent } = useCalendar();
  const event = events.find((e) => e.id === params.id);

  if (!event) redirect('/calendario');

  const discipline = disciplineById(event.disciplineId);
  const linkedMaterial = event.linkedMaterialId ? materials.find((m) => m.id === event.linkedMaterialId) : undefined;
  const dateLabel = new Date(`${event.date}T00:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  return (
    <div>
      <Link href="/calendario" className="inline-flex items-center gap-1 text-xs font-semibold text-ink-2 no-underline my-2 mb-5">
        <ArrowLeft size={13} /> Calendário
      </Link>

      <Card className="max-w-[480px] p-6" padding="none">
        <div className="mb-3">
          <Tag tone="accent">{KIND_LABEL[event.kind]}</Tag>
        </div>
        <h1 className="font-heading font-bold text-21 mb-1.5">{event.title}</h1>
        <div className="text-13 text-ink-2 mb-5">{discipline?.name}</div>
        <div className="flex items-center gap-2 text-13-5 text-ink font-semibold mb-5">
          <CalendarDays size={16} />
          {dateLabel}
        </div>

        {linkedMaterial && (
          <div className="mt-5">
            <Link href={`/materiais/${linkedMaterial.id}`}>
              <Button variant="secondary" size="sm">
                Ver material vinculado: {linkedMaterial.title}
              </Button>
            </Link>
          </div>
        )}

        <div className="flex items-center gap-3 pt-5 border-t border-line">
          {event.confirmed ? (
            <Tag tone="good" icon={<CircleCheck size={13} />}>
              Confirmado
            </Tag>
          ) : (
            <Tag tone="warn" icon={<CircleDashed size={13} />}>
              Não confirmado
            </Tag>
          )}
          <span className="text-12-5 text-ink-2">{event.confirmations} alunos confirmaram</span>
          <Button size="sm" variant="ghost" onClick={() => confirmEvent(event.id)}>
            Confirmar também
          </Button>
        </div>
      </Card>
    </div>
  );
}
