import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn', () => {
  it('merges classes correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes (falsy values)', () => {
    expect(cn('foo', false, 'bar')).toBe('foo bar');
  });

  it('resolves Tailwind conflicts', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('');
  });
});
