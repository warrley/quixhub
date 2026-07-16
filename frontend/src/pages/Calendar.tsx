import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { SelectField, TextField } from '../components/Field';
import { EventChip } from '../components/EventChip';
import { useCalendar } from '../lib/calendarStore';
import { disciplineById, disciplines } from '../data/mock';
import styles from './Calendar.module.css';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const DISCIPLINE_DOT: Record<string, string> = {
  accent: 'var(--accent)',
  accent2: 'var(--accent-2)',
  accent3: 'var(--accent-3)',
  accent4: 'var(--accent-4)',
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
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Calendário</h1>
          <p className={styles.subtitle}>Prazos e provas das suas disciplinas acompanhadas.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus size={16} /> Adicionar evento
        </Button>
      </div>

      <div className={styles.monthNav}>
        <button className={styles.navBtn} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
          <ChevronLeft size={16} />
        </button>
        <span className={styles.monthLabel}>{monthLabel}</span>
        <button className={styles.navBtn} onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div className={styles.grid}>
        {WEEKDAYS.map((w) => (
          <div key={w} className={styles.weekday}>
            {w}
          </div>
        ))}
        {days.map(({ date, inMonth }) => {
          const iso = isoDate(date);
          const dayEvents = eventsByDate.get(iso) ?? [];
          return (
            <div
              key={iso}
              className={[
                styles.day,
                inMonth ? '' : styles.dayMuted,
                iso === today ? styles.dayToday : '',
              ].join(' ')}
              onClick={() => setSelectedDay(selectedDay === iso ? null : iso)}
            >
              <span className={styles.dayNum}>{date.getDate()}</span>
              <div className={styles.dayDots}>
                {dayEvents.map((e) => {
                  const d = disciplineById(e.disciplineId);
                  return (
                    <span
                      key={e.id}
                      className={styles.dayDot}
                      style={{ background: d ? DISCIPLINE_DOT[d.accent] : 'var(--ink-3)' }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.legend}>
        {disciplines
          .filter((d) => d.tracked)
          .map((d) => (
            <div key={d.id} className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: DISCIPLINE_DOT[d.accent] }} />
              {d.name}
            </div>
          ))}
      </div>

      <div className={styles.upcomingTitle}>
        {selectedDay ? `Eventos em ${new Date(`${selectedDay}T00:00:00`).toLocaleDateString('pt-BR')}` : 'Próximos eventos'}
      </div>
      <div className={styles.list}>
        {displayedEvents.length === 0 && <p style={{ fontSize: 13, color: 'var(--ink-2)' }}>Nada por aqui.</p>}
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
        <p style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          Qualquer aluno pode propor um prazo. Ele fica "não confirmado" até outros alunos confirmarem, para não
          enganar a turma com uma data errada.
        </p>
      </Dialog>
    </div>
  );
}
