import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { run, type RunDeps } from '../src/cli.js';
import { cleanup, makeProject, makeTempDir } from './helpers.js';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  const deps = (extra: Partial<RunDeps> = {}): RunDeps => ({
    log: (m) => out.push(m),
    error: (m) => err.push(m),
    ...extra,
  });
  return { out, err, deps };
}

function sampleProject(): string {
  return makeProject({
    dependencies: { heavy: '1', light: '1', ghost: '1' },
    devDependencies: { toolkit: '1' },
    packages: {
      heavy: { 'index.js': 'x'.repeat(4000), 'extra.js': 'y'.repeat(1000) }, // 5000
      light: { 'index.js': 'z'.repeat(200) }, // 200
      toolkit: { 'index.js': 'd'.repeat(1500) }, // 1500 (dev)
      // `ghost` is declared but never installed
    },
  });
}

describe('run', () => {
  it('prints a colored bar chart and exits 0', async () => {
    const { out, err, deps } = capture();
    const code = await run([], deps({ cwd: sampleProject(), env: {} }));

    expect(code).toBe(0);
    expect(err).toEqual([]);
    const text = out.join('\n');
    expect(text).toContain('dependencies by installed size');
    expect(text).toContain('heavy');
    expect(text).toContain('\x1b['); // colors on by default
  });

  it('respects --no-color and --top', async () => {
    const { out, deps } = capture();
    const code = await run(['--no-color', '--top', '2'], deps({ cwd: sampleProject(), env: {} }));

    expect(code).toBe(0);
    const text = out.join('\n');
    expect(text).toContain('Top 2 of');
    expect(text).not.toContain('\x1b[');
  });

  it('honors the NO_COLOR environment variable', async () => {
    const { out, deps } = capture();
    const code = await run([], deps({ cwd: sampleProject(), env: { NO_COLOR: '1' } }));

    expect(code).toBe(0);
    expect(out.join('\n')).not.toContain('\x1b[');
  });

  it('rejects a non-numeric --top', async () => {
    const { err, deps } = capture();
    const code = await run(['--top', 'abc'], deps({ cwd: sampleProject(), env: {} }));

    expect(code).toBe(1);
    expect(err.join('\n')).toContain('Invalid --top');
  });

  it('rejects a zero or negative --top', async () => {
    const { err, deps } = capture();
    const code = await run(['--top', '0'], deps({ cwd: sampleProject(), env: {} }));

    expect(code).toBe(1);
    expect(err.join('\n')).toContain('Invalid --top');
  });

  it('emits JSON with --json', async () => {
    const { out, deps } = capture();
    const code = await run(['--json'], deps({ cwd: sampleProject(), env: {} }));

    expect(code).toBe(0);
    const parsed = JSON.parse(out.join('\n'));
    expect(parsed.dependencies[0].name).toBe('heavy');
    expect(parsed.totalCount).toBe(3); // heavy, light, ghost — dev excluded
  });

  it('includes devDependencies with --dev', async () => {
    const { out, deps } = capture();
    const code = await run(['--dev', '--json'], deps({ cwd: sampleProject(), env: {} }));

    expect(code).toBe(0);
    const parsed = JSON.parse(out.join('\n'));
    expect(parsed.totalCount).toBe(4);
    expect(parsed.dependencies.map((d: { name: string }) => d.name)).toContain('toolkit');
  });

  it('passes the budget gate when under the limit', async () => {
    const { out, err, deps } = capture();
    const code = await run(['--budget', '1mb', '--no-color'], deps({ cwd: sampleProject(), env: {} }));

    expect(code).toBe(0);
    expect(out.join('\n')).toContain('is within the');
    expect(err).toEqual([]);
  });

  it('fails the budget gate when over the limit', async () => {
    const { err, deps } = capture();
    const code = await run(['--budget', '1kb', '--no-color'], deps({ cwd: sampleProject(), env: {} }));

    expect(code).toBe(1);
    expect(err.join('\n')).toContain('exceeds the');
  });

  it('rejects an unparseable budget', async () => {
    const { err, deps } = capture();
    const code = await run(['--budget', 'lots'], deps({ cwd: sampleProject(), env: {} }));

    expect(code).toBe(1);
    expect(err.join('\n')).toContain('Invalid size');
  });

  it('writes a baseline with --save', async () => {
    const project = sampleProject();
    const baselineFile = join(makeTempDir(), 'base.json');
    const { deps } = capture();
    const code = await run(['--save', baselineFile, '--no-color'], deps({ cwd: project, env: {} }));

    expect(code).toBe(0);
    const saved = JSON.parse(readFileSync(baselineFile, 'utf8'));
    expect(saved.heavy).toBe(5000);
    expect(saved.ghost).toBe(0);
  });

  it('diffs against a baseline with --baseline', async () => {
    const project = sampleProject();
    const baselineFile = join(makeTempDir(), 'base.json');
    writeFileSync(baselineFile, JSON.stringify({ heavy: 4000, light: 200 }));

    const { out, deps } = capture();
    const code = await run(['--baseline', baselineFile, '--no-color'], deps({ cwd: project, env: {} }));

    expect(code).toBe(0);
    const text = out.join('\n');
    expect(text).toContain('+1000 B'); // heavy grew 4000 -> 5000
    expect(text).toContain('new'); // ghost has no baseline entry
  });

  it('errors when the baseline file cannot be read', async () => {
    const project = sampleProject();
    const { err, deps } = capture();
    const code = await run(['--baseline', join(project, 'nope.json')], deps({ cwd: project, env: {} }));

    expect(code).toBe(1);
    expect(err.join('\n')).toContain('Could not read baseline');
  });

  it('errors when the target has no package.json', async () => {
    const { err, deps } = capture();
    const code = await run([makeTempDir(), '--no-color'], deps({ cwd: '/', env: {} }));

    expect(code).toBe(1);
    expect(err.join('\n')).toContain('No package.json');
  });

  it('prints help and exits 0', async () => {
    const { out, deps } = capture();
    const code = await run(['--help'], deps({ env: {} }));

    expect(code).toBe(0);
    expect(out.join('\n')).toContain('Examples:');
  });

  it('reports an unknown option via stderr and a non-zero code', async () => {
    const { err, deps } = capture();
    const code = await run(['--totally-unknown'], deps({ env: {} }));

    expect(code).toBe(1);
    expect(err.join('\n')).toContain('unknown option');
  });

  it('falls back to the real process streams when no deps are injected', async () => {
    const outSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const errSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const helpCode = await run(['--help']);
    const missingCode = await run([makeTempDir()]);

    expect(helpCode).toBe(0);
    expect(missingCode).toBe(1);
    expect(outSpy).toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalled();
  });
});
