import type { Baseline, DepRow, DepSize, Report } from './types.js';

/** Extra context needed to turn raw measurements into a report. */
export interface BuildReportOptions {
  /** How many of the heaviest dependencies to include as rows. */
  top: number;
  /** Absolute project directory that was scanned. */
  root: string;
  /** Previous sizes to diff against; omit for a first run. */
  baseline?: Baseline;
}

/**
 * Sort dependencies heaviest-first, keep the top `n`, and attach a baseline
 * delta to each kept row. Ties break alphabetically so the order is stable.
 */
export function buildReport(deps: DepSize[], options: BuildReportOptions): Report {
  const sorted = [...deps].sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name));
  const total = sorted.reduce((sum, dep) => sum + dep.bytes, 0);

  const rows: DepRow[] = sorted.slice(0, options.top).map((dep) => {
    const previous = options.baseline?.[dep.name];
    return {
      name: dep.name,
      bytes: dep.bytes,
      installed: dep.installed,
      delta: previous === undefined ? null : dep.bytes - previous,
    };
  });

  return {
    rows,
    shown: rows.length,
    totalCount: sorted.length,
    total,
    root: options.root,
  };
}
