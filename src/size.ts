import { readdirSync, realpathSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Sum the size in bytes of every real file under `dir`, recursively.
 *
 * Symlinks are skipped on purpose: pnpm links each installed package into a
 * central store, and following those links would either double-count shared
 * files or spin forever on a cycle. Measuring only real files gives a stable,
 * honest "bytes this package contributes" number.
 */
export function directorySize(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      total += directorySize(full);
    } else if (entry.isFile()) {
      total += statSync(full).size;
    }
    // Anything else (a symlink) is deliberately ignored.
  }
  return total;
}

/**
 * Measure an installed package directory. Both npm and pnpm expose the
 * top-level entry as a symlink into their store, so we resolve it first and
 * then walk the real files it points at.
 */
export function packageSize(pkgDir: string): number {
  return directorySize(realpathSync(pkgDir));
}
