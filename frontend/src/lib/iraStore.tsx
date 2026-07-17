'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { IraEntry, IraState } from '../data/types';
import { computeIra } from './ira';

const STORAGE_KEY = 'quixhub-ira';
const EMPTY_STATE: IraState = { entries: [], updatedAt: '' };

interface IraContextValue {
  state: IraState;
  addEntry: (entry: Omit<IraEntry, 'id'>) => void;
  addEntries: (entries: Omit<IraEntry, 'id'>[]) => void;
  updateEntry: (id: string, patch: Partial<IraEntry>) => void;
  removeEntry: (id: string) => void;
  removeEntries: (ids: string[]) => void;
  ira: number | null;
}

const IraContext = createContext<IraContextValue | null>(null);

export function IraProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<IraState>(EMPTY_STATE);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      setState(JSON.parse(stored) as IraState);
    } catch {
      // corrupt/old data — ignore and keep the empty state
    }
  }, []);

  useEffect(() => {
    if (state.updatedAt === '') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  function addEntry(entry: Omit<IraEntry, 'id'>) {
    setState((cur) => ({
      entries: [...cur.entries, { ...entry, id: `ira-${Date.now()}-${cur.entries.length}` }],
      updatedAt: new Date().toISOString(),
    }));
  }

  function addEntries(entries: Omit<IraEntry, 'id'>[]) {
    setState((cur) => ({
      entries: [...cur.entries, ...entries.map((e, i) => ({ ...e, id: `ira-${Date.now()}-${cur.entries.length + i}` }))],
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateEntry(id: string, patch: Partial<IraEntry>) {
    setState((cur) => ({
      entries: cur.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      updatedAt: new Date().toISOString(),
    }));
  }

  function removeEntry(id: string) {
    setState((cur) => ({
      entries: cur.entries.filter((e) => e.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }

  function removeEntries(ids: string[]) {
    const idSet = new Set(ids);
    setState((cur) => ({
      entries: cur.entries.filter((e) => !idSet.has(e.id)),
      updatedAt: new Date().toISOString(),
    }));
  }

  const ira = useMemo(() => computeIra(state.entries), [state.entries]);

  return (
    <IraContext.Provider value={{ state, addEntry, addEntries, updateEntry, removeEntry, removeEntries, ira }}>
      {children}
    </IraContext.Provider>
  );
}

export function useIra() {
  const ctx = useContext(IraContext);
  if (!ctx) throw new Error('useIra must be used within IraProvider');
  return ctx;
}
