export type PersonalView = 'treemap' | 'ponte' | 'bolhas' | 'balanca';
export type TreemapSizing = 'impacto' | 'notaPeso';
export type TugScope = 'disciplinas' | 'semestres';

export interface ImpactTone {
  bg: string;
  border: string;
  accentText: string;
}

/**
 * Generates semantic surface/border/text colors scaled continuously by
 * marginal IRA impact (`delta`) using `color-mix(in oklab, ...)` so both
 * light and dark themes keep contrast and in-gamut fidelity.
 */
export function impactTone(delta: number, maxAbsDelta: number, simulated: boolean): ImpactTone {
  const intensity = maxAbsDelta > 0 ? Math.min(1, Math.sqrt(Math.abs(delta) / maxAbsDelta)) : 0;

  if (simulated) {
    const pct = Math.round(14 + intensity * 20);
    return {
      bg: `color-mix(in oklab, var(--color-accent-2) ${pct}%, var(--color-surface))`,
      border: 'color-mix(in oklab, var(--color-accent-2-dark) 50%, var(--color-line))',
      accentText: 'var(--color-accent-2-dark)',
    };
  }

  if (delta > 0.0005) {
    const pct = Math.round(11 + intensity * 27);
    const borderPct = Math.round(30 + intensity * 35);
    return {
      bg: `color-mix(in oklab, var(--color-good) ${pct}%, var(--color-surface))`,
      border: `color-mix(in oklab, var(--color-good) ${borderPct}%, var(--color-line))`,
      accentText: 'var(--color-good)',
    };
  }

  if (delta < -0.0005) {
    const pct = Math.round(11 + intensity * 29);
    const borderPct = Math.round(30 + intensity * 35);
    return {
      bg: `color-mix(in oklab, var(--color-danger) ${pct}%, var(--color-surface))`,
      border: `color-mix(in oklab, var(--color-danger) ${borderPct}%, var(--color-line))`,
      accentText: 'var(--color-danger)',
    };
  }

  return {
    bg: 'var(--color-surface-sunken)',
    border: 'var(--color-line)',
    accentText: 'var(--color-ink-3)',
  };
}

export function dotColorByImpact(delta: number, simulated: boolean): string {
  if (simulated) return 'var(--color-accent-2-dark)';
  if (delta > 0.0005) return 'var(--color-good)';
  if (delta < -0.0005) return 'var(--color-danger)';
  return 'var(--color-ink-3)';
}
