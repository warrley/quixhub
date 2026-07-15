'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { disciplines } from '../data/mock';
import type { FluxogramaEdge, FluxogramaNode, FluxogramaState } from '../data/types';
import { deriveCatalogEdges } from './fluxograma';

const STORAGE_KEY = 'quixhub-fluxograma';

function emptyState(): FluxogramaState {
  return { nodes: [], edges: deriveCatalogEdges(disciplines), updatedAt: '' };
}

interface FluxogramaContextValue {
  state: FluxogramaState;
  save: (next: Pick<FluxogramaState, 'nodes' | 'edges'>) => void;
}

const FluxogramaContext = createContext<FluxogramaContextValue | null>(null);

export function FluxogramaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FluxogramaState>(emptyState);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as FluxogramaState;
      setState(parsed);
    } catch {
      // corrupt/old data — ignore and keep the seeded state
    }
  }, []);

  function save(next: { nodes: FluxogramaNode[]; edges: FluxogramaEdge[] }) {
    const nextState: FluxogramaState = { ...next, updatedAt: new Date().toISOString() };
    setState(nextState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }

  return <FluxogramaContext.Provider value={{ state, save }}>{children}</FluxogramaContext.Provider>;
}

export function useFluxograma() {
  const ctx = useContext(FluxogramaContext);
  if (!ctx) throw new Error('useFluxograma must be used within FluxogramaProvider');
  return ctx;
}
