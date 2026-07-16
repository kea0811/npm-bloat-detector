import { afterEach, describe, expect, it } from 'vitest';
import { analyze, readDependencyNames } from '../src/analyze.js';
import { cleanup, makeProject, makeTempDir } from './helpers.js';

afterEach(cleanup);

describe('readDependencyNames', () => {
  it('reads dependencies only by default, sorted and de-duplicated', () => {
    const names = readDependencyNames(
      { dependencies: { b: '1', a: '1' }, devDependencies: { z: '1' } },
      false,
    );
    expect(names).toEqual(['a', 'b']);
  });

  it('includes and de-duplicates devDependencies when asked', () => {
    const names = readDependencyNames(
      { dependencies: { a: '1' }, devDependencies: { a: '1', d: '1' } },
      true,
    );
    expect(names).toEqual(['a', 'd']);
  });

  it('tolerates a manifest with no dependency fields', () => {
    expect(readDependencyNames({}, true)).toEqual([]);
  });
});

describe('analyze', () => {
  it('throws when there is no package.json', () => {
    const dir = makeTempDir();
    expect(() => analyze({ cwd: dir, includeDev: false })).toThrow(/No package\.json/);
  });

  it('measures installed deps and flags missing ones', () => {
    const dir = makeProject({
      dependencies: { big: '1', gone: '1' },
      packages: { big: { 'index.js': 'x'.repeat(300) } },
    });

    expect(analyze({ cwd: dir, includeDev: false })).toEqual([
      { name: 'big', bytes: 300, installed: true },
      { name: 'gone', bytes: 0, installed: false },
    ]);
  });

  it('includes devDependencies when requested', () => {
    const dir = makeProject({
      dependencies: { a: '1' },
      devDependencies: { tool: '1' },
      packages: {
        a: { 'i.js': 'a'.repeat(10) },
        tool: { 'i.js': 'b'.repeat(20) },
      },
    });

    expect(analyze({ cwd: dir, includeDev: true }).map((d) => d.name)).toEqual(['a', 'tool']);
  });
});
