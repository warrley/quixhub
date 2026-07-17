'use client';

import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { SelectField, TextField } from '@/components/Field';
import { EventChip } from '@/components/EventChip';
import { useCalendar } from '@/lib/calendarStore';
import { disciplineById, disciplines } from '@/data/mock';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const DISCIPLINE_DOT: Record<string, string> = {
  accent: 'var(--color-accent)',
  accent2: 'var(--color-accent-2)',
  accent3: 'var(--color-accent-3)',
  accent4: 'var(--color-accent-4)',
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Calendar() {
  const { events, addEvent } = useCalendar();
  const [cursor, setCursor] = useState(new Date(2026, 6, 1));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: '', disciplineId: disciplines[0].id, date: '2026-07-20', kind: 'prova' as const });

  const monthLabel = cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const days = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ date: new Date(year, month, i - startOffset + 1), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(year, month, d), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1].date;
      cells.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), inMonth: false });
    }
    return cells;
  }, [cursor]);

  const today = isoDate(new Date(2026, 6, 16));

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof events>();
    for (const e of events) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [events]);

  const displayedEvents = selectedDay ? events.filter((e) => e.date === selectedDay) : events;

  return (
    <div>
      <div className="flex justify-between items-start gap-4 my-2 mb-5 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-22 mb-1">Calendário</h1>
          <p className="text-13 text-ink-2">Prazos e provas das suas disciplinas acompanhadas.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus size={16} /> Adicionar evento
        </Button>
      </div>

      <div className="flex items-center gap-2.5 mb-4">
        <button
          className="w-8 h-8 rounded-full border border-line bg-surface flex items-center justify-center cursor-pointer text-ink-2 hover:bg-accent-tint hover:text-accent-dark"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="font-heading font-bold text-15 min-w-[150px] text-center capitalize">{monthLabel}</span>
        <button
          className="w-8 h-8 rounded-full border border-line bg-surface flex items-center justify-center cursor-pointer text-ink-2 hover:bg-accent-tint hover:text-accent-dark"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-8">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-10-5 font-bold text-ink-3 pb-1.5 uppercase">
            {w}
          </div>
        ))}
        {days.map(({ date, inMonth }) => {
          const iso = isoDate(date);
          const dayEvents = eventsByDate.get(iso) ?? [];
          return (
            <div
              key={iso}
              className={`aspect-square rounded-md border border-line bg-surface p-1.5 flex flex-col gap-3px cursor-pointer min-h-14 [transition:border-color_0.15s_ease] hover:border-line-strong ${!inMonth ? 'opacity-35' : ''} ${iso === today ? 'border-accent shadow-[0_0_0_1px_var(--color-accent)]' : ''}`}
              onClick={() => setSelectedDay(selectedDay === iso ? null : iso)}
            >
              <span className="text-11 font-semibold text-ink-2">{date.getDate()}</span>
              <div className="flex gap-3px flex-wrap">
                {dayEvents.map((e) => {
                  const d = disciplineById(e.disciplineId);
                  return (
                    <span
                      key={e.id}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: d ? DISCIPLINE_DOT[d.accent] : 'var(--color-ink-3)' }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4 flex-wrap mb-8">
        {disciplines
          .filter((d) => d.tracked)
          .map((d) => (
            <div key={d.id} className="flex items-center gap-1.5 text-11-5 text-ink-2 font-medium">
              <span className="w-2 h-2 rounded-full" style={{ background: DISCIPLINE_DOT[d.accent] }} />
              {d.name}
            </div>
          ))}
      </div>

      <div className="font-heading font-bold text-14-5 mb-3">
        {selectedDay ? `Eventos em ${new Date(`${selectedDay}T00:00:00`).toLocaleDateString('pt-BR')}` : 'Próximos eventos'}
      </div>
      <div className="flex flex-col gap-9px">
        {displayedEvents.length === 0 && <p className="text-13 text-ink-2">Nada por aqui.</p>}
        {displayedEvents.map((event) => (
          <EventChip key={event.id} event={event} discipline={disciplineById(event.disciplineId)} />
        ))}
      </div>

      <Dialog
        open={dialogOpen}
        title="Adicionar evento"
        onClose={() => setDialogOpen(false)}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                addEvent(form);
                setDialogOpen(false);
              }}
            >
              Propor evento
            </Button>
          </>
        }
      >
        <TextField
          label="Título"
          placeholder="Ex: Prova — Cálculo II"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <SelectField
          label="Disciplina"
          value={form.disciplineId}
          onChange={(e) => setForm((f) => ({ ...f, disciplineId: e.target.value }))}
        >
          {disciplines.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Data"
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
        />
        <p className="text-xs text-ink-3">
          Qualquer aluno pode propor um prazo. Ele fica &quot;não confirmado&quot; até outros alunos confirmarem, para não
          enganar a turma com uma data errada.
        </p>
      </Dialog>
    </div>
  );
}
