import { describe, expect, it } from 'vitest';
import { createColors } from '../src/color.js';

describe('createColors', () => {
  it('wraps text in ANSI codes when enabled', () => {
    const colors = createColors(true);
    expect(colors.green('ok')).toBe('\x1b[32mok\x1b[39m');
    expect(colors.red('no')).toBe('\x1b[31mno\x1b[39m');
    expect(colors.dim('x')).toBe('\x1b[2mx\x1b[22m');
    expect(colors.cyan('c')).toBe('\x1b[36mc\x1b[39m');
    expect(colors.bold('b')).toBe('\x1b[1mb\x1b[22m');
  });

  it('returns the input untouched when disabled', () => {
    const colors = createColors(false);
    expect(colors.green('ok')).toBe('ok');
    expect(colors.red('no')).toBe('no');
    expect(colors.dim('x')).toBe('x');
    expect(colors.cyan('c')).toBe('c');
    expect(colors.bold('b')).toBe('b');
  });
});
