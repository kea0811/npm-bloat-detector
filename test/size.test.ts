import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { directorySize, packageSize } from '../src/size.js';
import { cleanup, makeTempDir } from './helpers.js';

afterEach(cleanup);

describe('directorySize', () => {
  it('sums files recursively and ignores symlinks', () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, 'a.txt'), 'x'.repeat(100)); // 100 bytes
    mkdirSync(join(dir, 'sub'));
    writeFileSync(join(dir, 'sub', 'b.txt'), 'y'.repeat(50)); // 50 bytes
    symlinkSync(join(dir, 'a.txt'), join(dir, 'link.txt')); // deliberately ignored

    expect(directorySize(dir)).toBe(150);
  });
});

describe('packageSize', () => {
  it('resolves the install symlink before measuring', () => {
    const store = makeTempDir();
    writeFileSync(join(store, 'index.js'), 'z'.repeat(200));

    const project = makeTempDir();
    const link = join(project, 'pkg');
    symlinkSync(store, link); // pnpm-style symlinked package entry

    expect(packageSize(link)).toBe(200);
  });
});
