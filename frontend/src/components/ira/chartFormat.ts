export const PLOT_WIDTH = 300;
export const MARGIN = 34;
export const WIDTH = PLOT_WIDTH + MARGIN * 2;

export function fmt(value: number, digits = 2): string {
  return value.toFixed(digits);
}

export function pct(value: number): string {
  return `${value.toFixed(value >= 99.95 || value < 10 ? 1 : 0)}%`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? one : many}`;
}

/** Ordinal like "1º". */
export function ordinal(n: number): string {
  return `${n.toLocaleString('pt-BR')}º`;
}

/** SVG path through points (straight segments — dense enough to look smooth). */
export function linePath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}
