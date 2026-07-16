import { describe, expect, it } from 'vitest';
import { buildReport } from '../src/report.js';
import type { DepSize } from '../src/types.js';

const deps: DepSize[] = [
  { name: 'small', bytes: 100, installed: true },
  { name: 'huge', bytes: 900, installed: true },
  { name: 'mid', bytes: 500, installed: true },
];

describe('buildReport', () => {
  it('sorts heaviest-first and slices to the top n', () => {
    const report = buildReport(deps, { top: 2, root: '/proj' });

    expect(report.rows.map((r) => r.name)).toEqual(['huge', 'mid']);
    expect(report.shown).toBe(2);
    expect(report.totalCount).toBe(3);
    expect(report.total).toBe(1500);
    expect(report.root).toBe('/proj');
    expect(report.rows[0].delta).toBeNull();
  });

  it('breaks size ties alphabetically', () => {
    const tied: DepSize[] = [
      { name: 'beta', bytes: 200, installed: true },
      { name: 'alpha', bytes: 200, installed: true },
    ];

    expect(buildReport(tied, { top: 5, root: '/p' }).rows.map((r) => r.name)).toEqual([
      'alpha',
      'beta',
    ]);
  });

  it('computes deltas against a baseline, marking new deps as null', () => {
    const report = buildReport(deps, {
      top: 3,
      root: '/p',
      baseline: { huge: 800, mid: 500 }, // huge grew, mid unchanged, small is new
    });

    const byName = Object.fromEntries(report.rows.map((r) => [r.name, r.delta]));
    expect(byName).toEqual({ huge: 100, mid: 0, small: null });
  });
});
