'use client';

import { createContext, useContext } from 'react';
import type { CampusSnapshotResponse } from '@/lib/iraCampusApi';

export const CampusSnapshotContext = createContext<CampusSnapshotResponse | null>(null);

export function useCampusSnapshot(): CampusSnapshotResponse | null {
  return useContext(CampusSnapshotContext);
}
