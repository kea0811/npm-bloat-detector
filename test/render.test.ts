import { describe, expect, it } from 'vitest';
import { createColors } from '../src/color.js';
import { renderReport } from '../src/render.js';
import type { Report } from '../src/types.js';

const plain = createColors(false);

function report(partial: Pick<Report, 'rows'> & Partial<Report>): Report {
  return {
    shown: partial.rows.length,
    totalCount: partial.totalCount ?? partial.rows.length,
    total: partial.total ?? 0,
    root: partial.root ?? '/proj',
    rows: partial.rows,
  };
}

describe('renderReport (table)', () => {
  it('draws a bar chart scaled to the largest dependency', () => {
    const out = renderReport(
      report({
        rows: [
          { name: 'big', bytes: 1000, installed: true, delta: null },
          { name: 'small', bytes: 100, installed: true, delta: null },
        ],
        totalCount: 2,
        total: 1100,
      }),
      { colors: plain, json: false, baseline: false },
    );

    expect(out).toContain('Top 2 of 2 dependencies by installed size');
    expect(out).toContain('big');
    expect(out).toContain('█'); // at least one filled cell
    expect(out).toContain('Total: 1.1 KB across 2 deps');
  });

  it('flags not-installed deps and renders every delta state', () => {
    const out = renderReport(
      report({
        rows: [
          { name: 'grew', bytes: 300, installed: true, delta: 100 },
          { name: 'shrank', bytes: 100, installed: true, delta: -50 },
          { name: 'same', bytes: 100, installed: true, delta: 0 },
          { name: 'fresh', bytes: 80, installed: true, delta: null },
          { name: 'missing', bytes: 0, installed: false, delta: null },
        ],
        totalCount: 5,
        total: 580,
      }),
      { colors: plain, json: false, baseline: true },
    );

    expect(out).toContain('(not installed)');
    expect(out).toContain('+100 B');
    expect(out).toContain('-50 B');
    expect(out).toContain('0 B');
    expect(out).toContain('new');
  });

  it('renders empty bars when every dependency measures zero', () => {
    const out = renderReport(
      report({
        rows: [{ name: 'ghost', bytes: 0, installed: false, delta: null }],
        totalCount: 1,
        total: 0,
      }),
      { colors: plain, json: false, baseline: false },
    );

    expect(out).toContain('ghost');
    expect(out).toContain('░'); // all-empty bar
    expect(out).not.toContain('█');
  });

  it('handles an empty project without dividing by zero', () => {
    const out = renderReport(report({ rows: [], totalCount: 0, total: 0 }), {
      colors: plain,
      json: false,
      baseline: false,
    });

    expect(out).toContain('No dependencies found.');
    expect(out).toContain('Total: 0 B across 0 deps');
  });

  it('paints deltas with color when a palette is enabled', () => {
    const out = renderReport(
      report({
        rows: [{ name: 'grew', bytes: 200, installed: false, delta: 40 }],
        totalCount: 1,
        total: 200,
      }),
      { colors: createColors(true), json: false, baseline: true },
    );

    expect(out).toContain('\x1b[31m'); // red for a dependency that grew
  });
});

describe('renderReport (json)', () => {
  it('emits structured JSON', () => {
    const out = renderReport(
      report({
        rows: [{ name: 'a', bytes: 10, installed: true, delta: 2 }],
        totalCount: 1,
        total: 10,
        root: '/here',
      }),
      { colors: plain, json: true, baseline: true },
    );

    expect(JSON.parse(out)).toEqual({
      root: '/here',
      total: 10,
      totalCount: 1,
      dependencies: [{ name: 'a', bytes: 10, installed: true, delta: 2 }],
    });
  });
});
