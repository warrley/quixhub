import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { squarify } from './treemap';

describe('squarify', () => {
  it('returns empty for empty inputs, non-positive values, or degenerate bounds', () => {
    assert.deepEqual(squarify([], { x: 0, y: 0, w: 100, h: 100 }), []);
    assert.deepEqual(
      squarify(
        [
          { value: 0, data: 'a' },
          { value: -5, data: 'b' },
          { value: Number.NaN, data: 'c' },
        ],
        { x: 0, y: 0, w: 100, h: 100 },
      ),
      [],
    );
    assert.deepEqual(squarify([{ value: 10, data: 'a' }], { x: 0, y: 0, w: 0, h: 100 }), []);
  });

  it('fills the entire bounds for a single item', () => {
    const cells = squarify([{ value: 42, data: 'only' }], { x: 0, y: 0, w: 100, h: 100 });
    assert.equal(cells.length, 1);
    assert.deepEqual(cells[0], { x: 0, y: 0, w: 100, h: 100, data: 'only' });
  });

  it('conserves exact area, stays inside bounds, never overlaps, and yields healthy aspect ratios across 8 unequal semesters', () => {
    const semesters = [
      { id: '2023.1', v: 6.5 },
      { id: '2023.2', v: 7.2 },
      { id: '2024.1', v: 11.4 },
      { id: '2024.2', v: 15.8 },
      { id: '2025.1', v: 24.5 },
      { id: '2025.2', v: 31.0 },
      { id: '2026.1', v: 19.2 },
      { id: '2026.2', v: 9.8 },
    ];
    const bounds = { x: 0, y: 0, w: 100, h: 100 };
    const cells = squarify(
      semesters.map((s) => ({ value: s.v, data: s.id })),
      bounds,
    );

    assert.equal(cells.length, semesters.length);

    let areaSum = 0;
    for (const c of cells) {
      assert.ok(c.w > 0 && c.h > 0, `expected positive cell dims for ${c.data}`);
      assert.ok(c.x >= -1e-6 && c.y >= -1e-6, `out of bounds min for ${c.data}`);
      assert.ok(c.x + c.w <= 100 + 1e-6 && c.y + c.h <= 100 + 1e-6, `out of bounds max for ${c.data}`);
      const ratio = Math.max(c.w / c.h, c.h / c.w);
      assert.ok(ratio < 3.5, `aspect ratio too stretched (${ratio.toFixed(2)}) for ${c.data}`);
      areaSum += c.w * c.h;
    }
    assert.ok(Math.abs(areaSum - 10000) < 1e-5, `area mismatch: ${areaSum}`);

    // Verify pairwise non-overlap
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i];
        const b = cells[j];
        const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        assert.ok(overlapX <= 1e-6 || overlapY <= 1e-6, `overlap between ${a.data} and ${b.data}`);
      }
    }
  });
});
