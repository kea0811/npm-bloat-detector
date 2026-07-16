import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

const created: string[] = [];

export interface ProjectSpec {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  /** package name → { relative file path → file contents }. Byte length is what matters. */
  packages?: Record<string, Record<string, string>>;
}

/** Create a throwaway temp directory that {@link cleanup} will remove. */
export function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'nbd-'));
  created.push(dir);
  return dir;
}

/** Write a package's files under `pkgDir`, creating folders as needed. */
export function writePackage(pkgDir: string, files: Record<string, string>): void {
  mkdirSync(pkgDir, { recursive: true });
  for (const [rel, content] of Object.entries(files)) {
    const filePath = join(pkgDir, rel);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, content);
  }
}

/**
 * Build a temp project directory with a `package.json` and (optionally) an
 * installed `node_modules` tree. Returns the project root.
 */
export function makeProject(spec: ProjectSpec = {}): string {
  const dir = makeTempDir();
  const manifest: Record<string, unknown> = {};
  if (spec.dependencies) manifest.dependencies = spec.dependencies;
  if (spec.devDependencies) manifest.devDependencies = spec.devDependencies;
  writeFileSync(join(dir, 'package.json'), JSON.stringify(manifest, null, 2));

  for (const [pkg, files] of Object.entries(spec.packages ?? {})) {
    writePackage(join(dir, 'node_modules', pkg), files);
  }
  return dir;
}

/** Remove every temp directory created since the last cleanup. */
export function cleanup(): void {
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
}
