/** One declared dependency and the number of bytes it occupies on disk. */
export interface DepSize {
  /** The package name exactly as it appears in `package.json`. */
  name: string;
  /** Total bytes of the package's own files (install symlink resolved). */
  bytes: number;
  /** `false` when the package is declared but missing from `node_modules`. */
  installed: boolean;
}

/** A saved snapshot: dependency name → measured bytes. */
export type Baseline = Record<string, number>;

/** One row of a rendered report. */
export interface DepRow {
  name: string;
  bytes: number;
  installed: boolean;
  /** Byte change vs. the baseline, or `null` when there is nothing to compare. */
  delta: number | null;
}

/** A full report: the top rows plus totals across every measured dependency. */
export interface Report {
  /** The heaviest dependencies, already sorted and sliced to the requested count. */
  rows: DepRow[];
  /** How many rows are shown (`rows.length`). */
  shown: number;
  /** How many dependencies were measured in total. */
  totalCount: number;
  /** Summed bytes across every dependency, not just the shown rows. */
  total: number;
  /** The absolute project directory that was scanned. */
  root: string;
}
