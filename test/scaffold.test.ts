import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from '../src/index.js';

describe('scaffold', () => {
  it('exposes the package name', () => {
    expect(PACKAGE_NAME).toBe('npm-bloat-detector');
  });
});
