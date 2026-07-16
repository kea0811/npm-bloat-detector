import { describe, expect, it } from 'vitest';
import { formatBytes, formatDelta, parseSize } from '../src/format.js';

describe('formatBytes', () => {
  it('renders sub-byte values as 0 B', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(0.4)).toBe('0 B');
  });

  it('renders whole bytes without decimals', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('renders larger units with one decimal', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
  });

  it('caps at the largest known unit', () => {
    expect(formatBytes(1024 ** 5)).toBe('1024.0 TB');
  });
});

describe('formatDelta', () => {
  it('shows zero as 0 B', () => {
    expect(formatDelta(0)).toBe('0 B');
  });

  it('prefixes growth with +', () => {
    expect(formatDelta(2048)).toBe('+2.0 KB');
  });

  it('prefixes shrinkage with -', () => {
    expect(formatDelta(-512)).toBe('-512 B');
  });
});

describe('parseSize', () => {
  it('parses a unit-qualified size', () => {
    expect(parseSize('5mb')).toBe(5 * 1024 * 1024);
    expect(parseSize('1.5gb')).toBe(Math.round(1.5 * 1024 ** 3));
    expect(parseSize('10 KB')).toBe(10 * 1024);
  });

  it('treats a bare number as bytes', () => {
    expect(parseSize('2048')).toBe(2048);
  });

  it('throws on nonsense', () => {
    expect(() => parseSize('banana')).toThrow(/Invalid size/);
  });
});
