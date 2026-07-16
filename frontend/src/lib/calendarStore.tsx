import { createContext, useContext, useState, type ReactNode } from 'react';
import { calendarEvents as seedEvents } from '../data/mock';
import type { CalendarEvent } from '../data/types';

interface CalendarContextValue {
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, 'id' | 'confirmations' | 'confirmed'>) => void;
  confirmEvent: (id: string) => void;
}

const CalendarContext = createContext<CalendarContextValue | null>(null);

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<CalendarEvent[]>(seedEvents);

  function addEvent(event: Omit<CalendarEvent, 'id' | 'confirmations' | 'confirmed'>) {
    setEvents((cur) => [
      ...cur,
      { ...event, id: `ev-${Date.now()}`, confirmations: 1, confirmed: false },
    ]);
  }

  function confirmEvent(id: string) {
    setEvents((cur) =>
      cur.map((e) => (e.id === id ? { ...e, confirmations: e.confirmations + 1, confirmed: e.confirmations + 1 >= 3 } : e)),
    );
  }

  return <CalendarContext.Provider value={{ events, addEvent, confirmEvent }}>{children}</CalendarContext.Provider>;
}

export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider');
  return ctx;
}
