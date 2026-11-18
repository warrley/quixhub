export interface TreemapInput<T> {
  value: number;
  data: T;
}

export interface TreemapRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TreemapCell<T> extends TreemapRect {
  data: T;
}

function worstAspect(rMin: number, rMax: number, sum: number, side: number): number {
  if (sum <= 0 || rMin <= 0 || side <= 0) return Number.POSITIVE_INFINITY;
  const s2 = sum * sum;
  const w2 = side * side;
  return Math.max((w2 * rMax) / s2, s2 / (w2 * rMin));
}

/**
 * Bruls–Huizing–van Wijk 2D squarified treemap layout.
 * Filters non-positive values, sorts descending, and fills `rect` cleanly
 * with zero gaps or overlaps.
 */
export function squarify<T>(items: TreemapInput<T>[], rect: TreemapRect): TreemapCell<T>[] {
  if (rect.w <= 0 || rect.h <= 0) return [];
  const valid = items
    .filter((it) => Number.isFinite(it.value) && it.value > 0)
    .sort((a, b) => b.value - a.value);
  if (valid.length === 0) return [];

  const totalValue = valid.reduce((acc, it) => acc + it.value, 0);
  if (totalValue <= 0) return [];

  const totalArea = rect.w * rect.h;
  const scaled = valid.map((it) => ({
    area: (it.value / totalValue) * totalArea,
    data: it.data,
  }));

  const out: TreemapCell<T>[] = [];
  const cur: TreemapRect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };

  function flushRow(row: { area: number; data: T }[], rowSum: number, isLast: boolean) {
    if (row.length === 0) return;

    if (cur.w >= cur.h) {
      // Vertical strip along the left edge (short side = cur.h)
      const stripW = isLast ? cur.w : Math.min(cur.w, cur.h > 0 ? rowSum / cur.h : cur.w);
      let cy = cur.y;
      for (let i = 0; i < row.length; i++) {
        const item = row[i];
        const h =
          i === row.length - 1
            ? Math.max(0, cur.y + cur.h - cy)
            : rowSum > 0
              ? cur.h * (item.area / rowSum)
              : cur.h / row.length;
        out.push({ x: cur.x, y: cy, w: stripW, h, data: item.data });
        cy += h;
      }
      cur.x += stripW;
      cur.w = Math.max(0, cur.w - stripW);
    } else {
      // Horizontal strip along the top edge (short side = cur.w)
      const stripH = isLast ? cur.h : Math.min(cur.h, cur.w > 0 ? rowSum / cur.w : cur.h);
      let cx = cur.x;
      for (let i = 0; i < row.length; i++) {
        const item = row[i];
        const w =
          i === row.length - 1
            ? Math.max(0, cur.x + cur.w - cx)
            : rowSum > 0
              ? cur.w * (item.area / rowSum)
              : cur.w / row.length;
        out.push({ x: cx, y: cur.y, w, h: stripH, data: item.data });
        cx += w;
      }
      cur.y += stripH;
      cur.h = Math.max(0, cur.h - stripH);
    }
  }

  let row: { area: number; data: T }[] = [];
  let rowSum = 0;
  let rowMin = Number.POSITIVE_INFINITY;
  let rowMax = 0;
  let idx = 0;

  while (idx < scaled.length) {
    const next = scaled[idx];
    const side = Math.min(cur.w, cur.h);
    const curWorst = row.length === 0 ? Number.POSITIVE_INFINITY : worstAspect(rowMin, rowMax, rowSum, side);
    const nextSum = rowSum + next.area;
    const nextMin = Math.min(rowMin, next.area);
    const nextMax = Math.max(rowMax, next.area);
    const nextWorst = worstAspect(nextMin, nextMax, nextSum, side);

    if (row.length === 0 || nextWorst <= curWorst) {
      row.push(next);
      rowSum = nextSum;
      rowMin = nextMin;
      rowMax = nextMax;
      idx++;
    } else {
      flushRow(row, rowSum, false);
      row = [];
      rowSum = 0;
      rowMin = Number.POSITIVE_INFINITY;
      rowMax = 0;
    }
  }

  flushRow(row, rowSum, true);
  return out;
}
