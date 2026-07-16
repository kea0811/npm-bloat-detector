import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { packageSize } from './size.js';
import type { DepSize } from './types.js';

/** What `analyze` needs to know: where to look, and whether to include devDeps. */
export interface AnalyzeOptions {
  /** Absolute path to the project directory (the one holding `package.json`). */
  cwd: string;
  /** Include `devDependencies` alongside `dependencies`. */
  includeDev: boolean;
}

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Collect the dependency names declared in a manifest. Reads `dependencies`
 * plus, when `includeDev` is set, `devDependencies`. The result is de-duplicated
 * and sorted so output is deterministic.
 */
export function readDependencyNames(manifest: PackageManifest, includeDev: boolean): string[] {
  const names = new Set(Object.keys(manifest.dependencies ?? {}));
  if (includeDev) {
    for (const name of Object.keys(manifest.devDependencies ?? {})) {
      names.add(name);
    }
  }
  return [...names].sort();
}

/**
 * Measure the installed size of every declared dependency in a project.
 * Throws if there is no `package.json` in {@link AnalyzeOptions.cwd}.
 */
export function analyze(options: AnalyzeOptions): DepSize[] {
  const manifestPath = join(options.cwd, 'package.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`No package.json found in ${options.cwd}`);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as PackageManifest;
  const names = readDependencyNames(manifest, options.includeDev);
  const nodeModules = join(options.cwd, 'node_modules');

  return names.map((name) => {
    const dir = join(nodeModules, name);
    if (!existsSync(dir)) {
      return { name, bytes: 0, installed: false };
    }
    return { name, bytes: packageSize(dir), installed: true };
  });
}
