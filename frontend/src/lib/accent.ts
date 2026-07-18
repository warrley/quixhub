import type { Discipline } from '@/data/types';

// Vertical accent-bar color per discipline, shared between the catalog card
// and the Opiniões discipline card so the same discipline reads consistently.
export const ACCENT_VAR: Record<Discipline['accent'], string> = {
  accent: 'var(--gradient-brand)',
  accent2: 'var(--gradient-warm)',
  accent3: 'linear-gradient(180deg, var(--color-accent-3), var(--color-accent))',
  accent4: 'linear-gradient(180deg, var(--color-accent-4), var(--color-accent-2))',
};
