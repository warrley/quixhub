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
  /** Flips to true once the localStorage read completes (or is confirmed empty). React Flow's
   * useNodesState/useEdgesState only consume their initial value once, so consumers must wait
   * for this before seeding — otherwise they seed from the pre-hydration empty state. */
  hydrated: boolean;
  save: (next: Pick<FluxogramaState, 'nodes' | 'edges'>) => void;
}

const FluxogramaContext = createContext<FluxogramaContextValue | null>(null);

export function FluxogramaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FluxogramaState>(emptyState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setState(JSON.parse(stored) as FluxogramaState);
      } catch {
        // corrupt/old data — ignore and keep the seeded state
      }
    }
    setHydrated(true);
  }, []);

  function save(next: { nodes: FluxogramaNode[]; edges: FluxogramaEdge[] }) {
    const nextState: FluxogramaState = { ...next, updatedAt: new Date().toISOString() };
    setState(nextState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }

  return <FluxogramaContext.Provider value={{ state, hydrated, save }}>{children}</FluxogramaContext.Provider>;
}

export function useFluxograma() {
  const ctx = useContext(FluxogramaContext);
  if (!ctx) throw new Error('useFluxograma must be used within FluxogramaProvider');
  return ctx;
}
